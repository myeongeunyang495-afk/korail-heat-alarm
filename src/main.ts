import "./styles/poster.css";

type WeatherPoint = {
  time: string;
  temperatureC: number;
  humidityPct: number;
  apparentC: number;
};

type AreaOption = { id: string; label: string };
type AreaGroup = { id: string; label: string; areas: AreaOption[] };

type RegionWeather = {
  id: string;
  name: string;
  label: string;
  group: string;
  nx: number;
  ny: number;
  current: WeatherPoint;
  forecast: WeatherPoint[];
  from: string | null;
  to: string | null;
  maxApparent: number;
};

type WeatherPayload = {
  generatedAt: string;
  generatedAtText: string;
  source: string;
  areaGroups: AreaGroup[];
  regions: RegionWeather[];
};

const DEFAULT_AREAS = ["suwon", "seoul_yeongdeungpo", "incheon_jung"];
const MOCK_GROUPS: AreaGroup[] = [
  { id: "gyeonggi", label: "경기", areas: [{ id: "suwon", label: "경기(수원)" }, { id: "seongnam", label: "경기(성남)" }] },
  { id: "seoul", label: "서울", areas: [{ id: "seoul_yeongdeungpo", label: "서울(영등포)" }, { id: "seoul_jung", label: "서울(중구)" }] },
  { id: "incheon", label: "인천", areas: [{ id: "incheon_jung", label: "인천(중구)" }, { id: "incheon_bupyeong", label: "인천(부평)" }] }
];

const MOCK_DATA: WeatherPayload = {
  generatedAt: new Date().toISOString(),
  generatedAtText: "2026. 7. 14. (화) 10:57",
  source: "미리보기 샘플 데이터",
  areaGroups: MOCK_GROUPS,
  regions: [
    makeMockRegion("suwon", "경기(수원)", "경기", 31.0, 27.9, 72, 32.1, "09:00", "13:00"),
    makeMockRegion("seoul_yeongdeungpo", "서울(영등포)", "서울", 30.9, 28.1, 69, 31.7, "09:00", "14:00"),
    makeMockRegion("incheon_jung", "인천(중구)", "인천", 31.0, 27.4, 75, 31.7, "09:00", "13:00")
  ]
};

function makeMockRegion(id: string, label: string, group: string, currentApparent: number, temp: number, humidity: number, max: number, from: string, to: string): RegionWeather {
  const forecast = [9, 10, 11, 12, 13, 14, 15, 16].map((hour, index) => ({
    time: `${String(hour).padStart(2, "0")}:00`,
    temperatureC: Math.round((temp + index * 0.25) * 10) / 10,
    humidityPct: Math.max(55, humidity - index * 2),
    apparentC: Math.round((currentApparent + Math.sin(index / 7 * Math.PI) * (max - currentApparent)) * 10) / 10
  }));
  return { id, name: id, label, group, nx: 0, ny: 0, current: { time: "10:00", temperatureC: temp, humidityPct: humidity, apparentC: currentApparent }, forecast, from, to, maxApparent: max };
}

function selectedIds() {
  return [...document.querySelectorAll<HTMLInputElement>(".area-checkbox:checked")].map((input) => input.value);
}

function sortRegions(regions: RegionWeather[]) {
  const order = new Map(DEFAULT_AREAS.map((id, index) => [id, index]));
  return [...regions].sort((a, b) => b.maxApparent - a.maxApparent || (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

function formatTemp(value: number) {
  return `${value.toFixed(1)}℃`;
}

function heatWindowText(region: RegionWeather) {
  if (!region.from || !region.to) return "31℃ 이상 체감온도 유지 전망 없음";
  return `${region.from} ~ ${region.to}까지 31℃ 이상 체감온도 유지 전망`;
}

function maxPoint(region: RegionWeather) {
  return region.forecast.reduce((best, point) => point.apparentC > best.apparentC ? point : best, region.forecast[0] || region.current);
}

function buildMessage(data: WeatherPayload) {
  const regions = sortRegions(data.regions);
  const lines = ["<지역별 체감온도 안내>", `${data.generatedAtText} 기준`, "", "<관내 체감온도 높은 순>"];
  regions.forEach((region, index) => {
    const peak = maxPoint(region);
    lines.push(`${index + 1}. ${region.label}: 현재 ${formatTemp(region.current.apparentC)}, 최고 ${formatTemp(region.maxApparent)}(${peak.time})`);
    lines.push(`  - 기온 ${formatTemp(region.current.temperatureC)}, 습도 ${region.current.humidityPct}%`);
    lines.push(`  * ${heatWindowText(region)}`);
    lines.push("");
  });
  lines.push(
    "<옥외작업시 안전조치 사항>",
    "○  31도 이상 ",
    "    - 수분 자주섭취, 시원한 곳에서 충분히 휴식 등",
    "    - 체감온도 2h마다 기록관리",
    "",
    "○ 35도 이상",
    "  - 무더위 시간대(14~17시)에는  야외활동과 불가피한 경우를 제외하고는  옥외작업 중지 ",
    "",
    "<옥외 작업시 체감온도 자동계산기>",
    "https://m.site.naver.com/2932e"
  );
  return lines.join("\n");
}

async function loadWeather(ids: string[]): Promise<WeatherPayload> {
  const query = ids.length ? `?areas=${encodeURIComponent(ids.join(","))}` : "";
  const response = await fetch(`/.netlify/functions/weather${query}`, { cache: "no-store" });
  const text = await response.text();
  if (text.trim().startsWith("<")) throw new Error("로컬 미리보기에서는 Netlify 함수를 직접 호출할 수 없어");
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.error || "기상 데이터를 불러오지 못했습니다.");
  return data;
}

function setStatus(message: string, isError = false) {
  const status = document.querySelector<HTMLDivElement>("#status")!;
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function renderSelectors(groups: AreaGroup[], selected = DEFAULT_AREAS) {
  const selector = document.querySelector<HTMLDivElement>("#areaSelector")!;
  selector.innerHTML = groups.map((group) => `
    <fieldset class="area-group">
      <legend>${group.label}</legend>
      ${group.areas.map((area) => `
        <label><input class="area-checkbox" type="checkbox" value="${area.id}" ${selected.includes(area.id) ? "checked" : ""}>${area.label}</label>
      `).join("")}
    </fieldset>
  `).join("");
}

function renderTables(data: WeatherPayload) {
  const summary = document.querySelector<HTMLDivElement>("#summary")!;
  const hourly = document.querySelector<HTMLDivElement>("#hourly")!;
  const regions = sortRegions(data.regions);
  summary.innerHTML = regions.map((region) => {
    const peak = maxPoint(region);
    return `<article class="summary-card">
      <h3>${region.label}</h3>
      <dl>
        <div><dt>현재 체감</dt><dd>${formatTemp(region.current.apparentC)}</dd></div>
        <div><dt>현재 기온</dt><dd>${formatTemp(region.current.temperatureC)}</dd></div>
        <div><dt>현재 습도</dt><dd>${region.current.humidityPct}%</dd></div>
        <div><dt>하루 최고 체감</dt><dd>${formatTemp(region.maxApparent)} <small>${peak.time}</small></dd></div>
      </dl>
      <p>${heatWindowText(region)}</p>
    </article>`;
  }).join("");

  hourly.innerHTML = regions.map((region) => `<section class="hourly-card">
    <h3>${region.label} 시간대별 체감온도</h3>
    <table>
      <thead><tr><th>시간</th><th>기온</th><th>습도</th><th>체감온도</th></tr></thead>
      <tbody>${region.forecast.map((point) => `<tr class="${point.apparentC >= 31 ? "hot" : ""}"><td>${point.time}</td><td>${formatTemp(point.temperatureC)}</td><td>${point.humidityPct}%</td><td>${formatTemp(point.apparentC)}</td></tr>`).join("")}</tbody>
    </table>
  </section>`).join("");
}

async function render() {
  const textarea = document.querySelector<HTMLTextAreaElement>("#message")!;
  const meta = document.querySelector<HTMLDivElement>("#meta")!;
  const refreshBtn = document.querySelector<HTMLButtonElement>("#refresh")!;
  const copyBtn = document.querySelector<HTMLButtonElement>("#copy")!;

  renderSelectors(MOCK_GROUPS);

  async function refresh() {
    refreshBtn.disabled = true;
    setStatus("기상청 현재 실황과 예보를 불러오는 중입니다.");
    try {
      const data = await loadWeather(selectedIds());
      renderSelectors(data.areaGroups, selectedIds());
      renderTables(data);
      textarea.value = buildMessage(data);
      meta.textContent = `${data.source} · 선택 지역 ${data.regions.length}곳`;
      setStatus("선택 지역의 기온·습도·체감온도와 시간대별 현황이 생성되었습니다.");
    } catch (error) {
      const data = { ...MOCK_DATA, regions: MOCK_DATA.regions.filter((region) => selectedIds().includes(region.id)) || MOCK_DATA.regions };
      renderTables(data);
      textarea.value = buildMessage(data);
      meta.textContent = "미리보기 샘플 데이터";
      setStatus(`${error instanceof Error ? error.message : String(error)} 샘플 문구를 표시합니다.`, true);
    } finally {
      refreshBtn.disabled = false;
    }
  }

  document.querySelector<HTMLDivElement>("#areaSelector")!.addEventListener("change", refresh);
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      setStatus("안내문을 복사했습니다. 카톡이나 문자에 바로 붙여넣으면 됩니다.");
    } catch {
      textarea.select();
      document.execCommand("copy");
      setStatus("안내문을 선택했습니다. Ctrl+C로 복사해 주세요.");
    }
  });
  refreshBtn.addEventListener("click", refresh);
  await refresh();
}

render();