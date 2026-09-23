// canvas の上限。iOS Safari は面積 4096×4096（約1,677万px）を超えると描画できず
// toBlob が null を返すため、そこに合わせる。一辺は余裕を見て 8192
export const MAX_CANVAS_EDGE = 8192;
export const MAX_CANVAS_AREA = 4096 * 4096;

// 要求された倍率を、ページの原寸（scale 1 の幅・高さ）から canvas 上限に収まる値に丸める
export const clampScale = (base: { width: number; height: number }, requested: number): number => {
  const byEdge = MAX_CANVAS_EDGE / Math.max(base.width, base.height);
  const byArea = Math.sqrt(MAX_CANVAS_AREA / (base.width * base.height));
  return Math.min(requested, byEdge, byArea);
};
