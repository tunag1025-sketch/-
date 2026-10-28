import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** 브라우저 speechSynthesis 흉내: start()를 부르기 전까지는 대기열에 걸려 있다 (iPhone에서 막힌 상태). */
class FakeSynth {
  queue: { onstart?: () => void; onend?: () => void }[] = [];
  speaking = false;
  pending = false;
  spoken = 0;
  speak = vi.fn((u: { onstart?: () => void; onend?: () => void }) => {
    this.spoken++;
    this.queue.push(u);
    this.pending = true;
  });
  cancel = vi.fn(() => {
    this.queue = [];
    this.pending = false;
    this.speaking = false;
  });
  resume = vi.fn();
  getVoices = () => [];
  addEventListener = () => {};
  removeEventListener = () => {};
  /** 맨 앞 문장을 읽기 시작한다 */
  start() {
    this.pending = false;
    this.speaking = true;
    this.queue[0]?.onstart?.();
  }
}

let synth: FakeSynth;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  synth = new FakeSynth();
  vi.stubGlobal("window", { speechSynthesis: synth });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      lang = "";
      rate = 1;
      constructor(public text: string) {}
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("speak", () => {
  it("speaks right away when nothing is playing, so the tap counts on iPhone", async () => {
    const { speak } = await import("../speech");
    speak("ほし");
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("clears an utterance that never started, so the next tap speaks at once", async () => {
    const { speak, speechUnlocked } = await import("../speech");
    speak("ほし"); // 막혀서 시작 못 함
    vi.advanceTimersByTime(1600);
    expect(synth.cancel).toHaveBeenCalled();
    speak("まど");
    expect(synth.speak).toHaveBeenCalledTimes(2); // 기다리지 않고 바로
    expect(speechUnlocked()).toBe(false);
  });

  it("does not wait for a timer while still locked, even if something is stuck", async () => {
    const { speak } = await import("../speech");
    speak("ほし");
    speak("まど"); // 첫 문장이 걸려 있는 채로 다시 누름
    expect(synth.speak).toHaveBeenCalledTimes(2);
  });

  it("after sound has played, stops the current word and speaks the next shortly after", async () => {
    const { speak, speechUnlocked } = await import("../speech");
    speak("ほし");
    synth.start();
    expect(speechUnlocked()).toBe(true);
    speak("まど");
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(synth.speak).toHaveBeenCalledTimes(2);
  });

  it("leaves the voice to the device on iPhone, picks an installed one elsewhere, and plays in silent mode", async () => {
    const ja = { name: "Eddy", lang: "ja-JP", localService: true, default: false };
    synth.getVoices = () => [ja] as never;
    const session = { type: "auto" };
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", audioSession: session });
    const { speak } = await import("../speech");
    speak("ほし");
    expect((synth.speak.mock.calls[0][0] as { voice?: unknown }).voice).toBeUndefined();
    expect(session.type).toBe("playback");

    vi.resetModules();
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130" });
    const desktop = await import("../speech");
    synth.queue = [];
    synth.pending = false;
    desktop.speak("まど");
    expect((synth.speak.mock.calls[1][0] as { voice?: unknown }).voice).toBe(ja);
  });

  it("reports whether the check sentence started", async () => {
    const { checkSpeech } = await import("../speech");
    const started = checkSpeech();
    synth.start();
    expect((await started).result).toBe("started");

    vi.resetModules();
    synth = new FakeSynth();
    vi.stubGlobal("window", { speechSynthesis: synth });
    const again = await import("../speech");
    const silent = again.checkSpeech();
    vi.advanceTimersByTime(2600);
    expect((await silent).result).toBe("silent");
  });
});
