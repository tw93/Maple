import test from "node:test";
import assert from "node:assert/strict";
import { isDarkMonochromePixels } from "../bookmark/utils/favicon.js";

// 按比例拼一张 16x16 图标的像素，parts 是 [[r, g, b, a], 像素数]
const pixels = (parts) => {
  const data = [];
  for (const [rgba, n] of parts) for (let i = 0; i < n; i++) data.push(...rgba);
  return Uint8ClampedArray.from(data);
};

test("透明底上的黑色单色图标判为需要反相", () => {
  assert.equal(isDarkMonochromePixels(pixels([[[24, 23, 23, 255], 120], [[0, 0, 0, 0], 136]])), true);
});

test("黑底上带白色笔画的图标本身看得清，不反相", () => {
  assert.equal(isDarkMonochromePixels(pixels([[[0, 0, 0, 255], 220], [[255, 255, 255, 255], 36]])), false);
});

test("彩色和灰色图标不反相", () => {
  assert.equal(isDarkMonochromePixels(pixels([[[229, 9, 20, 255], 100], [[0, 0, 0, 0], 156]])), false);
  assert.equal(isDarkMonochromePixels(pixels([[[100, 100, 100, 255], 77], [[0, 0, 0, 0], 179]])), false);
});

test("几乎全透明的图标不判断", () => {
  assert.equal(isDarkMonochromePixels(pixels([[[0, 0, 0, 255], 4], [[0, 0, 0, 0], 252]])), false);
});
