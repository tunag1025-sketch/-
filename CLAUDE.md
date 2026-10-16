@AGENTS.md

# Utango

일본 노래 가사로 단어장·예문을 만드는 일본어 학습 PWA. 화면 문구와 주석은 한국어로 쓴다.

- Next.js 16 (App Router, `cacheComponents` 켜짐) — 라우트 세그먼트 설정 `dynamic`/`runtime`은 쓰지 않는다. 클라이언트 전용 화면은 `HydrationGate`로 감싸고, `useParams`/`useSearchParams`는 `<Suspense>` 안에서 쓴다.
- 데이터는 전부 브라우저 localStorage (`src/lib/store.ts`). 서버는 상태가 없다.
- AI 호출은 `src/lib/analysis/claude.server.ts`만 통한다. 응답 형식은 `schema.ts`의 zod 스키마.
- 확인: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Tailwind 클래스를 새로 추가했는데 반영이 안 되면 `rm -rf .next` 후 다시 빌드.
