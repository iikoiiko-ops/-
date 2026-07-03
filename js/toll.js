// toll.js — 首都高ETC料金計算(純関数のみ・データ非依存ロジック)
//
// 料金(円) = clamp( round10( (料金距離km × 単価 + ターミナルチャージ150円) × 1.10 ), 下限, 上限 )
// round10 = 10円単位に四捨五入
// 出典・確定値は js/data.js を参照(ARCHITECT_DATA.md 確定版に準拠)

import { vehicleClasses } from "./data.js";

const TERMINAL_CHARGE = 150; // ターミナルチャージ(円)
const TAX_RATE = 1.1; // 消費税込み係数

/** 10円単位に四捨五入 */
function round10(yen) {
  return Math.round(yen / 10) * 10;
}

/** 値を下限〜上限内に収める */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getVehicleClass(vehicleClassId) {
  const vc = vehicleClasses.find((v) => v.id === vehicleClassId);
  if (!vc) {
    throw new Error(`unknown vehicleClassId: ${vehicleClassId}`);
  }
  return vc;
}

/**
 * 距離(km)と車種から通行料金(円)を算出する。
 * @param {number} km 料金距離(km)
 * @param {string} vehicleClassId "normal" | "kei"
 * @param {{ night?: boolean }} [opts] night: true で深夜割引(0-4時入口通過, ETC限定)を適用
 * @returns {number} 料金(円)
 */
export function tollForDistance(km, vehicleClassId, opts = {}) {
  const { night = false } = opts;
  const vc = getVehicleClass(vehicleClassId);
  const raw = (km * vc.ratePerKm + TERMINAL_CHARGE) * TAX_RATE;
  const base = clamp(round10(raw), vc.min, vc.max);
  if (!night) return base;
  // 深夜割引は下限クリップ後の料金に対して×0.8、10円単位で再度四捨五入
  return round10(base * 0.8);
}

/**
 * コースの料金距離(tollDistanceKm)から料金を算出する。
 * @param {object} course data.js の courses 要素
 * @param {string} vehicleClassId
 * @param {{ night?: boolean }} [opts]
 */
export function tollForCourse(course, vehicleClassId, opts = {}) {
  return tollForDistance(course.tollDistanceKm, vehicleClassId, opts);
}

/**
 * コスパ指標(円/km) = 料金 ÷ 実走行距離(drivingDistanceKm)。整数円に四捨五入。
 * @param {object} course
 * @param {string} vehicleClassId
 * @param {{ night?: boolean }} [opts]
 */
export function costPerKm(course, vehicleClassId, opts = {}) {
  const toll = tollForCourse(course, vehicleClassId, opts);
  return Math.round(toll / course.drivingDistanceKm);
}
