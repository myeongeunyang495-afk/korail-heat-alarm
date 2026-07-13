const DETAIL_URL = "https://heat-safety-app.netlify.app/";
const canvas = document.querySelector("#poster");
const ctx = canvas.getContext("2d");
const statusEl = document.querySelector("#status");
const refreshBtn = document.querySelector("#refreshBtn");
const downloadBtn = document.querySelector("#downloadBtn");

const W = 1200;
const H = 1800;
const BLUE = "#063f93";
const NAVY = "#06255b";
const RED = "#e00000";
const ORANGE = "#ff9800";
const GREEN = "#08733c";
const BLACK = "#111111";
const GRID = "#c9d6ea";

const POSITIONS = {
  "서울": [380, 392], "인천": [315, 430], "경기": [390, 460],
  "강원(영서)": [505, 382], "강원(영동)": [640, 392], "충남": [340, 548],
  "세종": [405, 535], "대전": [425, 585], "충북": [515, 515],
  "경북": [655, 610], "대구": [610, 710], "울산": [720, 735],
  "부산": [680, 795], "경남": [545, 780], "전북": [390, 715],
  "광주": [360, 835], "전남": [365, 910], "제주": [178, 1058]
};

function font(size, weight = 700) {
  return `${weight} ${size}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
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

function centerText(text, x, y, w, h, size, color = BLACK, weight = 700) {
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const [index, line] of String(text).split("\n").entries()) {
    const lines = String(text).split("\n");
    ctx.fillText(line, x + w / 2, y + h / 2 + (index - (lines.length - 1) / 2) * size * 1.25);
  }
}

function leftText(text, x, y, size, color = BLACK, weight = 700) {
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
}

function drawHeader(data) {
  roundRect(28, 22, 302, 54, 28, BLUE);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(58, 46, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(58, 46); ctx.lineTo(58, 37); ctx.moveTo(58, 46); ctx.lineTo(66, 52); ctx.stroke();
  leftText("매일 오전 10시 발송", 84, 31, 30, "white");
  centerText("폭염으로부터 건강을 지키세요!", 330, 14, 520, 60, 38, NAVY);
  leftText("폭염특보 및 체감온도 안내", 74, 86, 88, RED);
  centerText(`한국 시각 기준  |  오늘 날짜 : ${data.titleDate} ${data.issuedAt} 발표`, 0, 196, W, 44, 30);

  const sx = 1058, sy = 92;
  ctx.fillStyle = "#ffc21a";
  ctx.beginPath(); ctx.arc(sx, sy, 72, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#f5a400"; ctx.lineWidth = 6;
  [[0,-105],[75,-75],[105,0],[75,75],[0,105],[-75,75],[-105,0],[-75,-75]].forEach(([dx, dy]) => {
    ctx.beginPath(); ctx.moveTo(sx + dx * .75, sy + dy * .75); ctx.lineTo(sx + dx, sy + dy); ctx.stroke();
  });
  roundRect(sx - 58, sy - 30, 50, 37, 10, "#222");
  roundRect(sx + 8, sy - 30, 50, 37, 10, "#222");
  ctx.strokeStyle = BLACK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(sx, sy + 8, 36, 0.2, Math.PI - 0.2); ctx.stroke();
}

function drawMap(data) {
  const x = 28, y = 245, w = 568, h = 540;
  roundRect(x, y, w, h, 14, "white", "#b6c9e8");
  roundRect(x, y, w, 52, 12, BLUE);
  centerText("오늘 체감온도 기반 폭염특보 예상 지역", x, y, w, 52, 29, "white");
  [["폭염경보", RED], ["폭염주의보", ORANGE], ["특보 없음", "#eeeeee"]].forEach(([label, color], i) => {
    const yy = y + 88 + i * 42;
    ctx.fillStyle = color; ctx.strokeStyle = "#777"; ctx.lineWidth = 1;
    ctx.fillRect(52, yy, 26, 24); ctx.strokeRect(52, yy, 26, 24);
    leftText(label, 92, yy - 3, 24, BLACK, 700);
  });
  for (const [name, [cx, cy]] of Object.entries(POSITIONS)) {
    const level = data.map?.[name] || "none";
    const fill = level === "warning" ? RED : level === "advisory" ? ORANGE : "#eeeeee";
    if (name === "제주") {
      ctx.fillStyle = fill; ctx.strokeStyle = "white"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, 64, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      centerText(name, cx - 58, cy - 28, 116, 58, 24, level === "none" ? BLACK : "white");
    } else {
      const rw = name.includes("강원") ? 118 : 96;
      roundRect(cx - rw / 2, cy - 38, rw, 76, 18, fill, "white", 3);
      centerText(name, cx - rw / 2, cy - 38, rw, 76, 23, level === "none" ? BLACK : "white");
    }
  }
}

function drawTable(data) {
  const x = 614, y = 245, w = 558, h = 540;
  roundRect(x, y, w, h, 14, "white", "#b6c9e8");
  roundRect(x, y, w, 52, 12, BLUE);
  centerText("주요 지역 체감온도 31℃ 이상 예상 시간", x, y, w, 52, 29, "white");
  ctx.fillStyle = "#f7f7f7"; ctx.fillRect(x, y + 52, w, 62);
  ctx.strokeStyle = GRID; ctx.strokeRect(x, y + 52, w, 62);
  ctx.beginPath(); ctx.moveTo(x + 178, y + 52); ctx.lineTo(x + 178, y + h - 45); ctx.stroke();
  centerText("지역", x, y + 52, 178, 62, 30);
  centerText("예상 시간 / 현재 / 최고", x + 178, y + 52, w - 178, 62, 27);
  let yy = y + 114;
  data.primaryRegions.forEach((region) => {
    ctx.strokeStyle = GRID; ctx.strokeRect(x, yy, w, 57);
    centerText(region.label, x, yy, 178, 57, 28);
    const window = region.from ? `${region.from} ~ ${region.to}` : "미예상";
    const value = `${window} / ${region.current.apparentC.toFixed(1)}℃ / ${region.maxApparent.toFixed(1)}℃`;
    centerText(value, x + 178, yy, w - 178, 57, 22, region.from ? RED : BLACK);
    yy += 57;
  });
  centerText("※ 기상청 현재 실황과 오늘 단기예보 기온·습도 기반 자동 계산", x, y + h - 42, w, 36, 20);
}

function drawSafety() {
  const x = 28, y = 800, w = 1144;
  roundRect(x, y, w, 576, 12, "white", "#ffb4a8");
  roundRect(x, y, w, 48, 12, BLUE);
  centerText("체감온도 단계별 안전조치 사항", x, y, w, 48, 38, "white");
  ctx.fillStyle = "#0b5cb6"; ctx.fillRect(x, y + 48, w, 42);
  ["체감온도", "주요 증상", "안전조치 사항"].forEach((t, i) => centerText(t, [x, x + 235, x + 520][i], y + 48, [235, 285, 624][i], 42, 24, "white"));
  const rows = [
    ["31℃ 이상", "#ffd33d", "열불쾌감 증가\n지속 시 피로감", "수분 자주 섭취, 시원한 곳에서 휴식\n가벼운 옷차림 유지"],
    ["33℃ 이상", "#ff9e1b", "두통, 어지러움,\n피로감 증가", "무더위 시간대(14~17시) 야외활동 자제\n충분한 휴식과 수분 섭취"],
    ["35℃ 이상", "#ff5a1d", "열탈진 위험 증가,\n집중력 저하", "옥외작업 중지 시 Safety call 신고\n실내 또는 시원한 곳으로 이동"],
    ["38℃ 이상", "#e21a1a", "열사병 위험 매우 높음,\n의식 저하 가능", "즉시 작업 중단 및 119 신고 필요\n환자를 시원한 곳으로 이동 후 체온 낮추기"]
  ];
  let yy = y + 90;
  rows.forEach(([temp, color, symptom, action]) => {
    ctx.strokeStyle = "#ff9f8e"; ctx.strokeRect(x, yy, w, 104);
    ctx.fillStyle = color; ctx.fillRect(x, yy, 235, 104);
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(x + 51, yy + 52, 20, 0, Math.PI * 2); ctx.fill();
    centerText(temp, x + 78, yy, 157, 104, 38, ["#ff5a1d", "#e21a1a"].includes(color) ? "white" : BLACK);
    symptom.split("\n").forEach((line, i) => centerText(line, x + 235, yy + 18 + i * 34, 285, 34, 24));
    action.split("\n").forEach((line, i) => leftText(`• ${line}`, x + 550, yy + 20 + i * 34, 24, line.includes("Safety") ? RED : BLACK));
    yy += 104;
  });
  ctx.fillStyle = "#fff4f1"; ctx.fillRect(x, yy, w, 110); ctx.strokeStyle = "#ff9f8e"; ctx.strokeRect(x, yy, w, 110);
  centerText("!", 150, yy + 28, 80, 60, 38, RED);
  centerText("무더위 시간대 (14:00 ~ 17:00)에는\n불가피한 경우를 제외하고는 옥외작업을 중지해야 합니다!", 250, yy + 12, w - 270, 96, 30, RED);
}

function drawMeasureAndFooter() {
  const x = 28, y = 1390, w = 1144;
  roundRect(x, y, w, 262, 12, "white", "#8ccaa7");
  roundRect(x, y, w, 48, 12, GREEN);
  centerText("체감온도 측정 및 기록·관리 시행", x, y, w, 48, 38, "white");
  ctx.fillStyle = GREEN; ctx.fillRect(x + 20, y + 66, 140, 60);
  centerText("측정 시간", x + 20, y + 66, 140, 60, 30, "white");
  ["10시", "12시", "14시", "16시"].forEach((t, i) => {
    const cx = x + 230 + i * 105;
    ctx.strokeStyle = GREEN; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, y + 93, 25, 0, Math.PI * 2); ctx.stroke();
    centerText(t, cx - 42, y + 120, 84, 38, 30, GREEN);
  });
  leftText("매일 10시, 12시, 14시, 16시", 650, y + 78, 24);
  leftText("체감온도 측정", 650, y + 110, 24);
  roundRect(948, y + 64, 206, 146, 8, "#f3fff7", GREEN);
  centerText("실시간 현황\n자세히 보기", 948, y + 68, 206, 54, 26, GREEN);
  centerText(DETAIL_URL.replace("https://", ""), 948, y + 184, 206, 24, 16, BLACK, 400);
  if (window.QRCode) {
    const qrCanvas = document.createElement("canvas");
    QRCode.toCanvas(qrCanvas, DETAIL_URL, { width: 76, margin: 1, errorCorrectionLevel: "M" }, () => {
      ctx.drawImage(qrCanvas, 1013, y + 112, 76, 76);
    });
  }
  [
    "측정 장소 : 작업장 내 대표 지점(직사광선 피한 그늘에서 측정)",
    "측정 도구 : 온습도계 또는 옥외작업 시 자동 체감온도계 앱 사용",
    "기록 관리 : 측정값, 시간, 장소, 조치사항 등 기록 및 보관"
  ].forEach((b, i) => leftText(`• ${b}`, 58, y + 166 + i * 28, 20, BLACK, 600));

  const fy = 1665;
  roundRect(28, fy, 1144, 113, 10, "white", "#9dbbe8");
  ctx.fillStyle = BLUE; ctx.fillRect(28, fy, 150, 113);
  centerText("건강한\n여름나기\n수칙", 28, fy, 150, 113, 28, "white");
  ["물 자주 마시기", "햇볕 차단하기", "시원한 옷 입기", "시원한 곳에서 쉬기", "동료의 건강 수시 확인"].forEach((item, i) => centerText(item, 178 + i * 198, fy + 66, 198, 39, 19));
  ctx.fillStyle = BLUE; ctx.fillRect(320, H - 24, 560, 24);
  centerText("안전은 선택이 아닌 필수입니다. 모두의 건강과 생명을 지킵시다!", 320, H - 24, 560, 24, 18, "white");
}

function drawPoster(data) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = BLACK; ctx.lineWidth = 3; ctx.strokeRect(0, 0, W, H);
  drawHeader(data);
  drawMap(data);
  drawTable(data);
  drawSafety();
  drawMeasureAndFooter();
}

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
    drawPoster(data);
    statusEl.textContent = `${data.generatedAtText} 기준 · ${data.source}`;
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
  centerText("기상청 데이터 조회 실패", 0, 760, W, 60, 48, RED);
  centerText(message, 120, 840, W - 240, 80, 28, BLACK);
  centerText("Netlify 환경변수 KMA_SERVICE_KEY와 API 활용 승인을 확인하세요.", 120, 930, W - 240, 60, 28, BLACK);
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
