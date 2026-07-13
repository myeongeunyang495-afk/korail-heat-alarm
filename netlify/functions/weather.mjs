const KMA_BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const REGIONS = [
  { name: "서울", label: "서울", map: "서울", nx: 60, ny: 127, primary: true },
  { name: "수원", label: "경기(수원)", map: "경기", nx: 60, ny: 121, primary: true },
  { name: "대전", label: "대전", map: "대전", nx: 67, ny: 100, primary: true },
  { name: "광주", label: "광주", map: "광주", nx: 58, ny: 74, primary: true },
  { name: "대구", label: "대구", map: "대구", nx: 89, ny: 90, primary: true },
  { name: "부산", label: "부산", map: "부산", nx: 98, ny: 76, primary: true },
  { name: "제주", label: "제주", map: "제주", nx: 52, ny: 38, primary: true },
  { name: "인천", label: "인천", map: "인천", nx: 55, ny: 124 },
  { name: "춘천", label: "강원(영서)", map: "강원(영서)", nx: 73, ny: 134 },
  { name: "강릉", label: "강원(영동)", map: "강원(영동)", nx: 92, ny: 131 },
  { name: "천안", label: "충남", map: "충남", nx: 63, ny: 110 },
  { name: "세종", label: "세종", map: "세종", nx: 66, ny: 103 },
  { name: "청주", label: "충북", map: "충북", nx: 69, ny: 106 },
  { name: "안동", label: "경북", map: "경북", nx: 91, ny: 106 },
  { name: "울산", label: "울산", map: "울산", nx: 102, ny: 84 },
  { name: "창원", label: "경남", map: "경남", nx: 90, ny: 77 },
  { name: "전주", label: "전북", map: "전북", nx: 63, ny: 89 },
  { name: "목포", label: "전남", map: "전남", nx: 50, ny: 67 }
];

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

function heatLevel(maxApparent) {
  if (maxApparent >= 35) return "warning";
  if (maxApparent >= 33) return "advisory";
  return "none";
}

async function kmaRequest(endpoint, params) {
  const serviceKey = process.env.KMA_SERVICE_KEY;
  if (!serviceKey) throw new Error("Netlify 환경변수 KMA_SERVICE_KEY가 없습니다.");

  const url = new URL(`${KMA_BASE_URL}/${endpoint}`);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("dataType", "JSON");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`기상청 API HTTP ${response.status}`);

  const payload = await response.json();
  const header = payload?.response?.header;
  if (header?.resultCode !== "00") throw new Error(`기상청 API 오류 ${header?.resultCode}: ${header?.resultMsg}`);

  const items = payload?.response?.body?.items?.item;
  if (!items) throw new Error(`${endpoint} 응답에 관측/예보 항목이 없습니다.`);
  return Array.isArray(items) ? items : [items];
}

async function fetchCurrent(region, now) {
  const base = ultraCurrentBase(now);
  const items = await kmaRequest("getUltraSrtNcst", {
    base_date: ymd(base),
    base_time: hm(base),
    nx: region.nx,
    ny: region.ny
  });

  const values = Object.fromEntries(
    items.filter((item) => ["T1H", "REH"].includes(item.category)).map((item) => [item.category, Number(item.obsrValue)])
  );
  if (!Number.isFinite(values.T1H) || !Number.isFinite(values.REH)) {
    throw new Error(`${region.name} 초단기실황에 T1H/REH가 없습니다.`);
  }

  return {
    source: "초단기실황",
    date: ymd(base),
    time: `${hm(base).slice(0, 2)}:${hm(base).slice(2)}`,
    temperatureC: values.T1H,
    humidityPct: values.REH,
    apparentC: apparentTemperatureC(values.T1H, values.REH)
  };
}

async function fetchForecast(region, now) {
  const base = vilageForecastBase(now);
  const today = ymd(now);
  const items = await kmaRequest("getVilageFcst", {
    base_date: ymd(base),
    base_time: hm(base),
    nx: region.nx,
    ny: region.ny
  });

  const grouped = new Map();
  for (const item of items) {
    if (item.fcstDate !== today || !["TMP", "REH"].includes(item.category)) continue;
    if (!grouped.has(item.fcstTime)) grouped.set(item.fcstTime, {});
    grouped.get(item.fcstTime)[item.category] = Number(item.fcstValue);
  }

  const points = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([, values]) => Number.isFinite(values.TMP) && Number.isFinite(values.REH))
    .map(([time, values]) => ({
      source: "단기예보",
      date: today,
      time: `${time.slice(0, 2)}:${time.slice(2)}`,
      temperatureC: values.TMP,
      humidityPct: values.REH,
      apparentC: apparentTemperatureC(values.TMP, values.REH)
    }));

  if (!points.length) throw new Error(`${region.name} 오늘 단기예보에 TMP/REH가 없습니다.`);
  return points;
}

function heatWindow(forecast) {
  const over = forecast.filter((point) => point.apparentC >= 31);
  const maxApparent = Math.max(...forecast.map((point) => point.apparentC));
  if (!over.length) return { from: null, to: null, maxApparent };
  return { from: over[0].time, to: over[over.length - 1].time, maxApparent };
}

async function buildPayload() {
  const now = kstNow();
  const regions = [];

  for (const region of REGIONS) {
    const [current, forecast] = await Promise.all([fetchCurrent(region, now), fetchForecast(region, now)]);
    const window = heatWindow(forecast);
    regions.push({ ...region, current, forecast, ...window, level: heatLevel(window.maxApparent) });
  }

  const map = Object.fromEntries(REGIONS.map((region) => [region.map, "none"]));
  for (const region of regions) {
    map[region.map] = region.level;
  }

  return {
    generatedAt: now.toISOString(),
    generatedAtText: `${displayDate(now)} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    titleDate: displayDate(now),
    issuedAt: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    source: "기상청 단기예보 조회서비스 getUltraSrtNcst + getVilageFcst",
    formula: "기온·상대습도 기반 습구온도 추정 후 여름철 체감온도 계산",
    primaryRegions: regions.filter((region) => region.primary),
    regions,
    map
  };
}

export async function handler() {
  try {
    const payload = await buildPayload();
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      },
      body: JSON.stringify(payload)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      body: JSON.stringify({ error: error.message })
    };
  }
}
