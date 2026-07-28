export const MAX_RENDER_HZ = 30;
export const MAX_BACKING_PIXELS = 1920 * 1080;
export const MAX_DEVICE_PIXEL_RATIO = 1.5;

export function computeBackingScale(
  cssWidth,
  cssHeight,
  devicePixelRatio = 1,
  maxBackingPixels = MAX_BACKING_PIXELS,
) {
  const width = Math.max(1, Number(cssWidth) || 1);
  const height = Math.max(1, Number(cssHeight) || 1);
  const requestedScale = Math.max(0.1, Math.min(MAX_DEVICE_PIXEL_RATIO, Number(devicePixelRatio) || 1));
  const pixelBudgetScale = Math.sqrt(maxBackingPixels / (width * height));
  return Math.min(requestedScale, pixelBudgetScale);
}
