import { describe, expect, it } from "vitest";
import demo from "../demo-song.json";
import { blankAnswer, canAsk, formQuestion, makeChoices, pickQuizType, readingMatches, withNewQuizTypes } from "../quiz";
import type { QuizType } from "../quiz";
import type { Song, VocabItem } from "../types";

const song = demo as unknown as Song;
const pool = song.vocab;
const find = (word: string) => pool.find((v) => v.word === word) as VocabItem;

describe("quiz", () => {
  it("finds the part of the lyric line to blank out", () => {
    expect(blankAnswer(find("星"), song)).toBe("星");
    const item = find("眠る");
    expect(song.lines[item.lines[0]].text).toContain(blankAnswer(item, song)!);
  });

  it("asks new words as recall first", () => {
    expect(pickQuizType(["choice", "blank"], find("星"), song, pool.length, true)).toBe("recall");
    expect(pickQuizType(["choice"], find("星"), song, pool.length, false)).toBe("choice");
  });

  it("skips types that do not fit the word", () => {
    expect(canAsk("reading", find("しまう"), song, pool.length)).toBe(false);
    expect(canAsk("reading", find("星"), song, pool.length)).toBe(true);
    expect(canAsk("choice", find("星"), song, 3)).toBe(false);
    expect(pickQuizType(["reading"], find("しまう"), song, pool.length, false)).toBe("recall");
  });

  it("asks the conjugated form a verb or adjective takes in the lyric", () => {
    const q = formQuestion(find("眠る"), song)!;
    expect(q.answer).toBe("眠れない");
    expect(q.form.label).toBe("가능형 + ない");
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(q.choices).toContain("眠れない");
    // 정답과 앞부분이 겹치는 형태(眠れ, 眠れないで…)는 보기에 넣지 않는다.
    expect(q.choices.filter((c) => c !== q.answer).some((c) => c.startsWith("眠れない") || "眠れない".startsWith(c))).toBe(false);
    expect(formQuestion(find("離れる"), song)?.answer).toBe("離れても");
    expect(formQuestion(find("強い"), song)?.form.label).toBe("く형");
    // 명사, 가사에 사전형 그대로 나온 단어, 목록에 없는 꼴(輝きだす)은 내지 않는다.
    expect(canAsk("form", find("星"), song, pool.length)).toBe(false);
    expect(canAsk("form", find("思う"), song, pool.length)).toBe(false);
    expect(canAsk("form", find("輝く"), song, pool.length)).toBe(false);
  });

  it("asks listening questions when the word has a reading and enough choices", () => {
    expect(canAsk("listen", find("星"), song, pool.length)).toBe(true);
    expect(canAsk("listen", find("星"), song, 3)).toBe(false);
    expect(canAsk("listen", { ...find("星"), reading: "" }, song, pool.length)).toBe(false);
  });

  it("turns on new quiz types for old settings once, keeping what the user turned off", () => {
    const old = withNewQuizTypes<{ quizTypes: QuizType[]; knownQuizTypes?: QuizType[] }>({ quizTypes: ["recall", "blank"] });
    expect(old.quizTypes).toEqual(["recall", "blank", "listen", "form"]);
    expect(old.knownQuizTypes).toContain("form");
    // 이미 알려 준 뒤에 끈 유형은 다시 켜지 않는다.
    const off = withNewQuizTypes({ quizTypes: ["recall"], knownQuizTypes: old.knownQuizTypes });
    expect(off.quizTypes).toEqual(["recall"]);
  });

  it("makes four distinct choices including the answer", () => {
    const item = find("星");
    for (let i = 0; i < 20; i++) {
      const choices = makeChoices(item, item.word, pool, (v) => v.word);
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain("星");
    }
  });

  it("accepts katakana or spaces in a typed reading", () => {
    expect(readingMatches("よあけ", "よあけ")).toBe(true);
    expect(readingMatches("ヨアケ", "よあけ")).toBe(true);
    expect(readingMatches(" よ あけ ", "よあけ")).toBe(true);
    expect(readingMatches("よる", "よあけ")).toBe(false);
    expect(readingMatches("", "よあけ")).toBe(false);
  });
});
