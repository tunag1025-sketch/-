import { describe, expect, it } from "vitest";
import { stripInlineFurigana } from "../tokenizer.server";

describe("stripInlineFurigana", () => {
  it("removes readings that were copied inline from a web page", async () => {
    expect(
      await stripInlineFurigana(["思おもい出だすのは君きみの歌うた", "", "夜明よあけ前まえの空そらに 小ちいさな星ほしがひとつ"]),
    ).toEqual(["思い出すのは君の歌", "", "夜明け前の空に 小さな星がひとつ"]);
  });

  it("removes readings in parentheses", async () => {
    expect(await stripInlineFurigana(["思(おも)い出(だ)す", "君（きみ）の歌"])).toEqual(["思い出す", "君の歌"]);
  });

  it("leaves normal lyrics alone", async () => {
    const lines = ["君の名前を呼んだ夜に", "走り出した僕らの未来", "下さい", "今日はいい天気"];
    expect(await stripInlineFurigana(lines)).toEqual(lines);
  });
});
