import { describe, expect, it } from "vitest";
import { conjugate } from "../conjugate";

const forms = (word: string, reading: string, pos = "동사") =>
  Object.fromEntries(conjugate({ word, reading, pos }).map((c) => [c.label, c.form]));

describe("conjugate", () => {
  it("conjugates godan verbs by their last kana", () => {
    const f = forms("書く", "かく");
    expect([f["ます형"], f["ない형"], f["て형"], f["た형"], f["ば형"], f["의지형"], f["가능형"]]).toEqual([
      "書きます", "書かない", "書いて", "書いた", "書けば", "書こう", "書ける",
    ]);
    expect(forms("呼ぶ", "よぶ")["ば형"]).toBe("呼べば");
    expect(forms("しまう", "しまう")["た형"]).toBe("しまった");
    expect(forms("乾かす", "かわかす")["て형"]).toBe("乾かして");
    expect(forms("走り出す", "はしりだす")["た형"]).toBe("走り出した");
    expect(forms("歩き出す", "あるきだす")["가능형"]).toBe("歩き出せる");
    expect(forms("眠る", "ねむる")["가능형 + ない"]).toBe("眠れない");
  });

  it("tells ichidan verbs from godan ones ending in -iru/-eru", () => {
    expect(forms("離れる", "はなれる")["ても"]).toBe("離れても");
    expect(forms("忘れる", "わすれる")["たくない"]).toBe("忘れたくない");
    expect(forms("見る", "みる")["ない형"]).toBe("見ない");
    expect(forms("信じる", "しんじる")["가능·수동형"]).toBe("信じられる");
    // 帰る·走る는 5단
    expect(forms("帰る", "かえる")["ない형"]).toBe("帰らない");
    expect(forms("走る", "はしる")["て형"]).toBe("走って");
  });

  it("handles 行く, する and 来る", () => {
    expect(forms("行く", "いく")["て형"]).toBe("行って");
    const suru = forms("勉強する", "べんきょうする");
    expect([suru["ない형"], suru["가능형"], suru["ば형"], suru["의지형"]]).toEqual([
      "勉強しない", "勉強できる", "勉強すれば", "勉強しよう",
    ]);
    const kuru = forms("来る", "くる");
    expect([kuru["ます형"], kuru["ば형"], kuru["명령형"]]).toEqual(["来ます", "来れば", "来い"]);
  });

  it("conjugates adjectives", () => {
    const i = forms("強い", "つよい", "형용사");
    expect([i["く형"], i["かった형"], i["ければ형"]]).toEqual(["強く", "強かった", "強ければ"]);
    expect(forms("いい", "いい", "형용사")["かった형"]).toBe("よかった");
    const na = forms("静か", "しずか", "형용동사");
    expect([na["な형"], na["に형"], na["だった형"]]).toEqual(["静かな", "静かに", "静かだった"]);
  });

  it("returns nothing for nouns and never repeats a form", () => {
    expect(conjugate({ word: "星", reading: "ほし", pos: "명사" })).toEqual([]);
    const list = conjugate({ word: "信じる", reading: "しんじる", pos: "동사" }).map((c) => c.form);
    expect(new Set(list).size).toBe(list.length);
    expect(list).not.toContain("信じる");
  });
});
