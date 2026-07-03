// app.js — エントリ・画面遷移(ハッシュルータ)・描画・状態管理
// 責務: 状態管理とDOM描画のみ。データは data.js、料金計算は toll.js、路線図は map.js に委譲する。

import {
  courses,
  vehicleClasses,
  dataAsOf,
  upcomingRevision,
  nightDiscountInfo,
  disclaimerText,
  revisionNoticeText,
  safetyNoticeText,
  legalDrivingNoticeText,
  paClosureNoticeText,
  COMMON_ROUTE_CAUTION,
} from "./data.js";
import { tollForCourse, costPerKm } from "./toll.js";
import { renderMap } from "./map.js";

const STORAGE = {
  vehicle: "shutoko-gururi:vehicleClass",
  favorites: "shutoko-gururi:favorites",
  sort: "shutoko-gururi:sortMode",
  night: "shutoko-gururi:nightDiscount",
  seenSafety: "shutoko-gururi:seenSafety",
  hasHomeEntry: "shutoko-gururi:hasHomeEntry",
};

const SORT_MODES = [
  { id: "cost", label: "コスパ順(円/kmが安い)" },
  { id: "price", label: "料金が安い順" },
  { id: "distance", label: "走行距離が長い順" },
  { id: "duration", label: "所要時間が短い順" },
];

// --- localStorage ラッパー(プライベートブラウズ等での例外を吸収) ---
function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* 無視: 保存できなくてもアプリ自体は動作継続 */
  }
}

// --- 状態 ---
const state = {
  vehicle: safeGet(STORAGE.vehicle) === "kei" ? "kei" : "normal",
  favorites: new Set(JSON.parse(safeGet(STORAGE.favorites) || "[]")),
  sort: SORT_MODES.some((m) => m.id === safeGet(STORAGE.sort)) ? safeGet(STORAGE.sort) : "cost",
  night: safeGet(STORAGE.night) === "1",
};

function setVehicle(id) {
  state.vehicle = id;
  safeSet(STORAGE.vehicle, id);
  render();
}
function toggleFavorite(courseId) {
  if (state.favorites.has(courseId)) {
    state.favorites.delete(courseId);
  } else {
    state.favorites.add(courseId);
  }
  safeSet(STORAGE.favorites, JSON.stringify([...state.favorites]));
}
function setSort(id) {
  state.sort = id;
  safeSet(STORAGE.sort, id);
  render();
}
function setNight(on) {
  state.night = on;
  safeSet(STORAGE.night, on ? "1" : "0");
  render();
}

// --- フォーマッタ ---
function formatYen(n) {
  return `¥${n.toLocaleString("ja-JP")}`;
}
function formatKm(n) {
  return Number.isInteger(n) ? `${n}km` : `${n.toFixed(1)}km`;
}
function stars(n) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// --- ルーター ---
function parseRoute() {
  const hash = window.location.hash || "#/";
  if (hash === "#/" || hash === "") return { name: "home" };
  const courseMatch = hash.match(/^#\/course\/([\w-]+)$/);
  if (courseMatch) return { name: "detail", id: courseMatch[1] };
  if (hash === "#/about") return { name: "about" };
  return { name: "home" };
}

function goBack() {
  if (safeGet(STORAGE.hasHomeEntry) === "1" && window.history.length > 1) {
    window.history.back();
  } else {
    window.location.hash = "#/";
  }
}

// --- ヘッダー描画 ---
function renderHeader(route) {
  const header = document.getElementById("app-header");
  if (route.name === "home") {
    header.innerHTML = `
      <h1>首都高ぐるり</h1>
      <span class="header-spacer"></span>
      <a class="header-link" href="#/about">料金の仕組み</a>
    `;
  } else if (route.name === "detail") {
    header.innerHTML = `
      <button type="button" class="header-btn" id="back-btn" aria-label="コース一覧に戻る">← 戻る</button>
      <span class="header-spacer"></span>
    `;
    header.querySelector("#back-btn").addEventListener("click", goBack);
  } else if (route.name === "about") {
    header.innerHTML = `
      <button type="button" class="header-btn" id="back-btn" aria-label="コース一覧に戻る">← 戻る</button>
      <span class="header-spacer"></span>
      <h1 style="font-size:0.95rem;">料金の仕組み</h1>
    `;
    header.querySelector("#back-btn").addEventListener("click", goBack);
  }
}

// --- コースカード ---
function courseCardHtml(course) {
  const toll = tollForCourse(course, state.vehicle, { night: state.night });
  const cpk = costPerKm(course, state.vehicle, { night: state.night });
  const isFav = state.favorites.has(course.id);
  return `
    <li class="course-card">
      <a class="course-card-link" href="#/course/${course.id}" aria-label="${escapeHtml(course.name)}の詳細を見る"></a>
      <div class="card-top">
        <div>
          <div class="card-name">${escapeHtml(course.name)}</div>
          <div class="card-tagline">${escapeHtml(course.tagline)}</div>
        </div>
        <button type="button" class="fav-btn" data-fav-id="${course.id}" aria-pressed="${isFav}" aria-label="${isFav ? "お気に入りから外す" : "お気に入りに追加"}">♥</button>
      </div>
      <div class="card-price-row">
        <span class="card-price">${formatYen(toll)}</span>
        <span class="card-price-unit">${state.night ? "深夜割引適用" : "通常料金"}</span>
        <span class="cost-badge">¥${cpk}/km</span>
      </div>
      <div class="card-meta">
        <span>走行 ${formatKm(course.drivingDistanceKm)}</span>
        <span>${course.durationMin}分</span>
        <span class="stars" aria-label="夜景評価${course.night}/5">${stars(course.night)}</span>
      </div>
      <div class="tag-row">
        ${course.tags.map((t) => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")}
      </div>
    </li>
  `;
}

function sortedCourses() {
  const list = [...courses];
  const withMetrics = list.map((c) => ({
    course: c,
    toll: tollForCourse(c, state.vehicle, { night: state.night }),
    cpk: costPerKm(c, state.vehicle, { night: state.night }),
  }));
  switch (state.sort) {
    case "price":
      withMetrics.sort((a, b) => a.toll - b.toll);
      break;
    case "distance":
      withMetrics.sort((a, b) => b.course.drivingDistanceKm - a.course.drivingDistanceKm);
      break;
    case "duration":
      withMetrics.sort((a, b) => a.course.durationMin - b.course.durationMin);
      break;
    case "cost":
    default:
      withMetrics.sort((a, b) => a.cpk - b.cpk);
      break;
  }
  return withMetrics.map((m) => m.course);
}

// --- ホーム画面 ---
function renderHome() {
  safeSet(STORAGE.hasHomeEntry, "1");
  const main = document.getElementById("app-main");
  const list = sortedCourses();

  main.innerHTML = `
    <div class="control-row">
      <div>
        <span class="control-label">車種</span>
        <div class="segmented" role="group" aria-label="車種選択">
          ${vehicleClasses
            .map(
              (v) =>
                `<button type="button" data-vehicle="${v.id}" class="${v.id === state.vehicle ? "active" : ""}">${escapeHtml(v.label)}</button>`
            )
            .join("")}
        </div>
      </div>
      <div>
        <span class="control-label">並べ替え</span>
        <div class="sort-select-wrap">
          <select class="sort-select" id="sort-select" aria-label="並べ替え">
            ${SORT_MODES.map((m) => `<option value="${m.id}" ${m.id === state.sort ? "selected" : ""}>${m.label}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="toggle-row">
        <div class="toggle-text">
          <span class="toggle-title">深夜割引(0-4時)</span>
          <span class="toggle-sub">ETC・入口0-4時通過で20%引き</span>
        </div>
        <button type="button" class="switch ${state.night ? "on" : ""}" id="night-toggle" role="switch" aria-checked="${state.night}" aria-label="深夜割引を適用"></button>
      </div>
    </div>

    <ul class="course-list">
      ${list.map(courseCardHtml).join("")}
    </ul>

    <p class="footer-disclaimer">${escapeHtml(disclaimerText)}</p>
  `;

  main.querySelectorAll("[data-vehicle]").forEach((btn) => {
    btn.addEventListener("click", () => setVehicle(btn.dataset.vehicle));
  });
  main.querySelector("#sort-select").addEventListener("change", (e) => setSort(e.target.value));
  main.querySelector("#night-toggle").addEventListener("click", () => setNight(!state.night));
  main.querySelectorAll("[data-fav-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(btn.dataset.favId);
      render();
    });
  });
}

// --- 詳細画面 ---
function renderDetail(id) {
  const main = document.getElementById("app-main");
  const course = courses.find((c) => c.id === id);
  if (!course) {
    main.innerHTML = `<div class="empty-state">コースが見つかりませんでした。<br><a class="header-link" href="#/">一覧に戻る</a></div>`;
    return;
  }

  const toll = tollForCourse(course, state.vehicle, { night: state.night });
  const cpk = costPerKm(course, state.vehicle, { night: state.night });
  const vehicleLabel = vehicleClasses.find((v) => v.id === state.vehicle).label;

  main.innerHTML = `
    <div class="detail-hero">
      <h2>${escapeHtml(course.name)}</h2>
      <p class="detail-tagline">${escapeHtml(course.tagline)}</p>
      <div class="hero-price">${formatYen(toll)}</div>
      <div class="hero-price-sub">${escapeHtml(vehicleLabel)}・${state.night ? "深夜割引適用(20%引)" : "通常料金"}・¥${cpk}/km</div>
      <div class="stat-grid">
        <div class="stat-box">
          <div class="stat-label">走行距離</div>
          <div class="stat-value">${formatKm(course.drivingDistanceKm)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">課金距離(概算)</div>
          <div class="stat-value">${formatKm(course.tollDistanceKm)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">所要時間</div>
          <div class="stat-value">${course.durationMin}分</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">夜景評価</div>
          <div class="stat-value stars" aria-label="夜景評価${course.night}/5">${stars(course.night)}</div>
        </div>
      </div>
      <p class="toll-note-line">課金対象は入口(${escapeHtml(course.entry.name)})↔出口(${escapeHtml(course.exit.name)})の最短 約${course.tollDistanceKm}km 分のみ(概算)。実走行 ${formatKm(course.drivingDistanceKm)} 周回しても料金は変わりません。</p>
    </div>

    <div class="section">
      <h3>路線図</h3>
      <div class="map-wrap"><div id="map-container"></div></div>
    </div>

    <div class="section">
      <h3>ルート行程</h3>
      <div class="timeline">
        ${course.waypoints
          .map(
            (wp, i) => `
          <div class="timeline-item">
            <div class="timeline-dot-col">
              <div class="timeline-dot"></div>
              ${i < course.waypoints.length - 1 ? '<div class="timeline-line"></div>' : ""}
            </div>
            <div class="timeline-label">${escapeHtml(wp)}</div>
          </div>`
          )
          .join("")}
      </div>
    </div>

    ${
      course.pas.length
        ? `<div class="section">
            <h3>立ち寄りPA</h3>
            ${course.pas.map((pa) => `<div class="pa-card"><div class="pa-name">${escapeHtml(pa.name)}</div><div class="pa-note">${escapeHtml(pa.note)}</div></div>`).join("")}
          </div>`
        : ""
    }

    <div class="section">
      <h3>見どころ</h3>
      <ul class="highlight-list">
        ${course.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}
      </ul>
    </div>

    <div class="section">
      <h3>注意事項</h3>
      <div class="notes-box">${escapeHtml(course.notes)}</div>
      <div class="notes-box">${escapeHtml(COMMON_ROUTE_CAUTION)}</div>
    </div>

    <p class="footer-disclaimer">${escapeHtml(disclaimerText)}</p>
  `;

  renderMap(main.querySelector("#map-container"), course);
}

// --- 料金の仕組み画面 ---
function renderAbout() {
  const main = document.getElementById("app-main");
  main.innerHTML = `
    <div class="about-lead">
      <p>首都高速のETC料金は「距離別料金制」です。料金は実際に走った距離や周回した回数ではなく、<strong>入口から出口までの首都高のみを利用した場合の最短経路距離</strong>(料金距離)で決まります。つまり、同じ入口・出口の組み合わせであれば、大回りして何十kmも周回しても、料金は最短距離分のみです。</p>
    </div>

    <div class="section">
      <h3>料金の計算式</h3>
      <div class="formula-box">料金(円) = 10円単位に四捨五入(<br>&nbsp;&nbsp;(料金距離km × 単価 + ターミナルチャージ150円) × 1.10<br>) を 下限〜上限の範囲でクリップ</div>
      <table class="fee-table">
        <thead>
          <tr><th>車種区分</th><th>単価(円/km)</th><th>下限料金</th><th>上限料金</th><th>上限到達距離</th></tr>
        </thead>
        <tbody>
          ${vehicleClasses
            .map(
              (v) =>
                `<tr><td>${escapeHtml(v.label)}</td><td>${v.ratePerKm}</td><td>${formatYen(v.min)}</td><td>${formatYen(v.max)}</td><td>約${v.capDistanceKm}km</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
      <p class="diagram-caption">※ 軽・二輪の下限・上限は首都高公式の車種別表を直接確認できておらず、計算式から逆算した推定値です(要検証)。</p>
    </div>

    <div class="section">
      <h3>大回りしても料金は最短距離分</h3>
      <div class="map-wrap">
        <svg viewBox="0 0 300 140" width="100%" role="img" aria-label="大回りの図解">
          <path d="M 40 100 C 90 20, 210 20, 260 100" fill="none" stroke="var(--border)" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" />
          <path d="M 40 100 C 70 130, 230 130, 260 100" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" />
          <circle cx="40" cy="100" r="6" fill="var(--entry-marker)" />
          <circle cx="260" cy="100" r="6" fill="var(--exit-marker)" />
          <text x="40" y="118" font-size="10" fill="var(--text-dim)" text-anchor="middle">入口</text>
          <text x="260" y="118" font-size="10" fill="var(--text-dim)" text-anchor="middle">出口</text>
          <text x="150" y="18" font-size="9" fill="var(--text-faint)" text-anchor="middle">料金距離(最短・課金対象)</text>
          <text x="150" y="132" font-size="9" fill="var(--accent)" text-anchor="middle">実走行(周回・料金に影響しない)</text>
        </svg>
      </div>
      <p class="diagram-caption">上図の緑線のように大きく周回しても、課金されるのは点線(入口↔出口の最短経路)の距離分だけです。</p>
    </div>

    <div class="section">
      <h3>現金車の場合</h3>
      <p class="about-lead">ETCを搭載していない現金車は、距離に関わらず車種ごとの<strong>上限額を入口で一律徴収</strong>されます(普通車${formatYen(vehicleClasses.find((v) => v.id === "normal").max)}・軽/二輪${formatYen(vehicleClasses.find((v) => v.id === "kei").max)})。距離別の割引はありません。</p>
    </div>

    <div class="section">
      <h3>深夜割引</h3>
      <p class="about-lead">${nightDiscountInfo.timeWindow}に入口を通過した場合(${nightDiscountInfo.condition})、料金が${Math.round(nightDiscountInfo.rate * 100)}%引きになります。</p>
      <div class="notice-block">${escapeHtml(nightDiscountInfo.futureChangeNote)}</div>
    </div>

    <div class="section">
      <h3>2026年10月の料金改定予告</h3>
      <div class="notice-block">${escapeHtml(revisionNoticeText)} ${escapeHtml(upcomingRevision.note)}</div>
    </div>

    <div class="section">
      <h3>近接した出入口の注意</h3>
      <p class="about-lead">地理上は近くに見える入口と出口でも、道路構造上の理由や交通規制により、実際には利用できない組み合わせがあります。本アプリのコース情報は概算であり、必ず首都高公式ルート検索で通行可否をご確認ください。</p>
    </div>

    <div class="section">
      <h3>パーキングエリアの夜間閉鎖について</h3>
      <div class="notice-block">${escapeHtml(paClosureNoticeText)}</div>
    </div>

    <div class="section">
      <h3>安全にご利用いただくために</h3>
      <div class="notice-block">${escapeHtml(safetyNoticeText)}</div>
      <div class="notice-block">${escapeHtml(legalDrivingNoticeText)}</div>
    </div>

    <p class="footer-disclaimer">${escapeHtml(disclaimerText)}<br>情報時点: ${escapeHtml(dataAsOf)}</p>
  `;
}

// --- 起動時の安全注意モーダル ---
function maybeShowSafetyModal() {
  if (safeGet(STORAGE.seenSafety) === "1") return;
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="safety-modal-title">
      <div class="modal-card">
        <h2 id="safety-modal-title">ご利用前に必ずお読みください</h2>
        <p>${escapeHtml(safetyNoticeText)}</p>
        <p>${escapeHtml(legalDrivingNoticeText)}</p>
        <button type="button" class="modal-agree-btn" id="agree-btn">同意して始める</button>
      </div>
    </div>
  `;
  root.querySelector("#agree-btn").addEventListener("click", () => {
    safeSet(STORAGE.seenSafety, "1");
    root.innerHTML = "";
  });
}

// --- 描画ディスパッチ ---
function render() {
  const route = parseRoute();
  renderHeader(route);
  if (route.name === "home") {
    renderHome();
  } else if (route.name === "detail") {
    renderDetail(route.id);
  } else if (route.name === "about") {
    renderAbout();
  }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  render();
  maybeShowSafetyModal();
});

// --- Service Worker 登録 ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* SW登録失敗時もアプリ自体は動作継続 */
    });
  });
}
