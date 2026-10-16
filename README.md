# Utango · 노래로 배우는 일본어

좋아하는 일본 노래의 가사를 붙여넣으면 AI가 **나만의 단어장과 예문**을 만들어 주는 일본어 공부 앱이에요.
웹으로 쓸 수 있고, 휴대폰에서는 홈 화면에 추가해서 앱처럼 쓸 수 있어요(PWA).

## 기능

- **후리가나 가사**: 붙여넣은 가사를 형태소 분석(kuromoji)해서 한자 위에 읽기를 달아 줘요. 켜고 끌 수 있어요.
- **AI 단어장**: 내 수준(입문·N5~N1)에 맞춰 노래에서 공부할 단어를 골라 뜻, 품사, JLPT 레벨, 노래 속 뉘앙스를 정리해요.
- **예문**: 단어마다 노래와 같은 의미로 쓰인 예문 2개와 한국어 번역(후리가나 포함)을 만들어요.
- **문법 포인트**: 노래에 나온 문법 패턴 3~6개를 해당 가사 줄과 함께 설명해요.
- **한 줄 해설**: 가사 줄 옆 ✦ 를 누르면 그 줄의 해석과 끊어 읽기를 보여줘요.
- **학습 카드**: 간격 반복(SM-2 방식)으로 다시 볼 때를 잡아요. 카드 앞면에 그 단어가 나온 **가사 한 줄**이, 뒷면에 그 줄의 해석이 나와요. 답은 다시 · 이해 · 완벽 세 가지예요.
- **기억 단계**: 이해·완벽을 한 번이라도 고르면 **단기기억**, 완벽을 3번 연달아 고르거나 다음 학습이 3주 넘게 밀리면 **장기기억**으로 옮겨져요(직접 옮길 수도 있어요). 노래마다 진척도 막대에 두 단계를 색을 달리해 보여 줘요.
- **학습 범위·양**: 모은 단어 전체나 노래 하나를 골라 학습하고, 하루에 새로 배울 단어 수를 정할 수 있어요.
- **커버**: 노래마다 사진을 넣을 수 있고, 없으면 노래마다 정해진 그라데이션 그림이 나와요.
- **데모곡**: 처음 열면 이 앱용으로 새로 쓴 데모곡이 들어 있어서 API 키 없이도 모든 화면을 둘러볼 수 있어요.

- **발음 듣기**: 단어·예문·가사 줄을 기기의 일본어 음성으로 읽어 줘요. 뜻을 볼 때 자동으로 읽어 주게 할 수도 있어요.
- **한자 풀이**: 단어에 들어 있는 한자마다 훈음(별 성), 상용한자 여부·학년, 획수, 음독·훈독, 내 단어장의 같은 한자 단어를 보여 줘요.
- **문제 유형**: 뜻 떠올리기, 뜻 보고 단어 고르기, 가사 빈칸, 읽는 법 쓰기를 섞어서 내요.
- **백업**: 학습 기록을 파일로 내보내고 다시 불러올 수 있어요.
- **로그인 · 동기화**: Google·카카오로 로그인하면 기록이 계정에 저장돼 여러 기기에서 이어서 써요. 초대 링크를 받은 사람만 가입할 수 있어요.

로그인하지 않으면 가사와 학습 기록은 **사용하는 기기의 브라우저에만 저장**돼요. 로그인하면 그 사람 계정에만 저장되고 다른 사람에게는 보이지 않아요. 가사는 단어장을 만들 때만 서버를 거쳐 AI에 보내져요.

## 로컬에서 실행

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY 입력
npm run dev                  # http://localhost:3000
```

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm test` | 단위 테스트 (vitest). `TEST_DATABASE_URL`을 주면 DB 테스트도 돌아요 |
| `npm run lint` | ESLint |
| `npm run demo` | `scripts/demo-source.ts`를 고친 뒤 데모곡 데이터 다시 생성 |

## 배포 (Vercel 추천)

1. [vercel.com](https://vercel.com)에서 GitHub로 로그인 → **Add New → Project** → 이 레포 선택
2. **Environment Variables**에 `ANTHROPIC_API_KEY` 추가 (키는 [console.anthropic.com](https://console.anthropic.com)에서 발급)
3. **Deploy** → 나온 주소를 휴대폰에서 열고 공유 메뉴의 **홈 화면에 추가**

## 환경 변수

| 이름 | 필수 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API 키. 없으면 후리가나 가사와 데모곡만 동작해요. |
| `CLAUDE_MODEL` | | 기본값 `claude-opus-5-5`. 비용을 줄이려면 `claude-sonnet-5-5`나 `claude-haiku-5-5`로 바꿀 수 있어요. |
| `DATABASE_URL` | 로그인 | Postgres 주소. Vercel에서 Neon을 연결하면 자동으로 들어가요. 처음 쓸 때 테이블을 알아서 만들어요. |
| `APP_URL` | 로그인 | 앱 주소 (예: `https://utango.vercel.app`). Google·카카오에 등록한 돌아올 주소와 맞춰요. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 로그인 | Google OAuth 클라이언트 (웹). 돌아올 주소: `{APP_URL}/api/auth/google/callback` |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` | 로그인 | 카카오 REST API 키와 Client Secret. 돌아올 주소: `{APP_URL}/api/auth/kakao/callback`, 동의 항목: 닉네임·프로필 사진 |
| `ADMIN_EMAILS` | 로그인 | 관리자 Google 메일. 이 메일로 로그인하면 초대 없이 가입하고 초대 링크를 만들 수 있어요. 아무도 없을 때는 처음 로그인한 사람이 관리자가 돼요. |

`DATABASE_URL`과 Google·카카오 중 하나 이상이 있으면 로그인이 켜져요. 로그인이 켜지면 AI 기능(단어장 만들기, 줄 해설)은 로그인한 사람만 쓸 수 있어요.

## 구조

```
src/app/                  화면 (홈, 노래 추가, 노래 상세, 학습 설정, 복습, 단어장) + API 라우트
  api/tokenize            가사 → 형태소 + 후리가나 (kuromoji)
  api/analyze             가사 → AI 단어장·예문·문법 (Claude, structured output)
  api/explain             가사 한 줄 해설 (Claude)
  api/artwork             앨범 커버 찾기 (iTunes 검색)
  api/auth, api/me        Google·카카오 로그인, 세션
  api/invites, api/sync   초대 링크, 기기 간 동기화
src/lib/
  furigana.ts             표기와 읽기를 맞춰 한자 부분에만 루비 달기
  analysis/               AI 프롬프트, 응답 스키마(zod), 결과 정리
  srs.ts / review.ts      간격 반복 스케줄링, 외운 단어 판정, 학습 목록
  store.ts                기기 저장소(zustand + localStorage)
  data.ts, sync-core.ts   백업 합치기, 동기화 단위(노래·카드·해설·날짜별 기록·설정)와 합치는 규칙
  sync.ts                 로그인했을 때 바뀐 것만 올리고 받기
  server/                 DB(postgres), 세션·초대, 동기화 저장
public/sw.js              오프라인 캐시용 서비스 워커
```

## 가사 저작권

노래 가사는 대부분 저작권이 있어요. 이 앱은 사용자가 직접 붙여넣은 가사를 그 사용자의 기기(로그인하면 그 사람 계정)에만 저장하고,
AI에는 가사를 다시 출력하지 말고 줄 번호로만 가리키도록 지시해요(예문은 새로 지어냄).
여러 사람에게 서비스하거나 유료로 낼 때는 가사 제공 방식(라이선스가 있는 가사 API 등)을 따로 검토해야 해요.

## 한자 데이터 출처

`public/kanji.json`은 `scripts/kanji/build-kanji.mjs`로 만들어요.

- 상용 여부·학년·획수·음독·훈독: [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) (EDRDG, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)), [kanji-data](https://www.npmjs.com/package/kanji-data) 패키지 경유
- 한국 한자 훈음: [libhangul](https://github.com/libhangul/libhangul) `data/hanja/hanja.txt` (Choe Hwanjin, BSD-3-Clause)
- 본음 확인: [hanja](https://www.npmjs.com/package/hanja) 패키지 (MIT)

일본 신자체(気·国·学 등)는 `scripts/kanji/shinjitai.json`으로 구자체를 찾아 훈음을 붙이고, 대표 훈음이 어긋난 글자는 `scripts/kanji/overrides.json`에서 바로잡아요. `public/kanji.json`은 KANJIDIC2를 바탕으로 해서 CC BY-SA 4.0을 따라요.
