"use client";

/**
 * 매일 학습 알림(웹 푸시)을 이 기기에서 켜고 끈다.
 * iPhone·iPad는 홈 화면에 추가한 앱(iOS 16.4 이상)에서만 알림을 받을 수 있다.
 */

export type PushSupport = "ok" | "install" | "unsupported";
export type PushStatus = "on" | "off" | "denied";

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function pushSupport(): PushSupport {
  if (isIOS() && !standalone()) return "install";
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window ? "ok" : "unsupported";
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** 서버가 준 공개 키(base64url)를 구독에 쓰는 바이트로 */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** 지금 이 기기의 알림 상태 */
export async function pushStatus(): Promise<PushStatus> {
  if (Notification.permission === "denied") return "denied";
  const sub = await (await registration()).pushManager.getSubscription();
  if (!sub) return "off";
  const res = await fetch(`/api/push?endpoint=${encodeURIComponent(sub.endpoint)}`);
  const data = (await res.json().catch(() => null)) as { subscribed?: boolean } | null;
  return data?.subscribed ? "on" : "off";
}

/** 알림을 켠다. 버튼을 누른 순간에 불러야 iPhone에서 권한 창이 뜬다. */
export async function enablePush(): Promise<PushStatus> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await registration();
  const res = await fetch("/api/push");
  if (!res.ok) throw new Error("알림 설정을 불러오지 못했어요.");
  const { publicKey } = (await res.json()) as { publicKey: string };
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  const saved = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!saved.ok) throw new Error("알림을 켜지 못했어요.");
  return "on";
}

/** 알림을 끈다. */
export async function disablePush(): Promise<void> {
  const sub = await (await registration()).pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/push", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe().catch(() => false);
}

/** 내 기기들로 시험 알림. 보낸 기기 수 */
export async function sendTestPush(): Promise<number> {
  const res = await fetch("/api/push/test", { method: "POST" });
  const data = (await res.json().catch(() => null)) as { sent?: number } | null;
  return data?.sent ?? 0;
}
