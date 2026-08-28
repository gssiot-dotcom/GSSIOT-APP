# GSS IoT Mobile

Expo 54와 Expo Router 기반의 GSS IoT 조회 중심 모바일 앱입니다. 웹과 동일하게 GSS 관리자와 회사 사용자 인증을 분리하고, 백엔드가 계산한 권한과 회사·현장·건물 접근 범위를 사용합니다.

## 현재 제공 기능

- GSS 관리자 및 회사 사용자 로그인/세션/로그아웃
- 권한에 따른 홈·모니터링·알람·알림 탭 노출
- 회사 → 건설 현장 → 건물 → 노드 유형 → 개별 노드 상태 조회
- 플랫폼 매니저, 현장 매니저, 빌딩 매니저의 서버 범위에 따른 단계 구성
- GSS 관리자의 전체 회사·현장·건물 모니터링 탐색
- 범위가 적용된 알람·알림 목록 조회
- `alarms.acknowledge` 권한이 있을 때 알람 확인 처리
- 알림 모두 읽음
- 로딩·빈 화면·오류·권한 없음 상태
- 한국어 기본, 영어 선택

관리 기능과 데이터 변경 기능은 웹에서 수행하는 것을 기본으로 하며 앱은 대부분 조회 전용입니다.

## 데모 모드

최신 서버 환경변수가 없어도 로그인 화면 아래의 역할 버튼으로 앱을 확인할 수 있습니다.

- Platform Manager: 회사의 모든 현장과 건물
- Site Manager: 배정된 현장과 그 현장의 건물
- Building Manager: 직접 배정된 건물
- Viewer: 허용된 조회 범위
- No Permission: 기본 화면만 접근
- GSS 역할: 전체 회사 범위에서 권한에 맞는 탭

데모와 실제 서버는 같은 화면 및 데이터 계층을 사용합니다.

## 환경변수

```env
EXPO_PUBLIC_SERVER_BASE_URL=https://your-v3-api.example.com
EXPO_PUBLIC_SOCKET_BASE_URL=https://your-v3-api.example.com
EXPO_PUBLIC_DEMO_MODE=true
```

실제 운영 빌드에서는 `EXPO_PUBLIC_DEMO_MODE=false`로 설정합니다. 인증은 백엔드의 HttpOnly 쿠키, CSRF 토큰 및 회전형 refresh 세션 계약을 사용하므로 실제 Android/iOS 기기에서 쿠키 유지 동작을 검증해야 합니다.

## 서버 API 연결

- `/auth/csrf`, `/auth/company/login`, `/auth/gss/login`, `/auth/*/me`, `/auth/refresh`, `/auth/logout`
- `/company/areas`, `/company/buildings`, `/company/monitoring/history/options`
- `/admin/monitoring/history/options`
- 회사/GSS 건물 및 노드 유형 모니터링 API
- 회사/GSS 알람 및 알림 API

## 명령

```bash
npm run typecheck
npm run lint
npm run start
```
# Play Store production release

The production profile builds an Android App Bundle with demo mode disabled and both REST and Socket.IO pointed at `https://apiv3.infogssiot.com`.

```bash
eas build --platform android --profile production
eas submit --platform android --profile production
```

Before publishing, confirm that the EAS remote Android version code is higher than the currently published Play Store version code. The production profile uses `autoIncrement`, while the user-facing app version is maintained in `app.json`.

Production builds check Google Play for a newer version at startup. When an update is available, app access is blocked until the update flow completes. For the strongest Android immediate-update flow, publish critical releases with Play Console in-app update priority 4 or 5. Expo Go and development mode intentionally skip this check.
