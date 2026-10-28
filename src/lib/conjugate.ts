import type { VocabItem } from "./types";

/**
 * 동사·형용사 활용형 (활용형 문제의 보기와 풀이에 쓴다).
 * 사전형과 읽는 법만 보고 만들어서 드문 예외는 틀릴 수 있다. 그래서 문제는 가사에 실제로 나온 형태가
 * 이 목록에 있을 때만 낸다.
 */
export type Conjugation = { form: string; label: string; meaning: string };

// 5단 동사 끝 글자마다 [あ단, い단, え단, お단, て형, た형]
type Row = [string, string, string, string, string, string];
const GODAN: Record<string, Row> = {
  う: ["わ", "い", "え", "お", "って", "った"],
  く: ["か", "き", "け", "こ", "いて", "いた"],
  ぐ: ["が", "ぎ", "げ", "ご", "いで", "いだ"],
  す: ["さ", "し", "せ", "そ", "して", "した"],
  つ: ["た", "ち", "て", "と", "って", "った"],
  ぬ: ["な", "に", "ね", "の", "んで", "んだ"],
  ぶ: ["ば", "び", "べ", "ぼ", "んで", "んだ"],
  む: ["ま", "み", "め", "も", "んで", "んだ"],
  る: ["ら", "り", "れ", "ろ", "って", "った"],
};

// る 앞이 い단·え단이어도 5단으로 활용하는 동사 (복합동사는 끝부분으로 본다)
const GODAN_RU = [
  "帰る", "返る", "走る", "知る", "入る", "切る", "要る", "減る", "滑る", "喋る", "焦る", "蹴る", "照る", "握る",
  "参る", "限る", "茂る", "湿る", "陥る", "遮る", "練る", "散る", "混じる", "交じる", "捻る", "蘇る", "甦る",
  "翻る", "嘲る", "罵る", "覆る", "侮る", "弄る", "煎る", "迸る", "漲る", "滾る", "耽る", "齧る", "契る", "千切る",
  "しゃべる", "いじる", "かじる",
];

const I_OR_E_ROW = new Set("いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ");

const isKana = (c: string) => /[ぁ-ゖ]/.test(c);

type VerbParts = { kind: "godan"; base: string; row: Row } | { kind: "ichidan"; stem: string };

function verbParts(word: string, reading: string): VerbParts | null {
  const last = word.at(-1) ?? "";
  if (last === "る") {
    const before = word.at(-2) ?? "";
    // る 앞 글자가 한자면 읽는 법에서 본다 (見る → みる의 み)
    const sound = isKana(before) ? before : (reading.at(-2) ?? "");
    if (I_OR_E_ROW.has(sound) && !GODAN_RU.some((v) => word.endsWith(v))) {
      return { kind: "ichidan", stem: word.slice(0, -1) };
    }
  }
  const row = GODAN[last];
  if (!row) return null;
  // 行く는 て형·た형만 다르다
  const go = word.endsWith("行く") || word.endsWith("いく");
  return { kind: "godan", base: word.slice(0, -1), row: go ? [row[0], row[1], row[2], row[3], "って", "った"] : row };
}

// 활용 어미를 붙일 자리: 각 단, て형·た형, 1단 동사의 어간(plain)
type VerbStems = { a: string; i: string; e: string; o: string; te: string; ta: string; plain: string };

function verbForms(s: VerbStems, ichidan: boolean): Conjugation[] {
  const f = (form: string, label: string, meaning: string): Conjugation => ({ form, label, meaning });
  return [
    f(`${s.i}ます`, "ます형", "정중하게 (~합니다)"),
    f(`${s.i}ました`, "ました형", "정중한 과거 (~했습니다)"),
    f(`${s.i}ません`, "ません형", "정중한 부정 (~하지 않습니다)"),
    f(`${s.a}ない`, "ない형", "부정 (~하지 않다)"),
    f(`${s.a}なかった`, "なかった형", "과거 부정 (~하지 않았다)"),
    f(s.te, "て형", "연결 (~하고, ~해서)"),
    f(s.ta, "た형", "과거 (~했다)"),
    f(`${s.te}も`, "ても", "양보 (~해도)"),
    f(`${s.te}いる`, "ている", "진행·상태 (~하고 있다)"),
    f(`${s.ta}ら`, "たら", "가정·계기 (~하면, ~했더니)"),
    f(`${s.i}たい`, "たい형", "바람 (~하고 싶다)"),
    f(`${s.i}たくない`, "たくない", "바람의 부정 (~하고 싶지 않다)"),
    f(`${s.e}ば`, "ば형", "가정 (~하면)"),
    f(s.o, "의지형", "의지·권유 (~하자, ~해야지)"),
    ichidan
      ? f(`${s.plain}られる`, "가능·수동형", "가능 (~할 수 있다) 또는 수동 (~받다)")
      : f(`${s.e}る`, "가능형", "가능 (~할 수 있다)"),
    ichidan
      ? f(`${s.plain}られない`, "가능형 + ない", "불가능 (~할 수 없다)")
      : f(`${s.e}ない`, "가능형 + ない", "불가능 (~할 수 없다)"),
    ...(ichidan ? [] : [f(`${s.a}れる`, "수동형", "수동 (~받다, ~당하다)")]),
    f(ichidan ? `${s.plain}させる` : `${s.a}せる`, "사역형", "사역 (~하게 하다)"),
    f(ichidan ? `${s.plain}ろ` : s.e, "명령형", "명령 (~해라)"),
    f(`${s.i}ながら`, "ながら", "동시 (~하면서)"),
  ];
}

function conjugateVerb(word: string, reading: string): Conjugation[] {
  // する·来る는 따로
  if (word.endsWith("する")) {
    const p = word.slice(0, -2);
    return [
      ...verbForms({ a: `${p}し`, i: `${p}し`, e: `${p}すれ`, o: `${p}しよう`, te: `${p}して`, ta: `${p}した`, plain: `${p}し` }, false)
        .filter((c) => !["가능형", "가능형 + ない", "수동형", "사역형", "명령형"].includes(c.label)),
      { form: `${p}できる`, label: "가능형", meaning: "가능 (~할 수 있다)" },
      { form: `${p}できない`, label: "가능형 + ない", meaning: "불가능 (~할 수 없다)" },
      { form: `${p}される`, label: "수동형", meaning: "수동 (~받다, ~당하다)" },
      { form: `${p}させる`, label: "사역형", meaning: "사역 (~하게 하다)" },
      { form: `${p}しろ`, label: "명령형", meaning: "명령 (~해라)" },
    ];
  }
  if (word === "来る" || word === "くる") {
    const k = word === "来る" ? "来" : "";
    const at = (kana: string) => (k ? k : kana);
    return [
      ...verbForms(
        { a: at("こ"), i: at("き"), e: `${at("く")}れ`, o: `${at("こ")}よう`, te: `${at("き")}て`, ta: `${at("き")}た`, plain: at("こ") },
        true,
      ).filter((c) => c.label !== "명령형"),
      { form: `${at("こ")}い`, label: "명령형", meaning: "명령 (와라)" },
    ];
  }
  const parts = verbParts(word, reading);
  if (!parts) return [];
  if (parts.kind === "ichidan") {
    const s = parts.stem;
    return verbForms({ a: s, i: s, e: `${s}れ`, o: `${s}よう`, te: `${s}て`, ta: `${s}た`, plain: s }, true);
  }
  const { base, row } = parts;
  const [a, i, e, o, te, ta] = row;
  return verbForms(
    { a: base + a, i: base + i, e: base + e, o: `${base}${o}う`, te: base + te, ta: base + ta, plain: base },
    false,
  );
}

function conjugateIAdjective(word: string): Conjugation[] {
  if (!word.endsWith("い")) return [];
  const s = word === "いい" ? "よ" : word.slice(0, -1);
  const f = (end: string, label: string, meaning: string): Conjugation => ({ form: s + end, label, meaning });
  return [
    f("く", "く형", "부사처럼 (~하게)"),
    f("くて", "くて형", "연결 (~하고, ~해서)"),
    f("かった", "かった형", "과거 (~했다)"),
    f("くない", "くない형", "부정 (~하지 않다)"),
    f("くなかった", "くなかった형", "과거 부정 (~하지 않았다)"),
    f("ければ", "ければ형", "가정 (~하면)"),
    f("さ", "さ형", "명사로 (~함, ~정도)"),
    f("そう", "そう", "모양 (~해 보인다)"),
    f("すぎる", "すぎる", "지나침 (너무 ~하다)"),
  ];
}

function conjugateNaAdjective(word: string): Conjugation[] {
  const s = word.replace(/だ$/, "");
  const f = (end: string, label: string, meaning: string): Conjugation => ({ form: s + end, label, meaning });
  return [
    f("だ", "だ", "기본 (~하다)"),
    f("な", "な형", "명사 꾸밈 (~한)"),
    f("に", "に형", "부사처럼 (~하게)"),
    f("で", "で형", "연결 (~하고, ~해서)"),
    f("だった", "だった형", "과거 (~했다)"),
    f("じゃない", "じゃない형", "부정 (~하지 않다)"),
    f("なら", "なら형", "가정 (~하면)"),
  ];
}

/** 단어의 활용형 목록 (사전형은 빼고, 같은 글자는 한 번만). 동사·형용사가 아니면 빈 목록 */
export function conjugate(item: Pick<VocabItem, "word" | "reading" | "pos">): Conjugation[] {
  const list =
    item.pos === "동사"
      ? conjugateVerb(item.word, item.reading)
      : item.pos === "형용사"
        ? conjugateIAdjective(item.word)
        : item.pos === "형용동사"
          ? conjugateNaAdjective(item.word)
          : [];
  const seen = new Set([item.word]);
  return list.filter((c) => !seen.has(c.form) && seen.add(c.form));
}
