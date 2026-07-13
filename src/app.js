const DETAIL_URL = "https://heat-safety-app.netlify.app/";
const canvas = document.querySelector("#poster");
const ctx = canvas.getContext("2d");
const statusEl = document.querySelector("#status");
const refreshBtn = document.querySelector("#refreshBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const copyTextBtn = document.querySelector("#copyTextBtn");
const regionSelector = document.querySelector("#regionSelector");
const selectMetroBtn = document.querySelector("#selectMetroBtn");
const selectPrimaryBtn = document.querySelector("#selectPrimaryBtn");
const clearBtn = document.querySelector("#clearBtn");

const W = 1200;
const H = 1600;
const BLUE = "#063f93";
const NAVY = "#06255b";
const RED = "#e00000";
const ORANGE = "#ff9800";
const YELLOW = "#ffd234";
const GREEN = "#08733c";
const BLACK = "#111111";
const GRID = "#c9d6ea";

let latestData = null;
let selectedNames = new Set(["서울", "수원", "인천"]);

function font(size, weight = 700) {
  return `${weight} ${size}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
}

function centerText(text, x, y, w, h, size, color = BLACK, weight = 700, lineHeight = 1.2) {
  const lines = String(text).split("\n");
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => {
    ctx.fillText(line, x + w / 2, y + h / 2 + (index - (lines.length - 1) / 2) * size * lineHeight);
  });
}

function leftText(text, x, y, size, color = BLACK, weight = 700) {
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
}

function roundRect(x, y, w, h, r, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function levelLabel(value) {
  if (value >= 38) return { label: "위험", color: RED };
  if (value >= 35) return { label: "경보", color: "#ff5a1d" };
  if (value >= 33) return { label: "주의보", color: ORANGE };
  if (value >= 31) return { label: "주의", color: YELLOW };
  return { label: "보통", color: "#e9eef5" };
}

function selectedRegions() {
  if (!latestData) return [];
  return latestData.regions
    .filter((region) => selectedNames.has(region.name))
    .sort((a, b) => b.maxApparent - a.maxApparent);
}

function displayName(region) {
  if (region.name === "수원") return "경기(수원)";
  return region.label || region.name;
}

function windowText(region) {
  return region.from ? `${region.from} ~ ${region.to}` : "미예상";
}

function drawHeader(regions) {
  roundRect(30, 24, 330, 56, 28, BLUE);
  centerText("매일 오전 10시 발송", 30, 24, 330, 56, 30, "white");
  centerText("폭염으로부터 건강을 지키세요!", 360, 22, 510, 58, 38, NAVY);
  leftText("체감온도 안내 포스터", 64, 98, 78, RED, 800);
  const meta = latestData ? `${latestData.generatedAtText} 기준 · 기상청 데이터 기반` : "기상청 데이터 기반";
  centerText(meta, 70, 184, 1060, 40, 28, BLACK);
  ctx.fillStyle = "#ffc21a";
  ctx.beginPath();
  ctx.arc(1040, 96, 72, 0, Math.PI * 2);
  ctx.fill();
  centerText("☀", 992, 50, 96, 96, 64, "#3a2b00");
  centerText(`${regions.length}개 지역 선택`, 850, 115, 220, 42, 24, BLUE);
}

function drawRegionSummary(regions) {
  const x = 30;
  const y = 245;
  const w = 1140;
  roundRect(x, y, w, 540, 14, "white", "#b6c9e8");
  roundRect(x, y, w, 56, 12, BLUE);
  centerText("선택 지역 체감온도 현황", x, y, w, 56, 34, "white");

  const headerY = y + 56;
  const rowH = Math.min(76, Math.max(54, Math.floor((hOrDefault(regions.length) - 104) / Math.max(regions.length, 1))));
  const cols = [x, x + 210, x + 390, x + 570, x + 760, x + w];
  ctx.fillStyle = "#f7f7f7";
  ctx.fillRect(x, headerY, w, 52);
  ctx.strokeStyle = GRID;
  ctx.strokeRect(x, headerY, w, 52);
  ["지역", "현재", "최고", "31℃ 이상", "조치 단계"].forEach((title, i) => {
    centerText(title, cols[i], headerY, cols[i + 1] - cols[i], 52, 24);
  });

  let yy = headerY + 52;
  regions.slice(0, 8).forEach((region) => {
    const level = levelLabel(region.maxApparent);
    ctx.strokeStyle = GRID;
    ctx.strokeRect(x, yy, w, rowH);
    centerText(displayName(region), cols[0], yy, cols[1] - cols[0], rowH, 26);
    centerText(`${region.current.apparentC.toFixed(1)}℃`, cols[1], yy, cols[2] - cols[1], rowH, 26, region.current.apparentC >= 31 ? RED : BLACK);
    centerText(`${region.maxApparent.toFixed(1)}℃`, cols[2], yy, cols[3] - cols[2], rowH, 26, region.maxApparent >= 31 ? RED : BLACK);
    centerText(windowText(region), cols[3], yy, cols[4] - cols[3], rowH, 24, region.from ? RED : BLACK);
    roundRect(cols[4] + 28, yy + 14, cols[5] - cols[4] - 56, rowH - 28, 8, level.color, "#ffffff");
    centerText(level.label, cols[4] + 28, yy + 14, cols[5] - cols[4] - 56, rowH - 28, 24, level.color === YELLOW || level.color === "#e9eef5" ? BLACK : "white");
    yy += rowH;
  });

  if (!regions.length) {
    centerText("지역을 선택하면 이곳에 체감온도 현황이 표시됩니다.", x, y + 190, w, 120, 34, "#546179");
  }
}

function hOrDefault(count) {
  return count <= 4 ? 420 : 488;
}

function drawHourlyPanel(regions) {
  const x = 30;
  const y = 815;
  const w = 1140;
  const h = 250;
  roundRect(x, y, w, h, 14, "white", "#b6c9e8");
  roundRect(x, y, w, 50, 12, BLUE);
  centerText("시간대별 최고 체감온도", x, y, w, 50, 32, "white");

  const top = regions[0];
  if (!top) {
    centerText("선택 지역이 없습니다.", x, y + 80, w, 120, 30, "#546179");
    return;
  }
  centerText(`${displayName(top)} 기준`, x + 20, y + 62, 180, 44, 26, BLUE);
  const points = top.forecast.slice(0, 12);
  const cellW = (w - 240) / Math.max(points.length, 1);
  points.forEach((point, index) => {
    const cx = x + 220 + index * cellW;
    const hot = point.apparentC >= 31;
    roundRect(cx + 4, y + 78, cellW - 8, 112, 8, hot ? "#fff4f1" : "#f8fbff", hot ? "#ffb4a8" : GRID);
    centerText(point.time, cx + 4, y + 88, cellW - 8, 24, 18, BLUE);
    centerText(`${point.apparentC.toFixed(1)}℃`, cx + 4, y + 120, cellW - 8, 34, 22, hot ? RED : BLACK);
    centerText(`${point.temperatureC.toFixed(1)}℃/${point.humidityPct.toFixed(0)}%`, cx + 4, y + 158, cellW - 8, 26, 14, "#546179", 700);
  });
  centerText("※ 선택 지역 중 최고 체감온도가 가장 높은 지역의 시간대별 예보입니다.", x, y + 206, w, 34, 20, "#546179");
}

function drawSafety() {
  const x = 30;
  const y = 1095;
  const w = 1140;
  roundRect(x, y, w, 340, 14, "white", "#ffb4a8");
  roundRect(x, y, w, 54, 12, RED);
  centerText("옥외작업 안전조치 사항", x, y, w, 54, 34, "white");

  const items = [
    ["31℃ 이상", "수분을 자주 섭취하고 시원한 곳에서 휴식하세요."],
    ["33℃ 이상", "무더위 시간대(14~17시) 야외활동과 옥외작업을 자제하세요."],
    ["35℃ 이상", "옥외작업 중지 및 Safety call 신고, 실내 또는 시원한 곳으로 이동하세요."],
    ["38℃ 이상", "즉시 작업 중단, 119 신고, 환자 체온 낮추기 등 응급조치를 실시하세요."]
  ];
  items.forEach(([temp, action], index) => {
    const yy = y + 74 + index * 60;
    roundRect(x + 28, yy, 150, 42, 8, index < 2 ? ORANGE : RED, null);
    centerText(temp, x + 28, yy, 150, 42, 22, "white");
    leftText(`• ${action}`, x + 205, yy + 7, 24);
  });
  centerText("불가피한 경우를 제외하고 무더위 시간대에는 옥외작업을 중지해야 합니다.", x + 30, y + 290, w - 60, 34, 26, RED);
}

function drawFooter() {
  roundRect(30, 1460, 1140, 94, 12, "#f3fff7", GREEN);
  centerText("체감온도 자동계산기", 60, 1475, 300, 38, 28, GREEN);
  centerText(DETAIL_URL, 360, 1475, 760, 38, 22, BLACK, 700);
  centerText("안전은 선택이 아닌 필수입니다. 모두의 건강과 생명을 지킵시다!", 160, 1572, 880, 24, 20, "white");
  ctx.fillStyle = BLUE;
  ctx.fillRect(160, 1568, 880, 30);
}

function drawPoster() {
  const regions = selectedRegions();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, W, H);
  drawHeader(regions);
  drawRegionSummary(regions);
  drawHourlyPanel(regions);
  drawSafety();
  drawFooter();
}

function renderSelector() {
  if (!latestData) return;
  regionSelector.innerHTML = latestData.regions.map((region) => {
    const checked = selectedNames.has(region.name) ? "checked" : "";
    const name = displayName(region);
    return `
      <label class="region-option">
        <input type="checkbox" value="${region.name}" ${checked} />
        <span>${name}<small>현재 ${region.current.apparentC.toFixed(1)}℃ · 최고 ${region.maxApparent.toFixed(1)}℃</small></span>
      </label>
    `;
  }).join("");
  regionSelector.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) selectedNames.add(input.value);
      else selectedNames.delete(input.value);
      drawPoster();
    });
  });
}

function setSelection(names) {
  selectedNames = new Set(names);
  renderSelector();
  drawPoster();
}

function buildCopyText() {
  const regions = selectedRegions();
  if (!latestData || !regions.length) return "선택된 지역이 없습니다.";
  return [
    "[체감온도 안내]",
    `${latestData.generatedAtText} 기준`,
    "",
    "선택 지역 체감온도 높은 순",
    ...regions.map((region, index) => `${index + 1}. ${displayName(region)}: 현재 ${region.current.apparentC.toFixed(1)}℃, 최고 ${region.maxApparent.toFixed(1)}℃, 31℃ 이상 ${windowText(region)}`),
    "",
    "옥외작업 안전조치 사항",
    "- 물, 이온음료 등 수분을 자주 섭취하세요.",
    "- 시원한 곳에서 충분히 휴식하세요.",
    "- 무더위 시간대(14~17시) 야외활동과 옥외작업을 자제하세요.",
    "- 두통, 어지러움, 피로감이 있으면 즉시 작업을 중단하고 건강상태를 확인하세요.",
    "",
    `체감온도 자동계산기: ${DETAIL_URL}`
  ].join("\n");
}

async function copyHeatText() {
  const text = buildCopyText();
  try {
    await navigator.clipboard.writeText(text);
    statusEl.className = "status";
    statusEl.textContent = "선택 지역 체감온도 요약과 안전조치 사항을 복사했습니다.";
  } catch {
    window.prompt("아래 내용을 복사하세요.", text);
  }
}

async function loadWeather() {
  statusEl.className = "status";
  statusEl.textContent = "기상청 데이터를 불러오는 중입니다.";
  refreshBtn.disabled = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch("/.netlify/functions/weather", { cache: "no-store", signal: controller.signal });
    const text = await response.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); }
      catch { throw new Error(`서버 응답을 JSON으로 읽을 수 없습니다. 응답 앞부분: ${text.slice(0, 120)}`); }
    }
    if (!response.ok) throw new Error(data?.error || `서버 오류 ${response.status}: 응답 내용이 비어 있습니다.`);
    if (!data) throw new Error("서버 응답이 비어 있습니다. Netlify Function 실행 시간 초과 가능성이 큽니다.");
    latestData = data;
    renderSelector();
    drawPoster();
    statusEl.textContent = `${data.generatedAtText} 기준 · ${data.source}`;
  } catch (error) {
    const message = error.name === "AbortError" ? "기상청 데이터 조회가 25초를 넘겨 중단되었습니다." : error.message;
    statusEl.className = "status error";
    statusEl.textContent = message;
    drawError(message);
  } finally {
    clearTimeout(timer);
    refreshBtn.disabled = false;
  }
}

function drawError(message) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = BLACK;
  ctx.strokeRect(0, 0, W, H);
  centerText("기상청 데이터 조회 실패", 0, 660, W, 60, 48, RED);
  centerText(message, 120, 750, W - 240, 120, 28, BLACK, 700, 1.25);
  centerText("Netlify 환경변수 KMA_SERVICE_KEY와 API 활용 승인을 확인하세요.", 120, 900, W - 240, 60, 28);
}

selectMetroBtn.addEventListener("click", () => setSelection(["서울", "수원", "인천"]));
selectPrimaryBtn.addEventListener("click", () => setSelection(["서울", "수원", "대전", "광주", "대구", "부산", "제주"]));
clearBtn.addEventListener("click", () => setSelection([]));
refreshBtn.addEventListener("click", loadWeather);
copyTextBtn.addEventListener("click", copyHeatText);
downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  link.download = `heatwave-poster-${stamp}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

loadWeather();
