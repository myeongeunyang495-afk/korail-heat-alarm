const DETAIL_URL = "https://heat-safety-app.netlify.app/";
const canvas = document.querySelector("#poster");
const ctx = canvas.getContext("2d");
const statusEl = document.querySelector("#status");
const refreshBtn = document.querySelector("#refreshBtn");
const downloadBtn = document.querySelector("#downloadBtn");
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

const MAP_OFFSET = { x: -70, y: -55 };
const MAP_REGIONS = [
  { key: "서울", label: "서울", stationNames: ["서울"], x: 315, y: 370, w: 74, h: 58 },
  { key: "인천", label: "인천", stationNames: ["인천"], x: 245, y: 405, w: 74, h: 58 },
  { key: "경기", label: "경기", stationNames: ["수원"], x: 330, y: 440, w: 92, h: 72 },
  { key: "강원(영서)", label: "강원(영서)", stationNames: ["춘천"], x: 430, y: 360, w: 132, h: 72 },
  { key: "강원(영동)", label: "강원(영동)", stationNames: ["강릉"], x: 560, y: 375, w: 132, h: 72 },
  { key: "충남", label: "충남", stationNames: ["천안"], x: 270, y: 560, w: 110, h: 76 },
  { key: "세종", label: "세종", stationNames: ["세종"], x: 372, y: 535, w: 78, h: 56 },
  { key: "대전", label: "대전", stationNames: ["대전"], x: 395, y: 605, w: 84, h: 58 },
  { key: "충북", label: "충북", stationNames: ["청주"], x: 492, y: 530, w: 112, h: 84 },
  { key: "경북", label: "경북", stationNames: ["안동"], x: 625, y: 640, w: 132, h: 122 },
  { key: "대구", label: "대구", stationNames: ["대구"], x: 585, y: 745, w: 88, h: 58 },
  { key: "울산", label: "울산", stationNames: ["울산"], x: 705, y: 765, w: 88, h: 58 },
  { key: "부산", label: "부산", stationNames: ["부산"], x: 675, y: 835, w: 88, h: 58 },
  { key: "경남", label: "경남", stationNames: ["창원"], x: 535, y: 825, w: 140, h: 92 },
  { key: "전북", label: "전북", stationNames: ["전주"], x: 370, y: 735, w: 126, h: 86 },
  { key: "광주", label: "광주", stationNames: ["광주"], x: 335, y: 850, w: 86, h: 58 },
  { key: "전남", label: "전남", stationNames: ["목포"], x: 350, y: 950, w: 150, h: 92 },
  { key: "제주", label: "제주", stationNames: ["제주"], x: 152, y: 1055, w: 126, h: 58, island: true }
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
    const offset = (index - (lines.length - 1) / 2) * size * lineHeight;
    ctx.fillText(line, x + w / 2, y + h / 2 + offset);
  });
}

function leftText(text, x, y, size, color = BLACK, weight = 700) {
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
}

function bullet(text, x, y, size = 24, color = BLACK) {
  leftText(`• ${text}`, x, y, size, color, 700);
}

function drawSun() {
  const sx = 1058;
  const sy = 92;
  ctx.fillStyle = "#ffc21a";
  ctx.beginPath();
  ctx.arc(sx, sy, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f5a400";
  ctx.lineWidth = 6;
  [[0, -105], [75, -75], [105, 0], [75, 75], [0, 105], [-75, 75], [-105, 0], [-75, -75]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(sx + dx * 0.74, sy + dy * 0.74);
    ctx.lineTo(sx + dx, sy + dy);
    ctx.stroke();
  });
  roundRect(sx - 58, sy - 30, 50, 37, 10, "#222");
  roundRect(sx + 8, sy - 30, 50, 37, 10, "#222");
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(sx, sy + 8, 36, 0.2, Math.PI - 0.2);
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
  centerText("폭염으로부터 건강을 지키세요!", 332, 14, 520, 58, 38, DARK_BLUE);
  leftText("폭염특보 및 체감온도 안내", 74, 86, 84, RED);
  drawSun();
}

function drawMap(data) {
  const x = 28;
  const y = 220;
  const w = 568;
  const h = 565;
  roundRect(x, y, w, h, 14, "white", "#b6c9e8");
  roundRect(x, y, w, 52, 12, BLUE);
  centerText("24시간 내 폭염특보 예상 지역", x, y, w, 52, 36, "white");

  [["폭염경보", RED], ["폭염주의보", ORANGE], ["특보 없음", "#eeeeee"]].forEach(([label, color], i) => {
    const yy = y + 86 + i * 42;
    ctx.fillStyle = color;
    ctx.fillRect(52, yy, 26, 24);
    ctx.strokeStyle = "#777";
    ctx.strokeRect(52, yy, 26, 24);
    leftText(label, 92, yy - 2, 23);
  });

  ctx.save();
  ctx.translate(MAP_OFFSET.x, MAP_OFFSET.y - 25);
  MAP_REGIONS.forEach((region) => {
    const level = data.map?.[region.key] || "none";
    const fill = colorForLevel(level);
    if (region.island) {
      ctx.fillStyle = fill;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(region.x + region.w / 2, region.y + region.h / 2, region.w / 2, region.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      roundRect(region.x, region.y, region.w, region.h, 16, fill, "white", 3);
    }
    centerText(region.label, region.x, region.y, region.w, region.h, 23, level === "none" ? BLACK : "white");
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
  centerText("오늘 주요 지역 체감온도 31℃ 이상 예상 시간", x, y, w, 52, 28, "white");

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
  centerText("예상 시간 / 현재 / 최고", x + 178, headerY, w - 178, 62, 26);

  let yy = headerY + 62;
  data.primaryRegions.slice(0, 7).forEach((region) => {
    ctx.strokeStyle = GRID;
    ctx.strokeRect(x, yy, w, rowH);
    centerText(region.label, x, yy, 178, rowH, 28);
    const windowText = region.from ? `${region.from} ~ ${region.to}` : "미예상";
    const value = `${windowText} / ${region.current.apparentC.toFixed(1)}℃ / ${region.maxApparent.toFixed(1)}℃`;
    centerText(value, x + 178, yy, w - 178, rowH, 22, region.from ? RED : BLACK);
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
  ctx.strokeStyle = RED;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + 175, yy + 22);
  ctx.lineTo(x + 132, yy + 88);
  ctx.lineTo(x + 218, yy + 88);
  ctx.closePath();
  ctx.stroke();
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
    ctx.beginPath();
    ctx.moveTo(cx, y + 92);
    ctx.lineTo(cx, y + 76);
    ctx.moveTo(cx, y + 92);
    ctx.lineTo(cx + 13, y + 102);
    ctx.stroke();
    centerText(time, cx - 42, y + 120, 84, 38, 28, GREEN);
  });
  leftText("매일 10시, 12시, 14시, 16시", x + 630, y + 78, 22);
  leftText("체감온도 측정", x + 630, y + 110, 22);

  roundRect(x + 870, y + 64, 254, 146, 8, "#f3fff7", GREEN);
  centerText("실시간 현황\n자세히 보기", x + 870, y + 68, 254, 54, 26, GREEN);
  centerText(DETAIL_URL.replace("https://", ""), x + 870, y + 184, 254, 24, 15, BLACK, 400);
  if (window.QRCode) {
    const qrCanvas = document.createElement("canvas");
    QRCode.toCanvas(qrCanvas, DETAIL_URL, { width: 74, margin: 1, errorCorrectionLevel: "M" }, () => {
      ctx.drawImage(qrCanvas, x + 960, y + 112, 74, 74);
    });
  }

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
  return MAP_REGIONS.find((region) => {
    const x = region.x + MAP_OFFSET.x;
    const y = region.y + MAP_OFFSET.y - 25;
    return point.x >= x && point.x <= x + region.w && point.y >= y && point.y <= y + region.h;
  });
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

refreshBtn.addEventListener("click", loadWeather);
downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  link.download = `heatwave-poster-${stamp}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

loadWeather();
