"use client";

import { useSyncExternalStore } from "react";

const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** iPhone·iPad (iPadOS는 Mac처럼 보이기도 한다) */
const appleMobile = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const japaneseVoices = () =>
  window.speechSynthesis.getVoices().filter((v) => v.lang === "ja-JP" || v.lang.toLowerCase().startsWith("ja"));

/**
 * 읽을 음성. iPhone·iPad는 고르지 않고 기기의 기본 일본어 음성에 맡긴다:
 * iOS 18은 받아 두지 않았거나 쓸 수 없는 음성(Eloquence 등)도 목록에 보여 줘서, 그걸 고르면 소리가 안 난다.
 * 다른 기기는 깔린(localService) 기본 음성을 먼저 고른다.
 */
function voiceFor(): SpeechSynthesisVoice | undefined {
  if (appleMobile()) return undefined;
  const rank = (v: SpeechSynthesisVoice) => (v.localService ? 0 : 2) + (v.default ? 0 : 1);
  return japaneseVoices().sort((a, b) => rank(a) - rank(b))[0];
}

/** 무음 모드에서도 동영상처럼 소리가 나게 한다 (iOS 16.4+ Safari의 Audio Session). 단어를 누른 건 듣겠다는 뜻이라서. */
function playEvenWhenSilent() {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession && nav.audioSession.type !== "playback") nav.audioSession.type = "playback";
  } catch {
    // 지원하지 않으면 그대로 둔다.
  }
}

function subscribe(onChange: () => void) {
  if (!supported()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

/**
 * 일본어로 읽어 줄 수 있는지.
 * 음성 목록을 아직 못 받았으면(일부 브라우저는 늦게 준다) 일단 된다고 보고, 받았는데 일본어가 없으면 숨긴다.
 */
export function canSpeak(): boolean {
  if (!supported()) return false;
  const voices = window.speechSynthesis.getVoices();
  return voices.length === 0 || japaneseVoices().length > 0;
}

export function useCanSpeak(): boolean {
  return useSyncExternalStore(subscribe, canSpeak, () => false);
}

// 읽는 중인 문장을 붙잡아 둔다. 놓치면 iPhone Safari가 끝난 줄 모르고 다음 문장을 안 읽는다.
let current: SpeechSynthesisUtterance | null = null;
let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;
// 이 페이지에서 한 번이라도 소리가 났는지. iPhone은 처음 한 번은 누른 순간에 읽어야 소리가 열린다.
let unlocked = false;

/** 누르지 않아도 읽을 수 있는지 (자동으로 들려주기 전에 본다) */
export const speechUnlocked = () => unlocked;

type SpeechEvent = { type: "start" | "end" | "error"; error?: string };

/** 일본어 문장을 소리 내어 읽는다. 읽던 것은 멈춘다. 버튼을 누른 순간에 부르는 게 가장 확실하다. */
export function speak(text: string, rate = 0.9, onEvent?: (e: SpeechEvent) => void) {
  if (!supported() || !text.trim()) return;
  const synth = window.speechSynthesis;
  playEvenWhenSilent();
  const start = () => {
    timer = null;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = rate;
    const voice = voiceFor();
    if (voice) u.voice = voice;
    u.onstart = () => {
      unlocked = true;
      if (current === u) started = true;
      onEvent?.({ type: "start" });
    };
    u.onend = () => {
      if (current === u) current = null;
      onEvent?.({ type: "end" });
    };
    u.onerror = (e) => {
      if (current === u) current = null;
      onEvent?.({ type: "error", error: e.error });
    };
    current = u;
    started = false;
    // 멈춤 상태로 굳어 버린 경우(iPhone·안드로이드 크롬)를 깨운다.
    synth.resume();
    synth.speak(u);
    // 읽기를 시작도 못 하고 대기열에 걸려 있으면 비워 둔다. 그래야 다음에 누를 때 바로 읽는다.
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      if (current === u && !started) {
        synth.cancel();
        current = null;
      }
    }, 1500);
  };
  if (timer) clearTimeout(timer);
  const busy = synth.speaking || synth.pending || current !== null;
  if (!busy) {
    start();
  } else if (unlocked) {
    // 소리가 나던 중이면 멈추고 잠깐 쉬었다 읽는다 (iPhone Safari는 cancel 바로 뒤의 speak를 무시하곤 한다).
    synth.cancel();
    current = null;
    timer = setTimeout(start, 150);
  } else {
    // 아직 한 번도 소리가 안 났는데 무언가 걸려 있으면, 누른 순간을 놓치지 않게 비우고 바로 읽는다.
    synth.cancel();
    current = null;
    start();
  }
}

export type SpeechCheck = {
  /** 기기가 알려 준 음성 수 / 그중 일본어 음성 이름 */
  voices: number;
  japanese: string[];
  /** 이 앱이 쓰는 음성 */
  using: string;
  result: "started" | "error" | "silent" | "unsupported";
  error?: string;
};

/** 발음 점검: 짧은 문장을 읽어 보고 소리를 시작했는지 알려 준다. 버튼을 누른 순간에 불러야 한다. */
export function checkSpeech(): Promise<SpeechCheck> {
  if (!supported()) return Promise.resolve({ voices: 0, japanese: [], using: "", result: "unsupported" });
  const voices = window.speechSynthesis.getVoices();
  const base = {
    voices: voices.length,
    japanese: japaneseVoices().map((v) => v.name),
    using: voiceFor()?.name ?? "기기 기본 일본어 음성",
  };
  return new Promise((resolve) => {
    let done = false;
    const finish = (r: Pick<SpeechCheck, "result" | "error">) => {
      if (done) return;
      done = true;
      resolve({ ...base, ...r });
    };
    speak("こんにちは。日本語の発音です。", 0.9, (e) => {
      if (e.type === "start") finish({ result: "started" });
      if (e.type === "error") finish({ result: "error", error: e.error });
    });
    setTimeout(() => finish({ result: "silent" }), 2500);
  });
}
