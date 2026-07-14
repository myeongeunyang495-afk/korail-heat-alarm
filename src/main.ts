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
  maxTime: string;
};

type WeatherPayload = {
  generatedAt: string;
  generatedAtText: string;
  source: string;
  rangeText?: string;
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
  rangeText: "현 시각부터 12시간",
  areaGroups: MOCK_GROUPS,
  regions: [
    makeMockRegion("suwon", "경기(수원)", "경기", 31.0, 27.9, 72, 32.1, "12:00", "09:00", "13:00"),
    makeMockRegion("seoul_yeongdeungpo", "서울(영등포)", "서울", 30.9, 28.1, 69, 33.4, "14:00", "11:00", "16:00"),
    makeMockRegion("incheon_jung", "인천(중구)", "인천", 31.0, 27.4, 75, 35.2, "15:00", "10:00", "17:00")
  ]
};

let activeRegionId = DEFAULT_AREAS[0];
let latestRenderedData: WeatherPayload | null = null;

function makeMockRegion(id: string, label: string, group: string, currentApparent: number, temp: number, humidity: number, max: number, maxTime: string, from: string, to: string): RegionWeather {
  const forecast = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((hour, index) => {
    const ratio = Math.sin((index / 11) * Math.PI);
    return {
      time: `${String(hour).padStart(2, "0")}:00`,
      temperatureC: Math.round((temp + index * 0.18) * 10) / 10,
      humidityPct: Math.max(55, humidity - index * 2),
      apparentC: Math.round((currentApparent + ratio * (max - currentApparent)) * 10) / 10
    };
  });
  return { id, name: id, label, group, nx: 0, ny: 0, current: { time: "10:00", temperatureC: temp, humidityPct: humidity, apparentC: currentApparent }, forecast, from, to, maxApparent: max, maxTime };
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

function severityClass(value: number) {
  if (value >= 38) return "level-deep-red";
  if (value >= 35) return "level-red";
  if (value >= 33) return "level-orange";
  if (value >= 31) return "level-yellow";
  return "level-normal";
}

function severityLabel(value: number) {
  if (value >= 38) return "위험";
  if (value >= 35) return "경보";
  if (value >= 33) return "주의보";
  if (value >= 31) return "관심";
  return "정상";
}

function signalClass(value: number) {
  if (value >= 38) return "signal-deep-red";
  if (value >= 35) return "signal-red";
  if (value >= 33) return "signal-orange";
  if (value >= 31) return "signal-yellow";
  return "signal-normal";
}

function heatWindowText(region: RegionWeather) {
  if (!region.from || !region.to) return "현 시각부터 12시간 내 31℃ 이상 체감온도 예상 없음";
  return `${region.from} ~ ${region.to}까지 31℃ 이상 체감온도 유지 전망`;
}

function maxPoint(region: RegionWeather) {
  return [region.current, ...region.forecast].reduce((best, point) => point.apparentC > best.apparentC ? point : best, region.current);
}

function buildMessage(data: WeatherPayload) {
  const regions = sortRegions(data.regions);
  const rangeText = data.rangeText || "현 시각부터 12시간";
  const lines = ["<지역별 체감온도 안내>", `${data.generatedAtText} 기준`, "", "<주요 관내 체감온도 현황>"];
  regions.forEach((region, index) => {
    const peak = maxPoint(region);
    lines.push(`${index + 1}. ${region.label}: 현재 ${formatTemp(region.current.apparentC)}, ${rangeText} 내 최고 ${formatTemp(region.maxApparent)}(${region.maxTime || peak.time})`);
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
    "  - 무더위 시간대(14~17시)에는 야외활동과 불가피한 경우를 제외하고는 옥외작업 중지",
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
  latestRenderedData = data;
  const summary = document.querySelector<HTMLDivElement>("#summary")!;
  const hourly = document.querySelector<HTMLDivElement>("#hourly")!;
  const regions = sortRegions(data.regions);
  if (!regions.some((region) => region.id === activeRegionId)) activeRegionId = regions[0]?.id || "";

  summary.innerHTML = regions.map((region) => {
    const peak = maxPoint(region);
    const level = severityClass(region.maxApparent);
    const active = region.id === activeRegionId ? " active" : "";
    return `<article class="summary-card ${level}${active}" data-region-id="${region.id}" tabindex="0" role="button" aria-label="${region.label} 시간대별 체감온도 보기">
      <h3><span class="region-name"><i class="signal-dot ${signalClass(region.current.apparentC)}" title="현재 체감온도 ${formatTemp(region.current.apparentC)}" aria-hidden="true"></i>${region.label}</span><span>${severityLabel(region.maxApparent)}</span></h3>
      <dl>
        <div><dt>현재 체감</dt><dd>${formatTemp(region.current.apparentC)}</dd></div>
        <div><dt>현재 기온</dt><dd>${formatTemp(region.current.temperatureC)}</dd></div>
        <div><dt>현재 습도</dt><dd>${region.current.humidityPct}%</dd></div>
        <div><dt>12시간 내 최고 체감</dt><dd>${formatTemp(region.maxApparent)} <small>${region.maxTime || peak.time}</small></dd></div>
      </dl>
      <p>${heatWindowText(region)}</p>
    </article>`;
  }).join("");

  const activeRegion = regions.find((region) => region.id === activeRegionId) || regions[0];
  if (!activeRegion) {
    hourly.innerHTML = "";
    return;
  }
  const points = [activeRegion.current, ...activeRegion.forecast].slice(0, 13);
  const maxValue = Math.max(38, ...points.map((point) => point.apparentC));
  const minValue = Math.min(28, ...points.map((point) => point.apparentC));
  hourly.innerHTML = `<section class="chart-card ${severityClass(activeRegion.maxApparent)}">
    <div class="chart-head">
      <div>
        <h3>${activeRegion.label} 시간대별 체감온도</h3>
        <p>현 시각부터 12시간 · 막대 클릭 없이 지역 카드를 클릭해 변경</p>
      </div>
      <strong>최고 ${formatTemp(activeRegion.maxApparent)} <small>${activeRegion.maxTime || maxPoint(activeRegion).time}</small></strong>
    </div>
    <div class="chart-axis-label">체감온도</div>
    <div class="bar-chart" style="--chart-min:${minValue}; --chart-max:${maxValue};">
      ${points.map((point) => {
        const height = Math.max(8, ((point.apparentC - minValue) / Math.max(1, maxValue - minValue)) * 170 + 8);
        return `<div class="bar-item ${severityClass(point.apparentC)}">
          <div class="bar-value">${formatTemp(point.apparentC)}</div>
          <div class="bar-track"><div class="bar-fill" style="height:${height}px"></div></div>
          <div class="bar-time">${point.time}</div>
          <div class="bar-meta">${formatTemp(point.temperatureC)} / ${point.humidityPct}%</div>
        </div>`;
      }).join("")}
    </div>
    <div class="chart-legend"><span class="legend-yellow">31℃ 이상</span><span class="legend-orange">33℃ 이상</span><span class="legend-red">35℃ 이상</span><span class="legend-deep-red">38℃ 이상</span></div>
  </section>`;
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
      meta.textContent = `${data.source} · ${data.rangeText || "현 시각부터 12시간"} · 선택 지역 ${data.regions.length}곳`;
      setStatus("선택 지역의 12시간 내 기온·습도·체감온도 현황이 생성되었습니다.");
    } catch (error) {
      const ids = selectedIds();
      const regions = MOCK_DATA.regions.filter((region) => !ids.length || ids.includes(region.id));
      const data = { ...MOCK_DATA, regions: regions.length ? regions : MOCK_DATA.regions };
      renderTables(data);
      textarea.value = buildMessage(data);
      meta.textContent = "미리보기 샘플 데이터 · 현 시각부터 12시간";
      setStatus(`${error instanceof Error ? error.message : String(error)} 샘플 문구를 표시합니다.`, true);
    } finally {
      refreshBtn.disabled = false;
    }
  }

  document.querySelector<HTMLDivElement>("#areaSelector")!.addEventListener("change", refresh);
  document.querySelector<HTMLDivElement>("#summary")!.addEventListener("click", (event) => {
    const summaryCard = (event.target as HTMLElement).closest<HTMLElement>(".summary-card[data-region-id]");
    if (!summaryCard || !latestRenderedData) return;
    activeRegionId = summaryCard.dataset.regionId || activeRegionId;
    renderTables(latestRenderedData);
  });
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
