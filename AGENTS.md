# AGENTS.md — AI 개발 지침

이 문서는 이 프로젝트를 개발하는 AI 에이전트에게 제공하는 지침입니다.

## 기술 제약

- **HTML / CSS / JavaScript만 사용** (프레임워크·라이브러리 금지. React, Vue, jQuery, 부트스트랩 등 사용 금지)
- 별도 백엔드·서버 없이 **브라우저 localStorage**에 데이터를 저장
- 단일 페이지(SPA) 구조로, 관리자 화면은 **탭/버튼으로 전환**

## 프로젝트 구조

```
index.html        # 메인 HTML (고객 화면 + 관리자 화면 + footer)
css/style.css     # 전체 스타일
js/app.js         # 메뉴/장바구니/주문/관리자 로직
images/           # 메뉴 이미지(SVG)
PRD.md            # 기획 문서
AGENTS.md         # 본 지침
PROMPTS.md        # 사용한 프롬프트 기록
README.md         # 앱 소개/사용법/배포 URL
```

## 데이터 모델 (localStorage 키)

- `cafe_menu`: 메뉴 배열 `{ id, name, price, stock, soldOut, img }`
- `cafe_cart`: 장바구니 배열 `{ menuId, name, options: { shot, syrup }, unitPrice, qty }`
- `cafe_orders`: 주문 배열 `{ id, items, total, time, status }`
  - `status`: `"접수"` → `"제조완료"`

## 기능 요구사항

1. 음료 5종 (아메리카노 4000 / 카페라떼 4500 / 바닐라라떼 5000 / 카푸치노 4800 / 녹차라떼 5200)
2. 옵션: 샷 추가(+500원), 시럽 추가(+0원)
3. 장바구니: 담기(동일 항목 수량 증가)·수량 조절·삭제·합계
4. 주문: 재고 차감, 재고 0 시 품절 처리 및 주문 차단
5. 관리자 대시보드: 주문 현황 + 제조 완료 처리 / 재고 현황 + 보충·초기화
6. footer에 학부/학과·학번·이름 표시

## 코딩 규칙

- 변수/함수명은 camelCase, 의미 있게 작성
- 주석은 간결하게 핵심 로직만
- 모든 화면 상태는 localStorage와 동기화
- 에러 상황(품절, 빈 장바구니 등)은 사용자에게 안내 문구 표시

## 커밋 규칙

- 커밋 메시지는 한국어로 `타입: 설명` 형식
- 순서: 기획(docs) → 개발(feat) → 보완(fix) → 배포(docs)
- 총 5회 이상, 의미 있는 메시지
