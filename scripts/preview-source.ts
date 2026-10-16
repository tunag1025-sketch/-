// 화면 미리보기(/preview)에 쓰는 샘플 노래. 가사는 이 앱을 위해 새로 쓴 것이다.
// 데모곡과 겹치는 단어(星, 約束, 遠く)와 두 노래에 함께 나오는 단어(君)를 일부러 넣었다.
import type { SongSource } from "./song-builder.ts";

export const previewSongs: SongSource[] = [
  {
    id: "pv-ame",
    title: "雨上がりの帰り道",
    artist: "Utango 샘플",
    level: "N5",
    readings: { 雨上: "あまあ", 間: "あいだ", 顔: "かお" },
    summary: "비가 그친 저녁, 좋아하는 사람과 함께 걷던 귀갓길의 설렘과 헤어질 때의 아쉬움을 담은 노래예요.",
    lyrics: `雨上がりの帰り道 水たまりに空が映る
傘をたたんで 君と並んで歩いた

コンビニの光が やさしく街を照らす
雲の間から 星がひとつ顔を出した

信号が青になる 君は手を振っている
「また明日」の言葉が 今日は少しさびしい`,
    vocab: [
      { word: "雨上がり", reading: "あまあがり", meaning: "비가 갠 뒤", pos: "명사", jlpt: "N3", formInSong: "雨上がり", lines: [0], note: "雨(비)와 上がる(그치다)가 합쳐진 말이에요.", examples: [
        { ja: "雨上がりの空に虹が出た。", ko: "비 갠 하늘에 무지개가 떴다." },
        { ja: "雨上がりの道は滑りやすい。", ko: "비 갠 뒤의 길은 미끄럽기 쉽다." } ] },
      { word: "帰り道", reading: "かえりみち", meaning: "돌아가는 길, 귀갓길", pos: "명사", jlpt: "N3", formInSong: "帰り道", lines: [0], note: "帰る(돌아가다)와 道(길)가 합쳐진 말이에요.", examples: [
        { ja: "帰り道にパン屋に寄った。", ko: "돌아가는 길에 빵집에 들렀다." },
        { ja: "駅からの帰り道は暗い。", ko: "역에서 돌아오는 길은 어둡다." } ] },
      { word: "水たまり", reading: "みずたまり", meaning: "물웅덩이", pos: "명사", jlpt: "기타", formInSong: "水たまり", lines: [0], note: "", examples: [
        { ja: "子どもが水たまりで遊んでいる。", ko: "아이가 물웅덩이에서 놀고 있다." },
        { ja: "水たまりを飛び越えた。", ko: "물웅덩이를 뛰어넘었다." } ] },
      { word: "空", reading: "そら", meaning: "하늘", pos: "명사", jlpt: "N5", formInSong: "空", lines: [0], note: "", examples: [
        { ja: "今日は空がとても青い。", ko: "오늘은 하늘이 아주 파랗다." },
        { ja: "空を飛ぶ夢を見た。", ko: "하늘을 나는 꿈을 꿨다." } ] },
      { word: "映る", reading: "うつる", meaning: "(모습이) 비치다", pos: "동사", jlpt: "N3", formInSong: "映る", lines: [0], note: "물이나 거울에 모습이 비칠 때 써요. 화면에 '나오다'라는 뜻도 있어요.", examples: [
        { ja: "湖に山が映っている。", ko: "호수에 산이 비치고 있다." },
        { ja: "テレビに友達が映った。", ko: "텔레비전에 친구가 나왔다." } ] },
      { word: "傘", reading: "かさ", meaning: "우산", pos: "명사", jlpt: "N5", formInSong: "傘", lines: [1], note: "", examples: [
        { ja: "雨なので傘を持っていこう。", ko: "비가 오니까 우산을 가져가자." },
        { ja: "駅に傘を忘れました。", ko: "역에 우산을 두고 왔어요." } ] },
      { word: "たたむ", reading: "たたむ", meaning: "접다, 개다", pos: "동사", jlpt: "N3", formInSong: "たたんで", lines: [1], note: "て형은 たたんで. 우산·옷·이불을 접거나 갤 때 써요.", examples: [
        { ja: "シャツをたたんでください。", ko: "셔츠를 개 주세요." },
        { ja: "傘をたたんで電車に乗った。", ko: "우산을 접고 전철을 탔다." } ] },
      { word: "君", reading: "きみ", meaning: "너", pos: "대명사", jlpt: "N4", formInSong: "君", lines: [1], note: "노래 가사에서 '너'를 부를 때 아주 자주 나와요.", examples: [
        { ja: "君の声が聞きたい。", ko: "네 목소리가 듣고 싶어." },
        { ja: "君はどう思う？", ko: "너는 어떻게 생각해?" } ] },
      { word: "並ぶ", reading: "ならぶ", meaning: "나란히 서다, 줄 서다", pos: "동사", jlpt: "N4", formInSong: "並んで", lines: [1], note: "て형 並んで에 歩く를 이으면 '나란히 걷다'가 돼요.", examples: [
        { ja: "店の前に人が並んでいる。", ko: "가게 앞에 사람들이 줄 서 있다." },
        { ja: "ふたりで並んで座った。", ko: "둘이서 나란히 앉았다." } ] },
      { word: "光", reading: "ひかり", meaning: "빛", pos: "명사", jlpt: "N3", formInSong: "光", lines: [3], note: "", examples: [
        { ja: "窓から朝の光が入る。", ko: "창문으로 아침 햇빛이 들어온다." },
        { ja: "星の光がきれいだ。", ko: "별빛이 아름답다." } ] },
      { word: "照らす", reading: "てらす", meaning: "비추다", pos: "동사", jlpt: "N2", formInSong: "照らす", lines: [3], note: "", examples: [
        { ja: "月が海を照らしている。", ko: "달이 바다를 비추고 있다." },
        { ja: "ライトで足元を照らした。", ko: "라이트로 발밑을 비췄다." } ] },
      { word: "雲", reading: "くも", meaning: "구름", pos: "명사", jlpt: "N4", formInSong: "雲", lines: [4], note: "", examples: [
        { ja: "空に白い雲が浮かんでいる。", ko: "하늘에 하얀 구름이 떠 있다." },
        { ja: "雲が多くて星が見えない。", ko: "구름이 많아서 별이 안 보인다." } ] },
      { word: "星", reading: "ほし", meaning: "별", pos: "명사", jlpt: "N4", formInSong: "星", lines: [4], note: "", examples: [
        { ja: "星がきらきら光っている。", ko: "별이 반짝반짝 빛나고 있다." },
        { ja: "星の名前を覚えたい。", ko: "별 이름을 외우고 싶다." } ] },
      { word: "信号", reading: "しんごう", meaning: "신호, 신호등", pos: "명사", jlpt: "N4", formInSong: "信号", lines: [6], note: "일본에서는 신호등의 초록불을 青(파랑)이라고 해요.", examples: [
        { ja: "信号が赤になった。", ko: "신호가 빨간불로 바뀌었다." },
        { ja: "次の信号を右に曲がってください。", ko: "다음 신호등에서 오른쪽으로 돌아 주세요." } ] },
      { word: "振る", reading: "ふる", meaning: "흔들다", pos: "동사", jlpt: "N4", formInSong: "振って", lines: [6], note: "手を振る = 손을 흔들다.", examples: [
        { ja: "駅で友達に手を振った。", ko: "역에서 친구에게 손을 흔들었다." },
        { ja: "犬がしっぽを振っている。", ko: "개가 꼬리를 흔들고 있다." } ] },
      { word: "言葉", reading: "ことば", meaning: "말, 단어", pos: "명사", jlpt: "N4", formInSong: "言葉", lines: [7], note: "", examples: [
        { ja: "その言葉が忘れられない。", ko: "그 말을 잊을 수 없다." },
        { ja: "日本語の言葉を毎日覚える。", ko: "일본어 단어를 매일 외운다." } ] },
      { word: "さびしい", reading: "さびしい", meaning: "쓸쓸하다, 외롭다", pos: "형용사", jlpt: "N4", formInSong: "さびしい", lines: [7], note: "한자로는 寂しい라고 써요.", examples: [
        { ja: "ひとりの夜は少しさびしい。", ko: "혼자인 밤은 조금 쓸쓸하다." },
        { ja: "友達が引っ越してさびしくなった。", ko: "친구가 이사 가서 쓸쓸해졌다." } ] },
    ],
    explanations: {
      0: { translation: "비 갠 뒤 돌아가는 길, 물웅덩이에 하늘이 비쳐", breakdown: [
        { part: "雨上がりの帰り道", meaning: "비 갠 뒤의 귀갓길 (雨上がり 비 갠 뒤 + の ~의 + 帰り道 귀갓길)" },
        { part: "水たまりに", meaning: "물웅덩이에 (に: 장소)" },
        { part: "空が映る", meaning: "하늘이 비친다 (映る 비치다)" } ],
        notes: "앞 구절은 명사로 끝나 장면을 먼저 보여 주고, 뒤 구절에서 그 장면 속 모습을 그려요." },
      1: { translation: "우산을 접고 너와 나란히 걸었어", breakdown: [
        { part: "傘をたたんで", meaning: "우산을 접고 (たたむ의 て형)" },
        { part: "君と", meaning: "너와 (と: 함께하는 상대)" },
        { part: "並んで歩いた", meaning: "나란히 걸었다 (並ぶ의 て형 + 歩く의 과거형)" } ],
        notes: "て형을 두 번 이어서 '접고 → 나란히 서서 → 걸었다'처럼 동작을 차례로 묶었어요." },
      3: { translation: "편의점 불빛이 다정하게 거리를 비춰", breakdown: [
        { part: "コンビニの光が", meaning: "편의점의 불빛이 (コンビニ 편의점)" },
        { part: "やさしく", meaning: "부드럽게, 다정하게 (やさしい의 부사형)" },
        { part: "街を照らす", meaning: "거리를 비춘다" } ],
        notes: "い형용사 やさしい의 い를 く로 바꾸면 '~하게'라는 말이 돼요." },
      4: { translation: "구름 사이로 별 하나가 얼굴을 내밀었어", breakdown: [
        { part: "雲の間から", meaning: "구름 사이로 (間 사이 + から ~에서)" },
        { part: "星がひとつ", meaning: "별이 하나" },
        { part: "顔を出した", meaning: "얼굴을 내밀었다 (出す의 과거형)" } ],
        notes: "顔を出す는 '얼굴을 내밀다', 곧 '모습을 드러내다'라는 관용 표현이에요." },
      6: { translation: "신호가 초록불로 바뀌고, 너는 손을 흔들고 있어", breakdown: [
        { part: "信号が青になる", meaning: "신호가 초록불이 된다 (青 = 신호등의 초록불)" },
        { part: "君は", meaning: "너는" },
        { part: "手を振っている", meaning: "손을 흔들고 있다 (振る의 て형 + いる)" } ],
        notes: "〜ている는 지금 하고 있는 동작을 나타내요." },
      7: { translation: "'내일 봐'라는 말이 오늘은 조금 쓸쓸해", breakdown: [
        { part: "「また明日」の言葉が", meaning: "'또 내일'이라는 말이 (また 또 + 明日 내일)" },
        { part: "今日は", meaning: "오늘은 (は: 다른 날과 견줌)" },
        { part: "少しさびしい", meaning: "조금 쓸쓸하다" } ],
        notes: "また明日는 헤어질 때 하는 '내일 또 봐' 인사예요. 今日は의 は가 '다른 날과 달리 오늘은'이라는 느낌을 줘요." },
    },
    grammar: [
      { pattern: "〜て", meaning: "~하고 (동작 잇기)", line: 1, explanation: "동사 て형으로 동작을 차례로 이어요. たたむ → たたんで, 並ぶ → 並んで처럼 む·ぶ로 끝나는 동사는 んで가 돼요." },
      { pattern: "い형용사 + く", meaning: "~하게", line: 3, explanation: "やさしい → やさしく처럼 い를 く로 바꾸면 동사를 꾸미는 말이 돼요." },
      { pattern: "〜から", meaning: "~에서, ~로부터", line: 4, explanation: "출발점을 나타내요. 雲の間から = 구름 사이에서." },
      { pattern: "〜ている", meaning: "~하고 있다", line: 6, explanation: "동작이 이어지고 있는 것을 나타내요. 振っている = 흔들고 있다." },
    ],
  },
  {
    id: "pv-guitar",
    title: "放課後のギター",
    artist: "Utango 샘플",
    level: "N4",
    readings: { 弾: "ひ" },
    summary: "방과 후 음악실에서 기타를 치며 언젠가 큰 무대에 서겠다는 꿈을 키우는 풋풋한 노래예요.",
    lyrics: `放課後の音楽室で 古いギターを弾いた
下手なコードでも 君は笑ってくれた

夢はまだ遠くに見える 地図もないけれど
この歌があれば どこへでも行ける

いつか大きなステージで 約束を守るよ
今は小さな声で 毎日練習してるんだ`,
    vocab: [
      { word: "放課後", reading: "ほうかご", meaning: "방과 후", pos: "명사", jlpt: "N3", formInSong: "放課後", lines: [0], note: "放課(수업이 끝남)와 後(뒤)가 합쳐진 말이에요.", examples: [
        { ja: "放課後に友達とカフェへ行った。", ko: "방과 후에 친구와 카페에 갔다." },
        { ja: "放課後はいつも図書館にいる。", ko: "방과 후에는 늘 도서관에 있다." } ] },
      { word: "音楽室", reading: "おんがくしつ", meaning: "음악실", pos: "명사", jlpt: "기타", formInSong: "音楽室", lines: [0], note: "音楽(음악)와 室(방)가 합쳐진 말이에요.", examples: [
        { ja: "音楽室からピアノの音が聞こえる。", ko: "음악실에서 피아노 소리가 들린다." },
        { ja: "昼休みに音楽室で歌った。", ko: "점심시간에 음악실에서 노래했다." } ] },
      { word: "古い", reading: "ふるい", meaning: "낡다, 오래되다", pos: "형용사", jlpt: "N5", formInSong: "古い", lines: [0], note: "", examples: [
        { ja: "古い写真を見つけた。", ko: "오래된 사진을 찾았다." },
        { ja: "この町には古いお寺が多い。", ko: "이 마을에는 오래된 절이 많다." } ] },
      { word: "弾く", reading: "ひく", meaning: "(악기를) 치다, 연주하다", pos: "동사", jlpt: "N4", formInSong: "弾いた", lines: [0], note: "피아노·기타처럼 손으로 연주하는 악기에 써요. 과거형은 弾いた.", examples: [
        { ja: "毎晩ピアノを弾いています。", ko: "매일 밤 피아노를 치고 있어요." },
        { ja: "彼はギターを弾きながら歌った。", ko: "그는 기타를 치면서 노래했다." } ] },
      { word: "下手", reading: "へた", meaning: "서투름, 잘 못함", pos: "な형용사", jlpt: "N4", formInSong: "下手な", lines: [1], note: "반대말은 上手(じょうず, 잘함)예요.", examples: [
        { ja: "私は料理が下手です。", ko: "저는 요리를 못해요." },
        { ja: "下手でも毎日歌っている。", ko: "서툴러도 매일 노래하고 있다." } ] },
      { word: "君", reading: "きみ", meaning: "너", pos: "대명사", jlpt: "N4", formInSong: "君", lines: [1], note: "노래 가사에서 '너'를 부를 때 아주 자주 나와요.", examples: [
        { ja: "君がいてよかった。", ko: "네가 있어서 다행이야." },
        { ja: "君の夢は何？", ko: "네 꿈은 뭐야?" } ] },
      { word: "笑う", reading: "わらう", meaning: "웃다", pos: "동사", jlpt: "N4", formInSong: "笑って", lines: [1], note: "笑ってくれた = (나를 위해) 웃어 주었다.", examples: [
        { ja: "赤ちゃんが笑った。", ko: "아기가 웃었다." },
        { ja: "みんなで大きな声で笑った。", ko: "다 같이 큰 소리로 웃었다." } ] },
      { word: "夢", reading: "ゆめ", meaning: "꿈", pos: "명사", jlpt: "N4", formInSong: "夢", lines: [3], note: "", examples: [
        { ja: "歌手になるのが夢です。", ko: "가수가 되는 게 꿈이에요." },
        { ja: "昨日、怖い夢を見た。", ko: "어제 무서운 꿈을 꿨다." } ] },
      { word: "遠く", reading: "とおく", meaning: "먼 곳, 멀리", pos: "명사", jlpt: "N4", formInSong: "遠く", lines: [3], note: "", examples: [
        { ja: "遠くに山が見える。", ko: "멀리 산이 보인다." },
        { ja: "遠くから友達が来た。", ko: "먼 곳에서 친구가 왔다." } ] },
      { word: "地図", reading: "ちず", meaning: "지도", pos: "명사", jlpt: "N5", formInSong: "地図", lines: [3], note: "", examples: [
        { ja: "地図を見ながら歩いた。", ko: "지도를 보면서 걸었다." },
        { ja: "スマホの地図はとても便利だ。", ko: "스마트폰 지도는 아주 편리하다." } ] },
      { word: "歌", reading: "うた", meaning: "노래", pos: "명사", jlpt: "N5", formInSong: "歌", lines: [4], note: "", examples: [
        { ja: "この歌が大好きです。", ko: "이 노래를 정말 좋아해요." },
        { ja: "母が歌を歌っている。", ko: "엄마가 노래를 부르고 있다." } ] },
      { word: "約束", reading: "やくそく", meaning: "약속", pos: "명사", jlpt: "N4", formInSong: "約束", lines: [6], note: "", examples: [
        { ja: "友達と会う約束をした。", ko: "친구와 만날 약속을 했다." },
        { ja: "約束の時間に遅れた。", ko: "약속 시간에 늦었다." } ] },
      { word: "守る", reading: "まもる", meaning: "지키다", pos: "동사", jlpt: "N4", formInSong: "守る", lines: [6], note: "約束を守る = 약속을 지키다.", examples: [
        { ja: "ルールを守ってください。", ko: "규칙을 지켜 주세요." },
        { ja: "家族を守りたい。", ko: "가족을 지키고 싶다." } ] },
      { word: "声", reading: "こえ", meaning: "목소리, 소리", pos: "명사", jlpt: "N5", formInSong: "声", lines: [7], note: "", examples: [
        { ja: "小さな声で話した。", ko: "작은 목소리로 이야기했다." },
        { ja: "鳥の声で目が覚めた。", ko: "새소리에 잠이 깼다." } ] },
      { word: "毎日", reading: "まいにち", meaning: "매일", pos: "명사", jlpt: "N5", formInSong: "毎日", lines: [7], note: "", examples: [
        { ja: "毎日日本語を勉強します。", ko: "매일 일본어를 공부합니다." },
        { ja: "毎日同じ電車に乗る。", ko: "매일 같은 전철을 탄다." } ] },
      { word: "練習", reading: "れんしゅう", meaning: "연습", pos: "명사", jlpt: "N4", formInSong: "練習", lines: [7], note: "練習する(연습하다). 노래에서는 練習してる로 줄여 말했어요.", examples: [
        { ja: "毎朝ピアノの練習をする。", ko: "매일 아침 피아노 연습을 한다." },
        { ja: "試合のために練習している。", ko: "시합을 위해 연습하고 있다." } ] },
    ],
    explanations: {
      0: { translation: "방과 후 음악실에서 낡은 기타를 쳤어", breakdown: [
        { part: "放課後の音楽室で", meaning: "방과 후의 음악실에서 (で: 무언가를 하는 장소)" },
        { part: "古いギターを", meaning: "낡은 기타를" },
        { part: "弾いた", meaning: "쳤다 (弾く의 과거형)" } ],
        notes: "장소 뒤의 で는 그곳에서 무언가를 할 때 써요. 있는 곳은 に, 하는 곳은 で예요." },
      1: { translation: "서툰 코드인데도 너는 웃어 주었지", breakdown: [
        { part: "下手なコードでも", meaning: "서툰 코드라도 (下手な 서툰 + でも ~라도)" },
        { part: "君は", meaning: "너는" },
        { part: "笑ってくれた", meaning: "웃어 주었다 (笑う의 て형 + くれる의 과거형)" } ],
        notes: "〜てくれる는 남이 나를 위해 해 줄 때 써요. 고마운 마음이 담겨요." },
      3: { translation: "꿈은 아직 멀리 보이고, 지도도 없지만", breakdown: [
        { part: "夢はまだ", meaning: "꿈은 아직" },
        { part: "遠くに見える", meaning: "멀리 보인다 (遠く 먼 곳 + に + 見える 보이다)" },
        { part: "地図もないけれど", meaning: "지도도 없지만 (けれど ~지만)" } ],
        notes: "けれど는 앞뒤를 '~지만'으로 이어요. 말할 때는 けど로 줄이기도 해요." },
      4: { translation: "이 노래만 있으면 어디든 갈 수 있어", breakdown: [
        { part: "この歌があれば", meaning: "이 노래가 있으면 (ある의 가정형 あれば)" },
        { part: "どこへでも", meaning: "어디로든 (へ 방향 + でも ~든지)" },
        { part: "行ける", meaning: "갈 수 있다 (行く의 가능형)" } ],
        notes: "〜ば는 '~하면'이라는 조건이에요. 行く → 行ける처럼 끝을 える로 바꾸면 '~할 수 있다'가 돼요." },
      6: { translation: "언젠가 큰 무대에서 약속을 지킬게", breakdown: [
        { part: "いつか", meaning: "언젠가" },
        { part: "大きなステージで", meaning: "큰 무대에서 (大きな 큰)" },
        { part: "約束を守るよ", meaning: "약속을 지킬게 (よ: 다짐·알림)" } ],
        notes: "문장 끝 よ는 상대에게 알려 주거나 다짐하는 느낌을 더해요." },
      7: { translation: "지금은 작은 목소리로 매일 연습하고 있어", breakdown: [
        { part: "今は", meaning: "지금은 (は: 견줌)" },
        { part: "小さな声で", meaning: "작은 목소리로 (で: 수단)" },
        { part: "毎日練習してるんだ", meaning: "매일 연습하고 있어 (してる = している, んだ: 사정 설명)" } ],
        notes: "してる는 している를 줄인 말투예요. んだ는 사정을 설명하는 느낌을 줘요." },
    },
    grammar: [
      { pattern: "〜でも", meaning: "~라도", line: 1, explanation: "명사 뒤에 붙어 '~라도, ~인데도'라는 뜻이에요. どこへでも처럼 의문사 뒤에서는 '~든지'가 돼요." },
      { pattern: "〜てくれる", meaning: "(나를 위해) ~해 주다", line: 1, explanation: "남이 나에게 무언가를 해 줄 때 써요. 笑ってくれた = 웃어 주었다." },
      { pattern: "〜ば", meaning: "~하면", line: 4, explanation: "가정형. ある → あれば(있으면)처럼 조건이 이루어지면 뒤의 일이 일어난다는 뜻이에요." },
      { pattern: "〜てる", meaning: "~하고 있다 (말투)", line: 7, explanation: "〜ている에서 い가 빠진 말투예요. 練習してる = 연습하고 있다." },
    ],
  },
  // 단어장을 만드는 중인 노래
  {
    id: "pv-new",
    title: "星降る町",
    artist: "Utango 샘플",
    level: "N4",
    status: "analyzing",
    lyrics: `星降る町の 小さな駅で
君を待っていた 冬の夜`,
    vocab: [],
    grammar: [],
    explanations: {},
  },
  // 단어장 만들기에 실패한 노래
  {
    id: "pv-error",
    title: "はじまりの歌",
    artist: "Utango 샘플",
    level: "N5",
    status: "error",
    error: "AI가 잠시 바빠요. 조금 뒤에 다시 만들어 주세요.",
    lyrics: `新しい朝が来た
窓を開けて 深呼吸`,
    vocab: [],
    grammar: [],
    explanations: {},
  },
];
