// data.js — 唯一のデータソース(コース・車種・注意文言)
//
// 情報時点: 2026年7月3日
// 出典:
//   - 料金体系(2022年4月改定・現行): 首都高速道路株式会社 料金表PDF
//     https://www.shutoko.jp/~/media/pdf/responsive/customer/fee/fee-info/220401_pamphlet_fee_table.pdf
//   - 料金距離(最短経路課金)の仕組み: 首都高ドライバーズサイト
//     https://www.shutoko.jp/fee/fee-info/pay_etc/distance/
//   - 2026年10月値上げ予定: 日本経済新聞 https://www.nikkei.com/article/DGXZQOCC242SD0U5A221C2000000/
//   - 深夜割引(0-4時ETC): 首都高ドライバーズサイト https://www.shutoko.jp/fee/discount/plan_12/
//
// 【重要】軽・二輪の下限(270円)・上限(1,590円)は首都高公式の車種別表を直接確認できず、
// 計算式 (55km × 単価 + 150円) × 1.10 から逆算した推定値(アーキテクト確定判断)。
// また各コースの入口/出口間の料金距離(tollDistanceKm)は概算値であり、実際の距離は
// 首都高公式ルート検索(search.shutoko.jp)で要検証。詳細は about 画面・各コース notes を参照。

export const dataAsOf = "2026年7月3日時点";

/** 車種別 距離別料金の係数(ARCHITECT_DATA.md §1 確定値) */
export const vehicleClasses = [
  {
    id: "normal",
    label: "普通車",
    shortLabel: "普通車",
    ratePerKm: 29.52, // 円/km(税込)
    min: 300, // 下限料金(円)
    max: 1950, // 上限料金(円)
    capDistanceKm: 55, // 上限到達距離の目安(約55km)
  },
  {
    id: "kei",
    label: "軽・二輪",
    shortLabel: "軽・二輪",
    ratePerKm: 23.616, // 円/km(税込)
    min: 270, // 下限料金(円)・式からの推定値(公式表未確認)
    max: 1590, // 上限料金(円)・式からの推定値(公式表未確認)
    capDistanceKm: 55,
  },
];

// 2026年10月1日改定予定(未実施・参考値。about画面の予告文にのみ使用し、料金計算には使わない)
export const upcomingRevision = {
  effectiveDate: "2026年10月1日",
  normalRatePerKm: 32.472,
  normalMin: 300,
  normalMax: 2130,
  capDistanceKm: 55,
  note: "普通車の場合、1kmあたり単価が29.52円→32.472円、上限料金が1,950円→2,130円(約55km以上)に引き上げ予定。下限300円は据え置き予定。",
};

/** 深夜割引(0-4時 ETC入口通過限定・20%引き)。将来の制度変更に関する注記 */
export const nightDiscountInfo = {
  rate: 0.2,
  timeWindow: "0時〜4時",
  condition: "ETC車限定・入口通過時刻が0〜4時であること",
  futureChangeNote:
    "2026年度以降、対象時間帯が22時〜翌5時に拡大され、実際に深夜帯を走行した分だけ割引になる方式(後日還元)に変更される予定です。実施時期は本アプリ確認時点(2026年7月)で未確定です。",
};

/** 全コース共通で詳細画面 notes に必ず添える注記 */
export const COMMON_ROUTE_CAUTION =
  "出入口の方向・利用可否と最新の料金・経路は首都高公式ルート検索(search.shutoko.jp)で必ずご確認ください。";

/** アプリ全体の免責文言(about画面・フッター等で使用) */
export const disclaimerText =
  "料金・距離・出入口情報は2026年7月時点の概算です。実際の料金・通行可否は首都高ドライバーズサイト(shutoko.jp)の料金・ルート検索で必ずご確認ください。";

export const revisionNoticeText =
  "2026年10月1日に料金改定(約1割値上げ)が予定されています。";

export const safetyNoticeText =
  "運転中の画面注視・操作は道路交通法により禁止されており、罰則の対象となります。ルート確認・目的地設定は必ず停車中に行うか、同乗者が操作してください。本アプリの情報は参考情報であり、実際の料金・通行可否は首都高速道路公式サイト(shutoko.jp)でご確認ください。";

export const legalDrivingNoticeText =
  "交通ルールを守った周回は違法ではありませんが、速度超過・車間距離不保持などの危険運転は絶対にやめてください。";

/** PA夜間閉鎖に関する注意(about画面用) */
export const paClosureNoticeText =
  "辰巳第一PA・芝浦PA・箱崎PAはルーレット族対策のため夜間(22時頃〜翌4時頃)閉鎖されることがあります(2024年時点で確認)。大黒PA(横浜)は週末夜間に閉鎖されることがあります。夜景目的で立ち寄る場合は道路情報板や公式Xで最新の開閉情報を確認してください。";

/**
 * コースデータ(7コース、ARCHITECT_DATA.md §2 確定版を忠実に転記)
 * tollDistanceKm はすべて概算値(概算フラグは UI 側で「概算」表示する前提)。
 * pas: 立ち寄れるPA(なければ空配列)
 * mapPath: js/map.js のハイライト対象キー
 */
export const courses = [
  {
    id: "c1-loop",
    name: "C1都心環状線 ぐるり一周",
    tagline: "首都高周回の王道。最低料金で都心のド真ん中を一周",
    entry: { name: "霞が関入口", route: "C1" },
    exit: { name: "代官町出口", route: "C1" },
    tollDistanceKm: 2.0,
    tollDistanceApprox: true,
    drivingDistanceKm: 16,
    durationMin: 25,
    waypoints: [
      "霞が関入口",
      "谷町JCT",
      "一ノ橋JCT",
      "浜崎橋JCT",
      "汐留JCT",
      "京橋JCT",
      "江戸橋JCT",
      "神田橋JCT",
      "竹橋JCT",
      "代官町出口",
    ],
    pas: [],
    highlights: ["皇居の森", "銀座・丸の内のビル群", "東京タワー遠望"],
    night: 4,
    tags: ["定番", "初心者向け"],
    mapPath: "c1",
    notes:
      "呉服橋・江戸橋出入口は2021年5月に廃止済み。C1は車線変更が多くカーブがきついので初回は日中がおすすめ。",
  },
  {
    id: "c2-loop",
    name: "C2中央環状線 大一周",
    tagline: "山手トンネルから湾岸まで、約60kmの大環状チャレンジ",
    entry: { name: "平井大橋入口", route: "C2" },
    exit: { name: "四つ木出口", route: "C2" },
    tollDistanceKm: 3.0,
    tollDistanceApprox: true,
    drivingDistanceKm: 60,
    durationMin: 75,
    waypoints: [
      "平井大橋入口",
      "堀切JCT",
      "江北JCT",
      "板橋JCT",
      "熊野町JCT",
      "西新宿JCT",
      "大橋JCT",
      "大井JCT",
      "(湾岸線)",
      "東雲JCT",
      "葛西JCT",
      "四つ木出口",
    ],
    pas: [],
    highlights: ["山手トンネル(日本屈指の長大トンネル)", "東京港トンネル", "荒川沿いの夜景"],
    night: 3,
    tags: ["ロングラン"],
    mapPath: "c2",
    notes:
      "C2本線は約47km(大井JCT〜葛西JCT)。湾岸線で環を閉じると一周約60km。トンネル区間が長いので換気・休憩に注意。八潮PAは6号三郷線側のため本コースからは立ち寄れません。",
  },
  {
    id: "daikoku-cruise",
    name: "湾岸線・大黒PAナイトクルーズ",
    tagline: "車好きの聖地・大黒PAへ。ベイブリッジと工場夜景を往復で",
    entry: { name: "新木場入口", route: "湾岸線" },
    exit: { name: "葛西出口", route: "湾岸線" },
    tollDistanceKm: 4.0,
    tollDistanceApprox: true,
    drivingDistanceKm: 70,
    durationMin: 90,
    waypoints: [
      "新木場入口",
      "東京港トンネル",
      "大井JCT付近",
      "川崎航路トンネル",
      "鶴見つばさ橋",
      "大黒PA",
      "大黒JCT(折返し)",
      "湾岸線東行き",
      "葛西出口",
    ],
    pas: [{ name: "大黒PA", note: "カスタムカー・スポーツカーの聖地。週末夜間閉鎖の可能性あり" }],
    highlights: ["横浜ベイブリッジ", "鶴見つばさ橋", "川崎の工場夜景", "みなとみらい遠望"],
    night: 5,
    tags: ["夜景", "聖地巡礼"],
    mapPath: "bayshore",
    notes: "大黒PAは週末夜間に閉鎖されることがある。道路情報板・公式Xで最新の開閉情報を確認してから向かうこと。",
  },
  {
    id: "rainbow-short",
    name: "レインボーブリッジ夜景ショートループ",
    tagline: "1時間以内でベイエリアの名所を総なめ",
    entry: { name: "芝公園入口", route: "C1" },
    exit: { name: "京橋出口", route: "C1" },
    tollDistanceKm: 3.5,
    tollDistanceApprox: true,
    drivingDistanceKm: 25,
    durationMin: 40,
    waypoints: [
      "芝公園入口",
      "浜崎橋JCT",
      "11号台場線",
      "レインボーブリッジ",
      "有明JCT",
      "湾岸線東行き",
      "辰巳JCT",
      "9号深川線",
      "箱崎JCT",
      "江戸橋JCT",
      "京橋出口",
    ],
    pas: [],
    highlights: ["レインボーブリッジ", "東京タワー", "豊洲・晴海のタワマン夜景"],
    night: 5,
    tags: ["夜景", "定番", "初心者向け"],
    mapPath: "rainbow",
    notes:
      "芝浦PA・辰巳第一PAはルーレット族対策で夜間(22時頃〜翌4時頃)閉鎖が続いている(2024年時点確認)。立ち寄りは日中〜夜早めに。",
  },
  {
    id: "grand-tour",
    name: "首都高グランドツアー(最長大回り)",
    tagline: "最低料金のまま100km超。C2+湾岸+C1を全部乗せ",
    entry: { name: "初台南入口", route: "C2" },
    exit: { name: "富ヶ谷出口", route: "C2" },
    tollDistanceKm: 2.0,
    tollDistanceApprox: true,
    drivingDistanceKm: 110,
    durationMin: 150,
    waypoints: [
      "初台南入口",
      "C2内回り",
      "大井JCT",
      "湾岸線",
      "有明JCT",
      "11号台場線",
      "レインボーブリッジ",
      "浜崎橋JCT",
      "C1",
      "江戸橋JCT",
      "6号向島線",
      "箱崎JCT",
      "9号深川線",
      "辰巳JCT",
      "湾岸線",
      "葛西JCT",
      "C2内回り",
      "富ヶ谷出口",
    ],
    pas: [],
    highlights: ["山手トンネル", "レインボーブリッジ", "都心夜景をほぼ全部"],
    night: 5,
    tags: ["ロングラン", "上級者向け"],
    mapPath: "grand",
    notes:
      "燃料と体力に注意。2時間超の長丁場なので途中PA休憩を計画的に。経路は一例で、同じ入口/出口なら料金は変わらない。大黒PAを経路に足すことも可能。",
  },
  {
    id: "heiwajima-godzilla",
    name: "羽田線・平和島PAゴジラルート",
    tagline: "シン・ゴジラ上陸ルートを逆走(合法)。空港夜景つき",
    entry: { name: "芝公園入口", route: "C1" },
    exit: { name: "汐留出口", route: "C1" },
    tollDistanceKm: 1.5,
    tollDistanceApprox: true,
    drivingDistanceKm: 35,
    durationMin: 55,
    waypoints: [
      "芝公園入口",
      "浜崎橋JCT",
      "1号羽田線",
      "平和島PA",
      "昭和島JCT",
      "湾岸線東行き",
      "東京港トンネル",
      "有明JCT",
      "11号台場線",
      "レインボーブリッジ",
      "浜崎橋JCT",
      "汐留出口",
    ],
    pas: [{ name: "平和島PA", note: "ゴジラ関連展示・ラーメン自動調理機・ファミマ自販機コンビニ" }],
    highlights: ["平和島PAのゴジラ関連展示", "京浜運河", "羽田空港方面の夜景", "レインボーブリッジ"],
    night: 4,
    tags: ["ネタ", "夜景"],
    mapPath: "haneda",
    notes: "平和島PAは1号羽田線上り側。ラーメン自動調理機とファミマ自販機コンビニあり。",
  },
  {
    id: "yoyogi-sunset",
    name: "新宿線・代々木PA夕景ルート",
    tagline: "神宮の森と新宿高層ビル群をコンパクトに",
    entry: { name: "新宿入口", route: "4号" },
    exit: { name: "初台出口", route: "4号" },
    tollDistanceKm: 1.5,
    tollDistanceApprox: true,
    drivingDistanceKm: 20,
    durationMin: 35,
    waypoints: [
      "新宿入口",
      "代々木PA",
      "三宅坂JCT",
      "C1外回り",
      "谷町JCT",
      "3号渋谷線",
      "大橋JCT",
      "C2内回り(山手トンネル)",
      "西新宿JCT",
      "4号新宿線",
      "初台出口",
    ],
    pas: [{ name: "代々木PA", note: "環境配慮型エコPA。代々木の森を一望" }],
    highlights: ["代々木の森", "新宿副都心の高層ビル群", "大橋JCTのループ"],
    night: 3,
    tags: ["初心者向け", "夕景"],
    mapPath: "yoyogi",
    notes: "代々木PAは4号新宿線上り側の環境配慮型PA。夕暮れ時が最も映える。",
  },
];
