import { describe, expect, it } from 'vitest';
import { MAX_CANVAS_AREA, MAX_CANVAS_EDGE, clampScale } from './canvas-limits';

describe('clampScale', () => {
  it('上限に収まるページは要求どおりの倍率を返す', () => {
    // A4（595×842pt）を 4x → 2380×3368 = 約 800 万px
    expect(clampScale({ width: 595, height: 842 }, 4)).toBe(4);
  });

  it('面積が上限を超えるときは面積で丸める', () => {
    // A2（1191×1684pt）を 4x → 4764×6736 = 約 3,200 万px で 4096²（約 1,677 万px）を超える
    const scale = clampScale({ width: 1191, height: 1684 }, 4);
    expect(scale).toBeLessThan(4);
    expect(1191 * scale * (1684 * scale)).toBeLessThanOrEqual(MAX_CANVAS_AREA + 1);
  });

  it('一辺が上限を超えるときは一辺で丸める', () => {
    // 細長いページ（100×3000pt）を 4x → 12000px で一辺 8192 を超える
    const scale = clampScale({ width: 100, height: 3000 }, 4);
    expect(3000 * scale).toBeLessThanOrEqual(MAX_CANVAS_EDGE + 1e-6);
  });

  it('丸めた結果は要求値を超えない', () => {
    expect(clampScale({ width: 10, height: 10 }, 1.5)).toBe(1.5);
  });
});
