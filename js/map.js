// map.js — 首都高路線図のデフォルメSVG描画(トポロジー優先・地理的正確さは考慮しない)
// renderMap(container, course) がコース詳細画面から呼ばれる唯一の公開関数。

const CX = 200; // 全体の中心x
const CY = 160; // 全体の中心y
const R_C1 = 55; // C1(都心環状線)の半径
const R_C2 = 118; // C2(中央環状線)の半径
const R_RADIAL_IN = 55; // 放射路線の内側開始半径(C1と同じ)
const R_RADIAL_OUT = 158; // 放射路線の外側終了半径
const BAYSHORE_Y = 330; // 湾岸線(横一直線)のy座標

function polar(angleDeg, radius, cx = CX, cy = CY) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
}

// 放射路線: 角度は北(0°)を基準に時計回り。地理よりトポロジー(接続関係)を優先した簡略配置。
const RADIALS = [
  { id: "route5", label: "5号池袋線", angle: -45 },
  { id: "route6", label: "6号向島線", angle: 25 },
  { id: "route7", label: "7号小松川線", angle: 65 },
  { id: "route9", label: "9号深川線", angle: 110 },
  { id: "route11", label: "11号台場線", angle: 155 },
  { id: "route1", label: "1号羽田線", angle: 200 },
  { id: "route3", label: "3号渋谷線", angle: 250 },
  { id: "route4", label: "4号新宿線", angle: -70 },
];

/** mapPath キーごとにハイライトする要素id一覧 */
const HIGHLIGHT_MAP = {
  c1: ["c1"],
  c2: ["c2"],
  bayshore: ["bayshore", "route9"],
  rainbow: ["c1", "route11", "bayshore", "route9"],
  grand: ["c1", "c2", "bayshore", "route11", "route9", "route6"],
  haneda: ["c1", "route1", "bayshore", "route11"],
  yoyogi: ["c1", "route3", "c2", "route4"],
};

/** mapPath キーごとの入口/出口/PA/ランドマークの表示位置(デフォルメ座標) */
const MARKERS = {
  c1: {
    entry: { ...polar(200, R_C1), label: "霞が関入口" },
    exit: { ...polar(260, R_C1), label: "代官町出口" },
    pas: [],
  },
  c2: {
    entry: { ...polar(20, R_C2), label: "平井大橋入口" },
    exit: { ...polar(45, R_C2), label: "四つ木出口" },
    pas: [],
  },
  bayshore: {
    entry: { x: 300, y: BAYSHORE_Y, label: "新木場入口" },
    exit: { x: 330, y: BAYSHORE_Y, label: "葛西出口" },
    pas: [{ x: 90, y: BAYSHORE_Y, label: "大黒PA" }],
  },
  rainbow: {
    entry: { ...polar(190, R_C1), label: "芝公園入口" },
    exit: { ...polar(230, R_C1), label: "京橋出口" },
    pas: [],
    landmarks: [{ ...polar(155, R_RADIAL_OUT), label: "レインボーブリッジ" }],
  },
  grand: {
    entry: { ...polar(-55, R_C2), label: "初台南入口" },
    exit: { ...polar(-88, R_C2), label: "富ヶ谷出口" },
    pas: [],
  },
  haneda: {
    entry: { ...polar(190, R_C1), label: "芝公園入口" },
    exit: { ...polar(240, R_C1), label: "汐留出口" },
    pas: [{ ...polar(200, R_RADIAL_OUT), label: "平和島PA" }],
  },
  yoyogi: {
    entry: { ...polar(-70, R_RADIAL_OUT), label: "新宿入口" },
    exit: { ...polar(-68, (R_RADIAL_OUT + R_RADIAL_IN) / 2), label: "初台出口" },
    pas: [{ ...polar(-70, R_RADIAL_OUT - 15), label: "代々木PA" }],
  },
};

const SVG_NS = "http://www.w3.org/2000/svg";

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, v);
  }
  return node;
}

function buildBaseSvg() {
  const svg = el("svg", {
    viewBox: "0 0 400 400",
    width: "100%",
    role: "img",
    "aria-label": "首都高路線図(デフォルメ)",
  });

  // 湾岸線(下部の横ライン)
  const bayshore = el("path", {
    id: "route-bayshore",
    d: `M 40 ${BAYSHORE_Y} L 360 ${BAYSHORE_Y}`,
    class: "map-route",
    "data-id": "bayshore",
  });
  svg.appendChild(bayshore);

  // 放射路線
  for (const r of RADIALS) {
    const inner = polar(r.angle, R_RADIAL_IN);
    const outer = polar(r.angle, R_RADIAL_OUT);
    const line = el("path", {
      id: `route-${r.id}`,
      d: `M ${inner.x.toFixed(1)} ${inner.y.toFixed(1)} L ${outer.x.toFixed(1)} ${outer.y.toFixed(1)}`,
      class: "map-route",
      "data-id": r.id,
    });
    svg.appendChild(line);
    const labelPos = polar(r.angle, R_RADIAL_OUT + 10);
    const label = el("text", {
      x: labelPos.x.toFixed(1),
      y: labelPos.y.toFixed(1),
      class: "map-route-label",
      "text-anchor": "middle",
    });
    label.textContent = r.label;
    svg.appendChild(label);
  }

  // C2(中央環状線・外側の環)
  const c2 = el("circle", {
    id: "route-c2",
    cx: CX,
    cy: CY,
    r: R_C2,
    class: "map-route",
    "data-id": "c2",
  });
  svg.appendChild(c2);

  // C1(都心環状線・中央の環)
  const c1 = el("circle", {
    id: "route-c1",
    cx: CX,
    cy: CY,
    r: R_C1,
    class: "map-route",
    "data-id": "c1",
  });
  svg.appendChild(c1);

  // 路線ラベル(C1/C2/湾岸線)
  const c1Label = el("text", { x: CX, y: CY + 4, class: "map-center-label", "text-anchor": "middle" });
  c1Label.textContent = "C1";
  svg.appendChild(c1Label);

  const c2LabelPos = polar(-20, R_C2 + 10);
  const c2Label = el("text", { x: c2LabelPos.x, y: c2LabelPos.y, class: "map-route-label", "text-anchor": "middle" });
  c2Label.textContent = "C2";
  svg.appendChild(c2Label);

  const bayshoreLabel = el("text", { x: 200, y: BAYSHORE_Y + 16, class: "map-route-label", "text-anchor": "middle" });
  bayshoreLabel.textContent = "湾岸線";
  svg.appendChild(bayshoreLabel);

  return svg;
}

function addMarker(svg, x, y, label, type, labelSide = "above") {
  const g = el("g", { class: `map-marker map-marker-${type}` });
  const circle = el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: type === "pa" ? 5 : 6 });
  g.appendChild(circle);
  if (type === "pa") {
    const t = el("text", { x: x.toFixed(1), y: (y + 3).toFixed(1), class: "map-marker-glyph", "text-anchor": "middle" });
    t.textContent = "P";
    g.appendChild(t);
  }
  // entry/exit が近接するコースではラベルが重ならないよう上下に振り分ける
  const labelY = labelSide === "below" ? y + 17 : y - 10;
  const label_ = el("text", {
    x: x.toFixed(1),
    y: labelY.toFixed(1),
    class: "map-marker-label",
    "text-anchor": "middle",
  });
  label_.textContent = label;
  g.appendChild(label_);
  svg.appendChild(g);
}

/**
 * コース詳細画面のコンテナにSVG路線図を描画し、該当経路をハイライトする。
 * @param {HTMLElement} container
 * @param {object} course data.js の courses 要素
 */
export function renderMap(container, course) {
  container.innerHTML = "";
  const svg = buildBaseSvg();
  container.appendChild(svg);

  const highlightIds = HIGHLIGHT_MAP[course.mapPath] || [];
  for (const id of highlightIds) {
    const target = svg.querySelector(`[data-id="${id}"]`);
    if (!target) continue;
    target.classList.add("map-route--active");
    // stroke-dashoffset アニメーションでハイライトを描画
    requestAnimationFrame(() => {
      const length = target.getTotalLength();
      target.style.strokeDasharray = `${length}`;
      target.style.strokeDashoffset = `${length}`;
      // 強制リフローしてからアニメーション開始
      target.getBoundingClientRect();
      requestAnimationFrame(() => {
        target.style.transition = "stroke-dashoffset 1s ease-out";
        target.style.strokeDashoffset = "0";
      });
    });
  }

  const markers = MARKERS[course.mapPath];
  if (markers) {
    if (markers.entry) addMarker(svg, markers.entry.x, markers.entry.y, markers.entry.label, "entry", "above");
    if (markers.exit) addMarker(svg, markers.exit.x, markers.exit.y, markers.exit.label, "exit", "below");
    for (const pa of markers.pas || []) {
      addMarker(svg, pa.x, pa.y, pa.label, "pa");
    }
    for (const lm of markers.landmarks || []) {
      addMarker(svg, lm.x, lm.y, lm.label, "landmark");
    }
  }
}
