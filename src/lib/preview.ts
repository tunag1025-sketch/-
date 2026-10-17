/**
 * 화면 미리보기 모드. 디자인 검토용으로 샘플 데이터를 채운 화면을 띄운다.
 *  - /preview 를 열거나 주소에 ?preview=1 을 붙이면 이 탭에서 켜지고, ?preview=0 이면 꺼진다.
 *  - 데이터는 이 탭의 sessionStorage에만 두고, 서버 API는 가짜 응답으로 바꾼다.
 *    그래서 진짜 기록(localStorage)과 계정, 동기화는 건드리지 않는다.
 *  - ?as=guest 는 로그인 전 화면, ?theme=dark|light 는 테마를 고른다 (그 페이지에서만).
 */
import type { StateStorage } from "zustand/middleware";

const FLAG = "utango-preview";
const DATA_KEY = "utango-preview-data";

const params = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);

function detect(): boolean {
  if (!params) return false;
  try {
    if (params.get("preview") === "0") {
      sessionStorage.removeItem(FLAG);
      sessionStorage.removeItem(DATA_KEY);
      return false;
    }
    if (params.get("preview") === "1" || window.location.pathname === "/preview") sessionStorage.setItem(FLAG, "1");
    return sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

export const PREVIEW = detect();
/** 샘플 노래 중 단어장을 만드는 중으로 보여 줄 노래 (scripts/preview-source.ts) */
export const PREVIEW_ANALYZING_ID = "pv-new";
/** 미리보기에서 로그인 전 화면을 볼 때 */
export const PREVIEW_GUEST = PREVIEW && params?.get("as") === "guest";

/** ?theme= 로 고른 테마를 적용한다 (화면이 뜬 뒤에 불러야 서버 HTML과 어긋나지 않는다). */
export function applyPreviewTheme() {
  const theme = PREVIEW ? params?.get("theme") : null;
  if (theme === "dark" || theme === "light") document.documentElement.dataset.theme = theme;
}

if (PREVIEW) {
  // 서버 API는 미리보기용 가짜 응답으로. 상태가 없는 형태소 분석만 진짜 서버를 쓴다.
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/") || url.pathname === "/api/tokenize") {
      return realFetch(input, init);
    }
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const { previewApi } = await import("./preview-data");
    return previewApi(url, method, PREVIEW_GUEST, typeof init?.body === "string" ? init.body : undefined);
  };
}

/** 미리보기용 저장소: 처음 열면 샘플 데이터를 채운다. */
export function previewStorage(version: number): StateStorage {
  return {
    getItem: async () => {
      const saved = sessionStorage.getItem(DATA_KEY);
      if (saved) return saved;
      const { makePreviewState } = await import("./preview-data");
      return JSON.stringify({ state: makePreviewState(Date.now()), version });
    },
    setItem: (_name, value) => {
      try {
        sessionStorage.setItem(DATA_KEY, value);
      } catch {
        // 저장 공간이 꽉 차도 이 화면에서는 그대로 쓴다.
      }
    },
    removeItem: () => sessionStorage.removeItem(DATA_KEY),
  };
}

/** 미리보기 샘플 데이터를 처음 상태로 되돌린다 (다음에 열 때 다시 채운다). */
export function resetPreviewData() {
  try {
    sessionStorage.removeItem(DATA_KEY);
  } catch {
    // 무시
  }
}
