"use client";

import { useSyncExternalStore } from "react";

const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;

function japaneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === "ja-JP") ?? voices.find((v) => v.lang.toLowerCase().startsWith("ja"));
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
  return voices.length === 0 || japaneseVoice() !== undefined;
}

export function useCanSpeak(): boolean {
  return useSyncExternalStore(subscribe, canSpeak, () => false);
}

// 읽는 중인 문장을 붙잡아 둔다. 놓치면 iPhone Safari가 끝난 줄 모르고 다음 문장을 안 읽는다.
let current: SpeechSynthesisUtterance | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

/** 일본어 문장을 소리 내어 읽는다. 읽던 것은 멈춘다. */
export function speak(text: string, rate = 0.9) {
  if (!supported() || !text.trim()) return;
  const synth = window.speechSynthesis;
  const start = () => {
    timer = null;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = rate;
    const voice = japaneseVoice();
    if (voice) u.voice = voice;
    u.onend = u.onerror = () => {
      if (current === u) current = null;
    };
    current = u;
    // 멈춤 상태로 굳어 버린 경우(iPhone·안드로이드 크롬)를 깨운다.
    synth.resume();
    synth.speak(u);
  };
  if (timer) clearTimeout(timer);
  if (synth.speaking || synth.pending || current) {
    synth.cancel();
    current = null;
    // iPhone Safari는 cancel 바로 뒤의 speak를 무시하곤 해서 잠깐 쉬었다 읽는다.
    timer = setTimeout(start, 150);
  } else {
    start();
  }
}
