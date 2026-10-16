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
function canSpeak(): boolean {
  if (!supported()) return false;
  const voices = window.speechSynthesis.getVoices();
  return voices.length === 0 || japaneseVoice() !== undefined;
}

export function useCanSpeak(): boolean {
  return useSyncExternalStore(subscribe, canSpeak, () => false);
}

/** 일본어 문장을 소리 내어 읽는다. 읽던 것은 멈춘다. */
export function speak(text: string, rate = 0.9) {
  if (!supported() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = rate;
  const voice = japaneseVoice();
  if (voice) u.voice = voice;
  synth.speak(u);
}
