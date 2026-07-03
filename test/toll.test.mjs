// test/toll.test.mjs — toll.js の単体テスト(素のNode、依存ゼロ)
// 実行: node test/toll.test.mjs

import assert from "node:assert/strict";
import { tollForDistance, tollForCourse, costPerKm } from "../js/toll.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.error(`NG - ${name}`);
    console.error(`     ${err.message}`);
  }
}

// --- 下限料金 ---
test("普通車: 距離0kmは下限300円", () => {
  assert.equal(tollForDistance(0, "normal"), 300);
});
test("軽・二輪: 距離0kmは下限270円", () => {
  assert.equal(tollForDistance(0, "kei"), 270);
});
test("普通車: 4.3kmは下限300円のまま", () => {
  assert.equal(tollForDistance(4.3, "normal"), 300);
});
test("軽・二輪: 4.2kmは下限270円のまま", () => {
  assert.equal(tollForDistance(4.2, "kei"), 270);
});

// --- 境界 ±0.1km(下限を超えて料金が上がり始める境目) ---
test("普通車: 4.3km→4.4kmの境界で300円→310円に上がる", () => {
  assert.equal(tollForDistance(4.3, "normal"), 300);
  assert.equal(tollForDistance(4.4, "normal"), 310);
});
test("軽・二輪: 4.2km→4.3kmの境界で270円→280円に上がる", () => {
  assert.equal(tollForDistance(4.2, "kei"), 270);
  assert.equal(tollForDistance(4.3, "kei"), 280);
});

// --- 上限料金 ---
test("普通車: 55kmで上限1950円に到達", () => {
  assert.equal(tollForDistance(55, "normal"), 1950);
});
test("普通車: 60km(上限超)でも1950円でクリップされる", () => {
  assert.equal(tollForDistance(60, "normal"), 1950);
});
test("普通車: 100kmでも上限1950円", () => {
  assert.equal(tollForDistance(100, "normal"), 1950);
});
test("軽・二輪: 55kmで上限1590円に到達", () => {
  assert.equal(tollForDistance(55, "kei"), 1590);
});
test("軽・二輪: 60km(上限超)でも1590円でクリップされる", () => {
  assert.equal(tollForDistance(60, "kei"), 1590);
});

// --- 中間距離の計算式検証 ---
test("普通車: 10kmは計算式どおり490円", () => {
  // (10*29.52+150)*1.1 = 489.72 -> round10 = 490
  assert.equal(tollForDistance(10, "normal"), 490);
});
test("軽・二輪: 10kmは計算式どおり430円", () => {
  // (10*23.616+150)*1.1 = 424.176 -> round10 = 420
  assert.equal(tollForDistance(10, "kei"), 420);
});

// --- 深夜割引(0-4時, ETC限定, ×0.8, 10円単位四捨五入, 下限クリップ後に適用) ---
test("普通車: 10km・深夜割引ONで490円->390円", () => {
  assert.equal(tollForDistance(10, "normal", { night: true }), 390);
});
test("普通車: 下限300円・深夜割引ONで240円", () => {
  assert.equal(tollForDistance(0, "normal", { night: true }), 240);
});
test("普通車: 上限1950円・深夜割引ONで1560円", () => {
  // 1950*0.8=1560 -> round10=1560
  assert.equal(tollForDistance(55, "normal", { night: true }), 1560);
});
test("軽・二輪: 10km・深夜割引ONで420円->340円", () => {
  // 420*0.8=336 -> round10=340
  assert.equal(tollForDistance(10, "kei", { night: true }), 340);
});

// --- tollForCourse / costPerKm ---
const dummyCourse = { tollDistanceKm: 2.0, drivingDistanceKm: 16 };
test("tollForCourse: 料金距離2.0km・普通車は下限300円", () => {
  assert.equal(tollForCourse(dummyCourse, "normal"), 300);
});
test("costPerKm: 300円 ÷ 16km = 19円/km(四捨五入)", () => {
  assert.equal(costPerKm(dummyCourse, "normal"), 19);
});
test("costPerKm: 深夜割引ON(240円)÷16km = 15円/km", () => {
  assert.equal(costPerKm(dummyCourse, "normal", { night: true }), 15);
});

// --- 不正な車種IDはエラー ---
test("未知の車種IDは例外を投げる", () => {
  assert.throws(() => tollForDistance(10, "unknown"));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
