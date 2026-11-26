# CarTrace

스마트 중고차 수출 ERP 시스템의 업무 흐름 프로토타입입니다.

중고차 수출 거래에서 영업팀의 빠른 진행과 회계팀의 리스크 통제를 함께 달성하는 것을 목표로 합니다. 차량을 기준으로 `매입 → 재고 → 수출 준비 → 선적 → 증빙` 흐름을 확인하고, 권리 이상·금액 불일치·증빙 누락처럼 되돌리기 어려운 문제를 단계별로 통제합니다.

## Demo

- 배포: [cartrace-kappa.vercel.app](https://cartrace-kappa.vercel.app)
- 과제: [풀링포레스트 PM 과제](https://www.pooolingforest.com/careers/challenge)

## 주요 구현

- 차량별 업무 단계와 현재 위치 확인
- 차량명·VIN·담당자 검색 및 단계 필터
- 매입 유형별 필수 증빙 미리보기
- VIN 형식·중복 검증을 포함한 신규 차량 등록
- 압류·도난 및 선적 전 권리 재조회 하드 게이트
- 계약 금액·지급액 불일치 확인
- 증빙 파일 첨부와 차량별 미결 상태 반영
- 영업팀·회계팀 확인 필요 알림
- 승인 요청 → 검토자 승인·반려 → 상태 변경 이력
- 브라우저 새로고침 이후에도 유지되는 Mock 상태

이번 과제에서는 실제 외부 API, 데이터베이스, 파일 저장소는 사용하지 않고 JSON 성격의 Mock 데이터와 `localStorage`를 사용합니다.

## 기술 스택

- Vite
- React 19
- TypeScript
- Tailwind CSS v4 / CSS
- Vercel

Vercel에서 빠르게 빌드하고 배포해 과제 시연용 가안을 확인하는 것이 우선이므로 Vite 기반으로 구성했습니다. 현재 단계에서는 확장성보다 업무 로직과 UI/UX 검증 속도를 우선합니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`을 엽니다.

검증 명령:

```bash
npm run lint
npm run build
```

## 문서

프로젝트의 기획·업무 흐름·화면 범위는 [`document/`](./document/)에 정리되어 있습니다.

- [프로젝트 개요](./document/01-project-overview.md)
- [업무 흐름 및 검증 로직](./document/02-workflow-and-validation.md)
- [발표 핵심 메시지](./document/03-presentation-message.md)
- [핵심 기능 및 화면 범위](./document/04-features-and-screens.md)
- [솔루션 기획안](./document/submission-01-solution-plan.md)
- [핵심 기능 구현 범위](./document/submission-02-core-function-implementation.md)
- [기술 스택 결정](./document/tech-stack.md)

## 현재 구조와 확장 방향

현재는 과제 시연 속도를 위해 화면과 Mock 상태를 `src/main.tsx`에 모아 관리합니다. 실제 서비스로 확장할 때는 다음 기준으로 분리할 수 있습니다.

```text
src/
├── domain/       # 하드 게이트, 증빙, 승인·미결 판정 규칙
├── data/         # API 응답과 Mock 데이터 어댑터
├── components/   # 차량 목록, 상세, 알림, 승인 패널
└── pages/        # 차량 업무, 미결 알림 화면
```

도메인 규칙을 UI 컴포넌트에서 분리하면 실제 VIN 조회·환율·DB API를 연결할 때 화면 변경을 최소화할 수 있습니다. 다만 현재 과제 범위에서는 실제 백엔드 구축보다 회계팀이 업무 흐름과 통제 논리를 빠르게 검토할 수 있는 프론트엔드 구현을 우선했습니다.

## 범위

포함:

- 수출업체의 차량 단위 매입·재고·수출 준비·선적·증빙 흐름
- 영업팀과 회계팀의 확인 책임 구분
- 선적 전 하드 게이트와 선적 후 미결 증빙

제외:

- 실제 압류·도난 조회 API
- 실제 환율 API
- 운영 DB 및 사용자 인증
- 실제 파일 저장·바이러스 검사
- 국내 도매·기타 매출 관리
