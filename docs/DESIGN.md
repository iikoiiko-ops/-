# 首都高ぐるり — 安く周回できるコース提案アプリ 設計書

## 1. プロダクト概要

首都高速道路はETCの**距離別料金制**であり、料金は「入口と出口の間の最短経路距離」で
計算される。つまり、入口と出口を近接させたまま大回りで周回しても、料金は最短距離分
しか課金されない。この仕組みを利用して「最小料金で最大距離・最高の景色を楽しめる
周回コース」を提案するのが本アプリの目的。

ターゲット: ドライブ好き・夜景好き・二輪ツーリング層。iPhoneでの利用を前提とする。

## 2. プラットフォーム方針

**iOS Safari 最適化 PWA(静的サイト)** として実装する。

理由:
- ホーム画面追加でフルスクリーン起動(`apple-mobile-web-app-capable`)し、ネイティブ同等のUXを提供できる
- Service Worker によるオフラインキャッシュで、首都高のトンネル内(圏外)でも動作する
- ビルド工程・外部依存ゼロ(バニラ HTML/CSS/JS)で、この実行環境で完全に検証可能

### iOS最適化要件(必須)
- `viewport-fit=cover` + `env(safe-area-inset-*)` でノッチ/ホームインジケータ対応
- `apple-mobile-web-app-status-bar-style: black-translucent`
- `apple-touch-icon`(180×180 PNG)
- `-apple-system` フォントスタック、`-webkit-tap-highlight-color: transparent`
- `100dvh` ベースのレイアウト、`overscroll-behavior` 制御、慣性スクロール
- タップターゲット 44×44pt 以上(Apple HIG)
- ライト/ダークモード両対応(`prefers-color-scheme`)。夜間走行を想定しダークを主役に
- 300ms タップ遅延なし(`touch-action: manipulation`)

## 3. アーキテクチャ

```
/
├── index.html            エントリ(SPA)
├── manifest.webmanifest  PWAマニフェスト
├── sw.js                 Service Worker(cache-first、バージョン付きキャッシュ)
├── icons/                apple-touch-icon.png / icon-192.png / icon-512.png
├── css/app.css           全スタイル(CSS変数でテーマ管理)
├── js/
│   ├── app.js            エントリ・画面遷移(ハッシュルータ)・描画
│   ├── data.js           コース/IC/PAデータ(唯一のデータソース)
│   ├── toll.js           料金計算ロジック(車種別・距離別料金)
│   └── map.js            首都高路線図のSVG描画とコースハイライト
└── docs/DESIGN.md        本書
```

- フレームワーク・ライブラリ不使用。ES Modules。
- 画面は3つ: **コース一覧**(ホーム) / **コース詳細** / **料金について**(仕組み解説)。
- 状態: 選択車種とお気に入りを `localStorage` に永続化。
- ルーティング: `location.hash`(`#/course/c1-loop` など)。PWAスタンドアロンでも
  戻る操作が機能するよう history を素直に使う。

## 4. データモデル

```js
// data.js
export const vehicleClasses = [
  { id: "kei",    label: "軽・二輪",  min: 280, max: 1720, distanceTiers: [...] },
  { id: "normal", label: "普通車",    min: 320, max: 1950, distanceTiers: [...] },
  // 料金値はリサーチ結果で確定させる(下記 §6)
];

export const courses = [
  {
    id: "c1-loop",
    name: "C1 都心環状線ぐるり一周",
    tagline: "首都高周回の王道。最低料金で都心の夜景を独り占め",
    entry:  { name: "霞が関", route: "C1" },   // 入口IC
    exit:   { name: "代官町", route: "C1" },   // 出口IC
    tollDistanceKm: 2.0,   // 課金対象=入口出口間の最短距離
    drivingDistanceKm: 16.0, // 実走行距離(周回分)
    durationMin: 25,
    direction: "外回り",
    waypoints: ["霞が関入口", "谷町JCT", "一ノ橋JCT", "浜崎橋JCT", "江戸橋JCT", "竹橋JCT", "代官町出口"],
    pas: [],                // 立ち寄れるPA
    highlights: ["東京タワー", "レインボーブリッジ遠景", "丸の内ビル群"],
    night: 5,               // 夜景評価 1-5
    tags: ["定番", "初心者向け"],
    mapPath: "c1",          // map.js のハイライト対象
    notes: "…",
  },
  // C2一周 / 湾岸線+大黒PA / 辰巳PA夜景 / 最長大回りチャレンジ など 6〜8コース
];
```

**コスパ指標**: `料金 ÷ 実走行距離`(円/km)を全コースで算出し、一覧を安い順に
並べ替え可能にする。料金は `toll.js` が「課金距離 → 車種別料金」で計算する。

## 5. 料金計算(toll.js)

首都高ETC料金は 0.1km 単位の最短距離に対し、下限〜上限の間で距離帯別に段階課金。
`tollForDistance(km, vehicleClassId) -> 円` を純関数で実装し、距離帯テーブルは
`data.js` に置く。現金車は上限額固定である旨も解説画面に明記する。

## 6. データの正確性

料金体系・IC/JCT名・距離は実装前に Web リサーチで確認し、`data.js` 冒頭に
「◯年◯月時点の情報」と出典コメントを付す。アプリ内にも免責
(実際の料金は首都高ドライバーズサイトで要確認)を表示する。

## 7. 路線図(map.js)

外部地図タイルは使わない(オフライン要件・依存ゼロ)。首都高の主要路線
(C1・C2・湾岸線・主要放射線)を**デフォルメしたSVG路線図**として手描きし、
コース選択時に該当経路を色でハイライト+入口/出口/PAをマーカー表示する。
鉄道路線図と同様の抽象表現とし、正確な地理ではなくトポロジーを優先する。

## 8. 検証計画

- Playwright(Chromium)を iPhone 14/15 相当のビューポート(390×844, DPR3,
  タッチ)で起動し、全画面のスクリーンショット取得・console エラーゼロを確認
- ライト/ダーク両テーマの表示確認
- Service Worker 登録とオフラインリロードの確認
- `toll.js` は Node で単体テスト(境界距離での料金)

## 9. 役割分担

- 設計・仕様・レビュー・検証・統合: Claude Fable 5(本書の著者)
- リサーチ・実装: Claude Sonnet 5(サブエージェント)
