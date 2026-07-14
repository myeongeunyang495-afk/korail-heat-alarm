const KMA_BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const AREA_GROUPS = [
  {
    id: "seoul",
    label: "서울",
    areas: [
      ["seoul_yeongdeungpo", "서울(영등포)", 37.5264, 126.8963],
      ["seoul_jung", "서울(중구)", 37.5636, 126.9976],
      ["seoul_jongno", "서울(종로)", 37.5735, 126.9788],
      ["seoul_gangnam", "서울(강남)", 37.5172, 127.0473],
      ["seoul_gangseo", "서울(강서)", 37.5509, 126.8495],
      ["seoul_guro", "서울(구로)", 37.4955, 126.8877],
      ["seoul_geumcheon", "서울(금천)", 37.4569, 126.8955],
      ["seoul_dongjak", "서울(동작)", 37.5124, 126.9393],
      ["seoul_mapo", "서울(마포)", 37.5663, 126.9016],
      ["seoul_seocho", "서울(서초)", 37.4837, 127.0324],
      ["seoul_songpa", "서울(송파)", 37.5145, 127.1059],
      ["seoul_yongsan", "서울(용산)", 37.5326, 126.9905]
    ]
  },
  {
    id: "gyeonggi",
    label: "경기",
    areas: [
      ["suwon", "경기(수원)", 37.2636, 127.0286],
      ["seongnam", "경기(성남)", 37.4200, 127.1265],
      ["anyang", "경기(안양)", 37.3943, 126.9568],
      ["bucheon", "경기(부천)", 37.5036, 126.7660],
      ["gwangmyeong", "경기(광명)", 37.4786, 126.8647],
      ["ansan", "경기(안산)", 37.3219, 126.8309],
      ["goyang", "경기(고양)", 37.6584, 126.8320],
      ["yongin", "경기(용인)", 37.2411, 127.1776],
      ["hwaseong", "경기(화성)", 37.1995, 126.8312],
      ["pyeongtaek", "경기(평택)", 36.9921, 127.1128]
    ]
  },
  {
    id: "incheon",
    label: "인천",
    areas: [
      ["incheon_jung", "인천(중구)", 37.4738, 126.6216],
      ["incheon_michuhol", "인천(미추홀)", 37.4636, 126.6500],
      ["incheon_yeonsu", "인천(연수)", 37.4102, 126.6783],
      ["incheon_namdong", "인천(남동)", 37.4473, 126.7315],
      ["incheon_bupyeong", "인천(부평)", 37.5070, 126.7219],
      ["incheon_gyeyang", "인천(계양)", 37.5374, 126.7378],
      ["incheon_seo", "인천(서구)", 37.5454, 126.6768],
      ["incheon_ganghwa", "인천(강화)", 37.7465, 126.4878]
    ]
  }
];

const AREA_MAP = new Map(AREA_GROUPS.flatMap((group) => group.areas.map(([id, label, lat, lon]) => [id, { id, label, lat, lon, group: group.label }])));
const DEFAULT_AREA_IDS = ["suwon", "seoul_yeongdeungpo", "incheon_jung"];

function dfsGrid(lat, lon) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;
  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  return { nx: Math.floor(ra * Math.sin(theta) + XO + 0.5), ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5) };
}

function kstNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

function ymd(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function hm(date) {
  return `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
}

function displayDate(date) {
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. (${WEEKDAYS[date.getDay()]})`;
}

function forecastDateTime(fcstDate, fcstTime) {
  return new Date(Number(fcstDate.slice(0, 4)), Number(fcstDate.slice(4, 6)) - 1, Number(fcstDate.slice(6, 8)), Number(fcstTime.slice(0, 2)), Number(fcstTime.slice(2, 4)), 0, 0);
}

function ultraCurrentBase(now) {
  const base = new Date(now);
  base.setMinutes(0, 0, 0);
  if (now.getMinutes() < 40) base.setHours(base.getHours() - 1);
  return base;
}

function vilageForecastBase(now) {
  const slots = [2, 5, 8, 11, 14, 17, 20, 23];
  const available = new Date(now.getTime() - 20 * 60 * 1000);
  for (let i = slots.length - 1; i >= 0; i -= 1) {
    const candidate = new Date(available);
    candidate.setHours(slots[i], 0, 0, 0);
    if (candidate <= available) return candidate;
  }
  const yesterday = new Date(available);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 0, 0, 0);
  return yesterday;
}

function wetBulbTemperatureC(temperatureC, humidityPct) {
  const rh = Math.min(100, Math.max(1, humidityPct));
  const t = temperatureC;
  return t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659))
    + Math.atan(t + rh)
    - Math.atan(rh - 1.676331)
    + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh)
    - 4.686035;
}

function apparentTemperatureC(temperatureC, humidityPct) {
  const tw = wetBulbTemperatureC(temperatureC, humidityPct);
  const value = -0.2442 + 0.55399 * tw + 0.45535 * temperatureC - 0.0022 * tw * tw + 0.00278 * tw * temperatureC + 3.0;
  return Math.round(value * 10) / 10;
}

function serviceKey() {
  const key = process.env.KMA_SERVICE_KEY || process.env.KMA_API_KEY || "";
  if (!key.trim()) throw new Error("Netlify 환경변수 KMA_SERVICE_KEY가 없습니다.");
  return key.trim();
}

async function kmaRequest(endpoint, params) {
  const url = new URL(`${KMA_BASE_URL}/${endpoint}`);
  url.searchParams.set("serviceKey", serviceKey());
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("dataType", "JSON");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let response;
  try {
    response = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text();
  if (!response.ok) throw new Error(`기상청 API HTTP ${response.status}: ${text.slice(0, 160)}`);
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`기상청 API가 JSON이 아닌 응답을 반환했습니다: ${text.slice(0, 160)}`);
  }
  const header = payload?.response?.header;
  if (header?.resultCode !== "00") throw new Error(`기상청 API 오류 ${header?.resultCode}: ${header?.resultMsg}`);
  const items = payload?.response?.body?.items?.item;
  if (!items) throw new Error(`${endpoint} 응답에 관측/예보 항목이 없습니다.`);
  return Array.isArray(items) ? items : [items];
}

async function fetchCurrent(area, now) {
  const base = ultraCurrentBase(now);
  const { nx, ny } = dfsGrid(area.lat, area.lon);
  const items = await kmaRequest("getUltraSrtNcst", { base_date: ymd(base), base_time: hm(base), nx, ny });
  const byCategory = Object.fromEntries(items.map((item) => [item.category, Number(item.obsrValue)]));
  if (!Number.isFinite(byCategory.T1H) || !Number.isFinite(byCategory.REH)) throw new Error(`${area.label} 현재 실황 T1H/REH가 없습니다.`);
  return { source: "초단기실황", date: ymd(base), time: `${hm(base).slice(0, 2)}:${hm(base).slice(2)}`, temperatureC: byCategory.T1H, humidityPct: byCategory.REH, apparentC: apparentTemperatureC(byCategory.T1H, byCategory.REH) };
}

async function fetchForecast(area, now) {
  const base = vilageForecastBase(now);
  const end = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const { nx, ny } = dfsGrid(area.lat, area.lon);
  const items = await kmaRequest("getVilageFcst", { base_date: ymd(base), base_time: hm(base), nx, ny });
  const grouped = new Map();
  for (const item of items) {
    if (!["TMP", "REH"].includes(item.category)) continue;
    const pointDate = forecastDateTime(item.fcstDate, item.fcstTime);
    if (pointDate < now || pointDate > end) continue;
    const key = `${item.fcstDate}${item.fcstTime}`;
    if (!grouped.has(key)) grouped.set(key, { date: item.fcstDate, time: item.fcstTime, pointDate });
    grouped.get(key)[item.category] = Number(item.fcstValue);
  }
  const points = [...grouped.values()]
    .sort((a, b) => a.pointDate - b.pointDate)
    .filter((values) => Number.isFinite(values.TMP) && Number.isFinite(values.REH))
    .map((values) => ({ source: "단기예보", date: values.date, time: `${values.time.slice(0, 2)}:${values.time.slice(2)}`, temperatureC: values.TMP, humidityPct: values.REH, apparentC: apparentTemperatureC(values.TMP, values.REH) }));
  if (!points.length) throw new Error(`${area.label} 현재 시각부터 12시간 내 단기예보 TMP/REH가 없습니다.`);
  return points;
}

function forecastWindow(current, forecast) {
  const range = [current, ...forecast];
  const over = range.filter((point) => point.apparentC >= 31);
  const maxPoint = range.reduce((best, point) => point.apparentC > best.apparentC ? point : best, range[0]);
  if (!over.length) return { from: null, to: null, maxApparent: maxPoint.apparentC, maxTime: maxPoint.time };
  return { from: over[0].time, to: over[over.length - 1].time, maxApparent: maxPoint.apparentC, maxTime: maxPoint.time };
}

async function buildArea(area, now) {
  const grid = dfsGrid(area.lat, area.lon);
  const [current, forecast] = await Promise.all([fetchCurrent(area, now), fetchForecast(area, now)]);
  return { ...area, ...grid, current, forecast, ...forecastWindow(current, forecast) };
}

function selectedAreas(url) {
  const raw = url.searchParams.get("areas") || DEFAULT_AREA_IDS.join(",");
  return raw.split(",").map((id) => AREA_MAP.get(id.trim())).filter(Boolean).slice(0, 6);
}

async function buildPayload(event) {
  const now = kstNow();
  const url = new URL(event.rawUrl || "http://localhost/.netlify/functions/weather");
  const areas = selectedAreas(url);
  const regions = await Promise.all(areas.map((area) => buildArea(area, now)));
  return {
    generatedAt: now.toISOString(),
    generatedAtText: `${displayDate(now)} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    source: "기상청 현재 실황 및 단기예보 기반",
    rangeText: "현 시각부터 12시간",
    areaGroups: AREA_GROUPS.map((group) => ({ id: group.id, label: group.label, areas: group.areas.map(([id, label]) => ({ id, label })) })),
    regions,
    primaryRegions: regions
  };
}

export async function handler(event) {
  try {
    const payload = await buildPayload(event);
    return { statusCode: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, body: JSON.stringify(payload) };
  } catch (error) {
    return { statusCode: 500, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, body: JSON.stringify({ error: error?.message || String(error) }) };
  }
}
