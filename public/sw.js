// Utango 서비스 워커: 한 번 열어 본 화면과 정적 파일을 저장해 두고, 오프라인에서도 복습할 수 있게 한다.
const VERSION = "utango-v1";
const SHELL = ["/", "/review", "/vocab", "/songs/new"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // 빌드 결과물은 파일명에 해시가 있어서 바뀌지 않는다.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) caches.open(VERSION).then((c) => c.put(request, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // 나머지는 네트워크 우선, 실패하면 저장된 것. 처음 보는 화면이면 홈 화면 껍데기를 준다.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        // 노래 화면은 id만 다르고 내용은 기기 저장소에서 읽으므로, 저장된 다른 노래 화면을 대신 쓴다.
        if (request.mode === "navigate" && /^\/songs\/(?!new)[^/]+$/.test(url.pathname)) {
          const cache = await caches.open(VERSION);
          const key = (await cache.keys()).find((k) => /^\/songs\/(?!new)[^/]+$/.test(new URL(k.url).pathname));
          if (key) return cache.match(key);
        }
        if (request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});
