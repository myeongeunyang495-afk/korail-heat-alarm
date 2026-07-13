const DETAIL_URL = "https://heat-safety-app.netlify.app/";
const canvas = document.querySelector("#poster");
const ctx = canvas.getContext("2d");
const statusEl = document.querySelector("#status");
const refreshBtn = document.querySelector("#refreshBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const copyTextBtn = document.querySelector("#copyTextBtn");
const regionTitle = document.querySelector("#regionTitle");
const regionSummary = document.querySelector("#regionSummary");
const regionForecast = document.querySelector("#regionForecast");

const W = 1200;
const H = 1800;
const BLUE = "#063f93";
const DARK_BLUE = "#06255b";
const RED = "#e00000";
const ORANGE = "#ff9800";
const YELLOW = "#ffd234";
const GREEN = "#08733c";
const BLACK = "#111111";
const GRID = "#c9d6ea";

let latestData = null;

const MAP_REGIONS = [
  { key: "서울", label: "서울", stationNames: ["서울"], points: [[292, 382], [325, 360], [360, 374], [358, 414], [322, 434], [292, 416]] },
  { key: "인천", label: "인천", stationNames: ["인천"], points: [[232, 400], [284, 372], [294, 420], [252, 462], [218, 444]] },
  { key: "경기", label: "경기", stationNames: ["수원"], points: [[300, 322], [390, 320], [438, 390], [422, 494], [342, 535], [266, 490], [254, 414]] },
  { key: "강원(영서)", label: "강원(영서)", stationNames: ["춘천"], points: [[392, 300], [520, 278], [594, 360], [542, 470], [430, 438], [438, 390]] },
  { key: "강원(영동)", label: "강원(영동)", stationNames: ["강릉"], points: [[520, 278], [644, 318], [704, 452], [622, 535], [542, 470], [594, 360]] },
  { key: "충남", label: "충남", stationNames: ["천안"], points: [[238, 522], [342, 535], [388, 616], [350, 706], [222, 692], [178, 606]] },
  { key: "세종", label: "세종", stationNames: ["세종"], points: [[356, 548], [406, 548], [422, 594], [382, 622], [346, 594]] },
  { key: "대전", label: "대전", stationNames: ["대전"], points: [[382, 622], [432, 624], [448, 676], [404, 710], [362, 682]] },
  { key: "충북", label: "충북", stationNames: ["청주"], points: [[422, 494], [542, 470], [588, 592], [534, 704], [448, 676], [388, 616]] },
  { key: "경북", label: "경북", stationNames: ["안동"], points: [[588, 592], [704, 452], [768, 618], [738, 822], [618, 846], [534, 704]] },
  { key: "대구", label: "대구", stationNames: ["대구"], points: [[594, 724], [660, 712], [686, 770], [642, 820], [590, 790]] },
  { key: "울산", label: "울산", stationNames: ["울산"], points: [[700, 792], [758, 788], [792, 850], [744, 900], [696, 862]] },
  { key: "부산", label: "부산", stationNames: ["부산"], points: [[650, 884], [724, 888], [742, 948], [674, 990], [622, 944]] },
  { key: "경남", label: "경남", stationNames: ["창원"], points: [[500, 788], [590, 790], [642, 820], [696, 862], [650, 984], [496, 990], [430, 900]] },
  { key: "전북", label: "전북", stationNames: ["전주"], points: [[350, 706], [448, 676], [534, 704], [500, 788], [430, 900], [312, 870], [250, 784]] },
  { key: "광주", label: "광주", stationNames: ["광주"], points: [[310, 870], [366, 856], [402, 902], [366, 950], [304, 928]] },
  { key: "전남", label: "전남", stationNames: ["목포"], points: [[250, 784], [312, 870], [430, 900], [496, 990], [420, 1110], [236, 1100], [150, 978]] },
  { key: "제주", label: "제주", stationNames: ["제주"], points: [[86, 1034], [174, 1008], [244, 1042], [218, 1090], [116, 1092]], island: true }
];

function font(size, weight = 700) {
  return `${weight} ${size}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
}

function colorForLevel(level) {
  if (level === "warning") return RED;
  if (level === "advisory") return ORANGE;
  return "#eeeeee";
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

function bullet(text, x, y, size = 22, color = BLACK) {
  leftText(`• ${text}`, x, y, size, color, 700);
}

function mapPoint(point) {
  return { x: point[0] * 0.62 + 80, y: point[1] * 0.43 + 205 };
}

function regionCenter(region) {
  const mapped = region.points.map(mapPoint);
  return mapped.reduce((acc, point) => ({ x: acc.x + point.x / mapped.length, y: acc.y + point.y / mapped.length }), { x: 0, y: 0 });
}

function drawPolygon(points, fill, stroke = "white", lineWidth = 2) {
  const mapped = points.map(mapPoint);
  ctx.beginPath();
  ctx.moveTo(mapped[0].x, mapped[0].y);
  mapped.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function pointInPolygon(point, polygon) {
  const mapped = polygon.map(mapPoint);
  let inside = false;
  for (let i = 0, j = mapped.length - 1; i < mapped.length; j = i++) {
    const xi = mapped[i].x;
    const yi = mapped[i].y;
    const xj = mapped[j].x;
    const yj = mapped[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function drawSun() {
  const sx = 1062;
  const sy = 92;
  ctx.fillStyle = "#ffc21a";
  ctx.beginPath();
  ctx.arc(sx, sy, 66, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f5a400";
  ctx.lineWidth = 6;
  [[0, -96], [70, -70], [96, 0], [70, 70], [0, 96], [-70, 70], [-96, 0], [-70, -70]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(sx + dx * 0.72, sy + dy * 0.72);
    ctx.lineTo(sx + dx, sy + dy);
    ctx.stroke();
  });
  roundRect(sx - 52, sy - 28, 46, 34, 9, "#222");
  roundRect(sx + 6, sy - 28, 46, 34, 9, "#222");
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(sx, sy + 7, 32, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

function drawHeader() {
  roundRect(28, 22, 302, 54, 28, BLUE);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(58, 46, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(58, 46);
  ctx.lineTo(58, 37);
  ctx.moveTo(58, 46);
  ctx.lineTo(66, 52);
  ctx.stroke();
  leftText("매일 오전 10시 발송", 84, 31, 30, "white");
  centerText("폭염으로부터 건강을 지키세요!", 342, 16, 510, 54, 36, DARK_BLUE);
  leftText("폭염특보 및 체감온도 안내", 74, 90, 76, RED);
  drawSun();
}

function drawMap(data) {
  const x = 28;
  const y = 220;
  const w = 568;
  const h = 565;
  roundRect(x, y, w, h, 14, "white", "#b6c9e8");
  roundRect(x, y, w, 52, 12, BLUE);
  centerText("24시간 내 폭염특보 예상 지역", x, y, w, 52, 34, "white");

  [["폭염경보", RED], ["폭염주의보", ORANGE], ["특보 없음", "#eeeeee"]].forEach(([label, color], i) => {
    const yy = y + 85 + i * 42;
    ctx.fillStyle = color;
    ctx.fillRect(52, yy, 26, 24);
    ctx.strokeStyle = "#777";
    ctx.strokeRect(52, yy, 26, 24);
    leftText(label, 92, yy - 2, 23);
  });

  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 8, y + 60, w - 16, h - 70);
  ctx.clip();
  MAP_REGIONS.forEach((region) => {
    const level = data.map?.[region.key] || "none";
    drawPolygon(region.points, colorForLevel(level), "white", 2.5);
  });
  MAP_REGIONS.forEach((region) => {
    const level = data.map?.[region.key] || "none";
    const center = regionCenter(region);
    centerText(region.label, center.x - 50, center.y - 15, 100, 30, 18, level === "none" ? BLACK : "white");
  });
  ctx.restore();
}
function drawTimeTable(data) {
  const x = 614;
  const y = 220;
  const w = 558;
  const h = 565;
  roundRect(x, y, w, h, 14, "white", "#b6c9e8");
  roundRect(x, y, w, 52, 12, BLUE);
  centerText("오늘 주요 지역 체감온도 31℃ 이상 예상 시간", x, y, w, 52, 27, "white");

  const headerY = y + 52;
  const rowH = 57;
  ctx.fillStyle = "#f7f7f7";
  ctx.fillRect(x, headerY, w, 62);
  ctx.strokeStyle = GRID;
  ctx.strokeRect(x, headerY, w, 62);
  ctx.beginPath();
  ctx.moveTo(x + 178, headerY);
  ctx.lineTo(x + 178, y + h - 45);
  ctx.stroke();
  centerText("지역", x, headerY, 178, 62, 28);
  centerText("예상 시간 / 현재 / 최고", x + 178, headerY, w - 178, 62, 25);

  let yy = headerY + 62;
  data.primaryRegions.slice(0, 7).forEach((region) => {
    ctx.strokeStyle = GRID;
    ctx.strokeRect(x, yy, w, rowH);
    centerText(region.label, x, yy, 178, rowH, 27);
    const windowText = region.from ? `${region.from} ~ ${region.to}` : "미예상";
    const value = `${windowText} / ${region.current.apparentC.toFixed(1)}℃ / ${region.maxApparent.toFixed(1)}℃`;
    centerText(value, x + 178, yy, w - 178, rowH, 21, region.from ? RED : BLACK);
    yy += rowH;
  });
  centerText("※ 기상 상황에 따라 변동될 수 있으며, 기온·습도 기반 계산값입니다.", x, y + h - 40, w, 34, 18);
}

function drawSafetyTable() {
  const x = 28;
  const y = 800;
  const w = 1144;
  roundRect(x, y, w, 576, 12, "white", "#ffb4a8");
  roundRect(x, y, w, 48, 12, BLUE);
  centerText("체감온도 단계별 안전조치 사항", x, y, w, 48, 36, "white");

  const cols = [x, x + 235, x + 520, x + w];
  const headerY = y + 48;
  ctx.fillStyle = "#0b5cb6";
  ctx.fillRect(x, headerY, w, 42);
  centerText("체감온도", cols[0], headerY, cols[1] - cols[0], 42, 23, "white");
  centerText("주요 증상", cols[1], headerY, cols[2] - cols[1], 42, 23, "white");
  centerText("안전조치 사항", cols[2], headerY, cols[3] - cols[2], 42, 23, "white");

  const rows = [
    ["31℃ 이상", YELLOW, BLACK, "열불쾌감 증가\n지속 시 피로감", ["수분 자주 섭취 (물, 이온음료 등)", "시원한 곳에서 휴식", "가벼운 옷차림 유지"]],
    ["33℃ 이상", ORANGE, "white", "두통, 어지러움,\n피로감 증가", ["무더위 시간대(14~17시) 야외활동 자제", "충분한 휴식과 수분 섭취", "동료 간 건강상태 수시 확인"]],
    ["35℃ 이상", "#ff5a1d", "white", "열탈진 위험 증가,\n집중력 저하", ["옥외작업 중지 시 Safety call 신고", "실내 또는 시원한 곳으로 이동", "작업 재개 전 건강상태 확인 필수"]],
    ["38℃ 이상", RED, "white", "열사병 위험 매우 높음,\n의식 저하 가능", ["즉시 작업 중단 및 119 신고 필요", "환자를 시원한 곳으로 이동 후 체온 낮추기", "의식 확인 및 응급조치 실시"]]
  ];

  let yy = y + 90;
  rows.forEach(([temp, color, textColor, symptom, actions]) => {
    ctx.strokeStyle = "#ff9f8e";
    ctx.strokeRect(x, yy, w, 104);
    ctx.fillStyle = color;
    ctx.fillRect(x, yy, 235, 104);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x + 50, yy + 52, 20, 0, Math.PI * 2);
    ctx.fill();
    centerText(temp, x + 82, yy, 142, 104, 35, textColor);
    centerText(symptom, cols[1], yy, cols[2] - cols[1], 104, 23);
    actions.forEach((line, index) => bullet(line, cols[2] + 30, yy + 16 + index * 28, 22, line.includes("Safety") ? RED : BLACK));
    yy += 104;
  });

  ctx.fillStyle = "#fff4f1";
  ctx.fillRect(x, yy, w, 110);
  ctx.strokeStyle = "#ff9f8e";
  ctx.strokeRect(x, yy, w, 110);
  centerText("!", x + 135, yy + 34, 80, 48, 36, RED);
  centerText("무더위 시간대 (14:00 ~ 17:00)에는\n불가피한 경우를 제외하고는 옥외작업을 중지해야 합니다!", x + 235, yy + 12, w - 260, 96, 29, RED);
}

function drawMeasurePanel() {
  const x = 28;
  const y = 1390;
  const w = 1144;
  roundRect(x, y, w, 262, 12, "white", "#8ccaa7");
  roundRect(x, y, w, 48, 12, GREEN);
  centerText("체감온도 측정 및 기록·관리 시행", x, y, w, 48, 36, "white");

  ctx.fillStyle = GREEN;
  ctx.fillRect(x + 20, y + 66, 140, 60);
  centerText("측정 시간", x + 20, y + 66, 140, 60, 28, "white");
  ["10시", "12시", "14시", "16시"].forEach((time, index) => {
    const cx = x + 230 + index * 105;
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, y + 92, 25, 0, Math.PI * 2);
    ctx.stroke();
    centerText(time, cx - 42, y + 120, 84, 38, 28, GREEN);
  });
  leftText("매일 10시, 12시, 14시, 16시", x + 630, y + 78, 22);
  leftText("체감온도 측정", x + 630, y + 110, 22);

  roundRect(x + 870, y + 64, 254, 146, 8, "#f3fff7", GREEN);
  centerText("체감온도\n자동계산기", x + 870, y + 68, 254, 54, 26, GREEN);
  centerText(DETAIL_URL.replace("https://", ""), x + 870, y + 184, 254, 24, 15, BLACK, 400);

  [
    "측정 장소 : 작업장 내 대표 지점(직사광선 피한 그늘에서 측정)",
    "측정 도구 : 온습도계 또는 옥외작업 시 자동 체감온도계 앱 사용",
    "기록 관리 : 측정값, 시간, 장소, 조치사항 등 기록 및 보관"
  ].forEach((line, index) => bullet(line, x + 30, y + 166 + index * 28, 19));
}

function drawFooter() {
  const x = 28;
  const y = 1665;
  const w = 1144;
  roundRect(x, y, w, 113, 10, "white", "#9dbbe8");
  ctx.fillStyle = BLUE;
  ctx.fillRect(x, y, 150, 113);
  centerText("건강한\n여름나기\n수칙", x, y, 150, 113, 28, "white");
  ["물 자주 마시기", "햇볕 차단하기", "시원한 옷 입기", "시원한 곳에서 쉬기", "동료의 건강 수시 확인"].forEach((item, index) => {
    const bx = x + 150 + index * 198;
    centerText(item, bx, y + 68, 198, 36, 18);
  });
  ctx.fillStyle = BLUE;
  ctx.fillRect(320, H - 24, 560, 24);
  centerText("안전은 선택이 아닌 필수입니다. 모두의 건강과 생명을 지킵시다!", 320, H - 24, 560, 24, 17, "white");
}

function drawPoster(data) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, W, H);
  drawHeader();
  drawMap(data);
  drawTimeTable(data);
  drawSafetyTable();
  drawMeasurePanel();
  drawFooter();
}

function findRegionData(regionDef) {
  if (!latestData) return null;
  return latestData.regions.find((region) => regionDef.stationNames.includes(region.name) || regionDef.stationNames.includes(region.label) || region.map === regionDef.key) || null;
}

function showRegionDetail(regionDef) {
  const region = findRegionData(regionDef);
  if (!region) return;
  const current = region.current;
  const windowText = region.from ? `${region.from} ~ ${region.to}` : "31℃ 이상 미예상";
  regionTitle.textContent = `${regionDef.label} 체감온도 현황`;
  regionSummary.innerHTML = `
    <strong>현재 ${current.time} 기준</strong><br>
    기온 ${current.temperatureC.toFixed(1)}℃ · 습도 ${current.humidityPct.toFixed(0)}% · 체감온도 <strong>${current.apparentC.toFixed(1)}℃</strong><br>
    31℃ 이상 예상 시간: <strong>${windowText}</strong> · 오늘 최고 <strong>${region.maxApparent.toFixed(1)}℃</strong>
  `;
  regionForecast.innerHTML = region.forecast.map((point) => `
    <div class="forecast-cell ${point.apparentC >= 31 ? "hot" : ""}">
      <strong>${point.time}</strong>
      <span>${point.apparentC.toFixed(1)}℃</span>
      <small>${point.temperatureC.toFixed(1)}℃ / ${point.humidityPct.toFixed(0)}%</small>
    </div>
  `).join("");
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function hitTestMap(point) {
  return MAP_REGIONS.find((region) => pointInPolygon(point, region.points));
}
canvas.addEventListener("click", (event) => {
  const hit = hitTestMap(canvasPoint(event));
  if (hit) showRegionDetail(hit);
});

canvas.addEventListener("mousemove", (event) => {
  canvas.style.cursor = hitTestMap(canvasPoint(event)) ? "pointer" : "default";
});

async function loadWeather() {
  statusEl.className = "status";
  statusEl.textContent = "기상청 현재 실황을 불러오는 중입니다.";
  refreshBtn.disabled = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch("/.netlify/functions/weather", { cache: "no-store", signal: controller.signal });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`서버 응답을 JSON으로 읽을 수 없습니다. 응답 앞부분: ${text.slice(0, 120)}`);
      }
    }
    if (!response.ok) throw new Error(data?.error || `서버 오류 ${response.status}: 응답 내용이 비어 있습니다.`);
    if (!data) throw new Error("서버 응답이 비어 있습니다. Netlify Function 실행 시간 초과 가능성이 큽니다.");
    latestData = data;
    drawPoster(data);
    statusEl.textContent = `${data.generatedAtText} 기준 · ${data.source}`;
    showRegionDetail(MAP_REGIONS[0]);
  } catch (error) {
    const message = error.name === "AbortError"
      ? "기상청 데이터 조회가 25초를 넘겨 중단되었습니다. 잠시 후 새로고침하거나 Netlify Function 로그를 확인하세요."
      : error.message;
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
  centerText("기상청 데이터 조회 실패", 0, 760, W, 60, 48, RED);
  centerText(message, 120, 840, W - 240, 120, 27, BLACK, 700, 1.25);
  centerText("Netlify 환경변수 KMA_SERVICE_KEY와 API 활용 승인을 확인하세요.", 120, 980, W - 240, 60, 27);
}

function regionShareLine(regionName, label) {
  const region = latestData?.regions.find((item) => item.name === regionName || item.label === label || item.map === label);
  if (!region) return null;
  const windowText = region.from ? `${region.from}~${region.to}` : "31℃ 이상 미예상";
  return {
    sortValue: region.maxApparent,
    text: `${label}: 현재 ${region.current.apparentC.toFixed(1)}℃, 최고 ${region.maxApparent.toFixed(1)}℃, 31℃ 이상 ${windowText}`
  };
}

function buildCopyText() {
  if (!latestData) return "기상청 데이터를 아직 불러오지 못했습니다.";
  const lines = [
    regionShareLine("서울", "서울"),
    regionShareLine("수원", "경기"),
    regionShareLine("인천", "인천")
  ].filter(Boolean).sort((a, b) => b.sortValue - a.sortValue).map((item, index) => `${index + 1}. ${item.text}`);

  return [
    `[폭염특보 및 체감온도 안내]`,
    `${latestData.generatedAtText} 기준`,
    "",
    `서울/경기/인천 체감온도 높은 지역 순`,
    ...lines,
    "",
    `옥외작업 안전조치 사항`,
    `- 물, 이온음료 등 수분을 자주 섭취하세요.`,
    `- 시원한 곳에서 충분히 휴식하세요.`,
    `- 무더위 시간대(14~17시) 야외활동과 옥외작업을 자제하세요.`,
    `- 두통, 어지러움, 피로감이 있으면 즉시 작업을 중단하고 건강상태를 확인하세요.`,
    "",
    `체감온도 자동계산기: ${DETAIL_URL}`
  ].join("\n");
}

async function copyHeatText() {
  const text = buildCopyText();
  try {
    await navigator.clipboard.writeText(text);
    statusEl.className = "status";
    statusEl.textContent = "서울/경기/인천 체감온도 요약과 안전조치 사항을 복사했습니다. 카톡에 붙여넣어 공유하세요.";
  } catch {
    window.prompt("아래 내용을 복사해 카톡에 붙여넣으세요.", text);
  }
}
copyTextBtn.addEventListener("click", copyHeatText);
refreshBtn.addEventListener("click", loadWeather);
downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  link.download = `heatwave-poster-${stamp}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

loadWeather();
