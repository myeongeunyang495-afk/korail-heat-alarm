# 폭염 알리미 웹앱

기상청 현재 실황과 오늘 예보를 기반으로 폭염특보 및 체감온도 안내 포스터를 생성하는 Netlify 배포용 웹앱입니다.

## 핵심 기능

- 기상청 `getUltraSrtNcst` 초단기실황에서 현재 기온 `T1H`, 습도 `REH` 조회
- 기상청 `getVilageFcst` 단기예보에서 오늘 시간대별 기온 `TMP`, 습도 `REH` 조회
- 기온·상대습도 기반 체감온도 계산
- 주요 지역별 현재 체감온도, 최고 체감온도, 31℃ 이상 예상 시간 표시
- 공유용 PNG 포스터 저장
- 포스터 내 옥외작업 체감온도 자동계산기 링크 및 QR 포함: https://heat-safety-app.netlify.app/

## 로컬 실행

Netlify CLI를 사용할 경우:

```powershell
npm install
$env:KMA_SERVICE_KEY="공공데이터포털_서비스키"
npm run dev
```

정확한 운영 포스터는 `KMA_SERVICE_KEY`가 있어야 생성됩니다. 키가 없거나 API 응답이 실패하면 포스터 대신 오류가 표시됩니다.

## Netlify 배포

1. GitHub 저장소에 이 폴더를 push합니다.
2. Netlify에서 GitHub 저장소를 연결합니다.
3. Build command는 `npm run build`, Publish directory는 `.` 입니다.
4. Netlify Site settings에서 환경변수 `KMA_SERVICE_KEY`를 등록합니다.
5. 배포 후 웹앱에서 `데이터 새로고침`을 눌러 기상청 응답을 확인합니다.

## 데이터 출처

공공데이터포털 `기상청_단기예보 조회서비스`를 사용합니다.

- 현재 기온/습도: `getUltraSrtNcst` 초단기실황 `T1H`, `REH`
- 오늘 시간대별 예상 기온/습도: `getVilageFcst` 단기예보 `TMP`, `REH`

## 체감온도 기준

1. 기온과 상대습도로 습구온도를 추정합니다.
2. 여름철 체감온도식을 적용합니다.
3. 체감온도 31℃ 이상인 첫 시각과 마지막 시각을 표에 표시합니다.
4. 지도 색상은 오늘 최고 체감온도 기준으로 자동 분류합니다.
   - 35℃ 이상: 폭염경보
   - 33℃ 이상: 폭염주의보
   - 33℃ 미만: 특보 없음

## 보안 메모

기상청 API 키는 브라우저 코드에 넣지 않습니다. 반드시 Netlify 환경변수 `KMA_SERVICE_KEY`에만 저장하세요.
