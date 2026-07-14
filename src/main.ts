import "./styles/poster.css";

type WeatherPoint = {
  time: string;
  apparentC: number;
};

type RegionWeather = {
  name: string;
  label: string;
  basis?: string;
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
  regions: RegionWeather[];
};

const MOCK_DATA: WeatherPayload = {
  generatedAt: new Date().toISOString(),
  generatedAtText: "2026. 7. 14. (화) 10:57",
  source: "미리보기 샘플 데이터",
  regions: [
    { name: "수원", label: "경기(수원)", current: { time: "10:00", apparentC: 31.0 }, forecast: [], from: "09:00", to: "13:00", maxApparent: 32.1 },
    { name: "서울", label: "서울(영등포)", basis: "영등포", current: { time: "10:00", apparentC: 30.9 }, forecast: [], from: "09:00", to: "14:00", maxApparent: 31.7 },
    { name: "인천", label: "인천", current: { time: "10:00", apparentC: 31.0 }, forecast: [], from: "09:00", to: "13:00", maxApparent: 31.7 }
  ]
};

function sortRegions(regions: RegionWeather[]) {
  const order = new Map([["수원", 0], ["서울", 1], ["인천", 2]]);
  return [...regions].sort((a, b) => b.maxApparent - a.maxApparent || (order.get(a.name) ?? 99) - (order.get(b.name) ?? 99));
}

function formatTemp(value: number) {
  return `${value.toFixed(1)}℃`;
}

function heatWindowText(region: RegionWeather) {
  if (!region.from || !region.to) return "31℃ 이상 체감온도 유지 전망 없음";
  return `${region.from} ~ ${region.to}까지 31℃ 이상 체감온도 유지 전망`;
}

function buildMessage(data: WeatherPayload) {
  const regions = sortRegions(data.regions).slice(0, 3);
  const lines = [
    "<지역별 체감온도 안내>",
    `${data.generatedAtText} 기준`,
    "",
    "<관내 체감온도 높은 순>"
  ];

  regions.forEach((region, index) => {
    lines.push(`${index + 1}. ${region.label}: 현재 ${formatTemp(region.current.apparentC)}, 최고 ${formatTemp(region.maxApparent)}`);
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

async function loadWeather(): Promise<WeatherPayload> {
  const response = await fetch("/.netlify/functions/weather", { cache: "no-store" });
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

async function render() {
  const textarea = document.querySelector<HTMLTextAreaElement>("#message")!;
  const meta = document.querySelector<HTMLDivElement>("#meta")!;
  const refreshBtn = document.querySelector<HTMLButtonElement>("#refresh")!;
  const copyBtn = document.querySelector<HTMLButtonElement>("#copy")!;

  async function refresh() {
    refreshBtn.disabled = true;
    setStatus("기상청 현재 실황과 예보를 불러오는 중입니다.");
    try {
      const data = await loadWeather();
      textarea.value = buildMessage(data);
      meta.textContent = `${data.source} · 표시 지역: 경기(수원), 서울(영등포), 인천`;
      setStatus("안내문이 최신 기상 데이터로 생성되었습니다.");
    } catch (error) {
      textarea.value = buildMessage(MOCK_DATA);
      meta.textContent = "미리보기 샘플 데이터 · 표시 지역: 경기(수원), 서울(영등포), 인천";
      setStatus(`${error instanceof Error ? error.message : String(error)} 샘플 문구를 표시합니다.`, true);
    } finally {
      refreshBtn.disabled = false;
    }
  }

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