# CLAUDE.md — Can I Eat This in Korea?

DGIST 2026-2 Introduction to Religion, G3 Group Assignment 2 (Taboos in Islam).
한국에 사는 무슬림이 한국 음식을 먹어도 되는지, 왜 그런지 보여주는 정적 웹페이지.
일정: 11/12 중간 발표, 11/26 최종 발표.

## 절대 원칙
- **모델은 음식 이름만 맞힌다. 종교적 판정은 하지 않는다.** 판정은 `RULES`(팀 규칙표) × 사용자 학파 설정으로만 한다.
- **외부 API·서버·키 없음.** 모든 처리는 브라우저 안에서. 사진 모델 파일만 Hugging Face/jsDelivr에서 받는다.
- **UI 언어는 영어.** 한국어는 음식 한글명과 식당 질문 카드에만 쓴다.
- 단일 파일 `index.html` 유지 (CSS·JS 인라인). 빌드 단계 없음. GitHub Pages(main, root)로 배포.

## 구조 (index.html 안)
| 이름 | 역할 |
|---|---|
| `RAW` | 100개 음식 재료 프로필. `한글|English|group|카테고리:재료:빈도(A/O/S):보이는지(1/0);...` |
| `ALIAS_RAW` | 영어·로마자 별칭. `matchDish()`가 정확 일치 → 포함 → 오타(레벤슈타인) 순으로 매칭 |
| `LEX`, `CUES`, `estimateFromName()` | 목록 밖 음식을 이름 단어로 추정 (low confidence 표시) |
| `RULES`, `SW`, `PRESETS` | 규칙표, 스위치 3개(seafood/meat/alcohol), 학파 프리셋. 칸마다 근거(꾸란·하디스) |
| `judgeIng()`, `judge()` | 합산 규칙: always+haram→Haram, often/sometimes+haram→Doubtful, doubtful→Doubtful |
| `VISION`, `EMB`, `classifyPhoto()` | SigLIP(Xenova/siglip-base-patch16-224, q4) 제로샷 분류. `EMB`는 미리 계산한 텍스트 임베딩(int8) |
| `PROTO`, `photoScores()` | 음식별 참고 사진 평균 임베딩(int8, 96개). 점수 = z(묘사) + w·z(참고 사진), 참고 사진 없는 음식은 묘사 점수만. `tau`는 후보 확률 온도 |

`EMB`·`PROTO` 줄은 손으로 고치지 말고 `tools/`에서 `npm run embed`·`npm run protos`로 다시 만든다.

## 도구 (tools/)
```bash
cd tools && npm install
npm run embed   # dishes.json의 묘사 → index.html의 EMB 재생성
npm run protos  # tools/ref-photos/<한글 음식명>/*.jpg → index.html의 PROTO 재생성 (w, tau는 유지)
npm run eval    # tools/eval-photos/<한글 음식명>/*.jpg 로 사진 정확도 측정 (페이지와 같은 점수, macro-F1 포함)
```
정확도가 바뀌면 `index.html`의 `VISION.test`와 README의 수치를 같이 갱신한다.
`tools/eval-photos/`, `tools/ref-photos/`는 커밋하지 않는다(.gitignore). 저작권 있는 사진을 저장소에 넣지 않는다.
참고 사진은 자유 라이선스(CC0, PD, CC BY, CC BY-SA)만 쓰고 출처를 `tools/ref-photos-sources.tsv`에 남긴다. 테스트 사진(eval-photos)과 겹치면 안 된다.

## 검증 (완료라고 말하기 전에)
1. 브라우저(가능하면 Playwright)로 `index.html`을 열어 콘솔 에러 0 확인.
2. 메뉴명: `kimchi jjigae`, `tteokboki`(오타), `pork kimchi stew`, `bulgogi pizza`(목록 밖) 판정이 나오는지.
3. 메뉴 목록: 여러 줄 붙여넣기 → 각 줄 판정.
4. 사진: 음식 사진 → 후보 3개, 음식 아닌 사진 → 거절 문구.
5. 설정 창에서 학파를 바꾸면 결과·통계가 다시 계산되는지.
6. 모바일 폭(390px)에서 레이아웃이 깨지지 않는지. 사진 탭을 연 상태도 확인한다.

## 커밋
- 메시지: `<type>: 한국어 요약` (feat/fix/docs/refactor/chore), 본문에 변경 목록과 검증 결과.
- main 강제 푸시 금지.
