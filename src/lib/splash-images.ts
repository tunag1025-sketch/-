/**
 * iPhone·iPad 홈 화면 앱의 시작 이미지 (public/splash). 앱 안 시작 화면(#splash)을 기기 크기마다 그대로 찍은 것이다.
 * 밝은·어두운 화면 두 가지. 기기 목록을 바꾸면 이미지도 다시 만들어야 한다:
 * 앱을 띄우고 자바스크립트를 끈 브라우저로 "/"를 기기 크기·배율마다 열어 찍는다 (시작 화면이 그대로 보인다).
 */
// [CSS 너비, CSS 높이, 픽셀 배율] — 세로 화면
export const SPLASH_DEVICES: [number, number, number][] = [
  [440, 956, 3], // iPhone 16·17 Pro Max
  [430, 932, 3], // iPhone 14·15 Pro Max, 15·16 Plus
  [420, 912, 3], // iPhone Air
  [402, 874, 3], // iPhone 16 Pro, 17, 17 Pro
  [393, 852, 3], // iPhone 14 Pro, 15, 15 Pro, 16
  [428, 926, 3], // iPhone 12·13 Pro Max, 14 Plus
  [390, 844, 3], // iPhone 12, 13, 14, 16e
  [375, 812, 3], // iPhone X, XS, 11 Pro, 12·13 mini
  [414, 896, 3], // iPhone XS Max, 11 Pro Max
  [414, 896, 2], // iPhone XR, 11
  [414, 736, 3], // iPhone 8 Plus
  [375, 667, 2], // iPhone 8, SE 2·3
  [320, 568, 2], // iPhone SE 1
  [1032, 1376, 2], // iPad Pro 13 (M4)
  [1024, 1366, 2], // iPad Pro 12.9
  [834, 1210, 2], // iPad Pro 11 (M4)
  [834, 1194, 2], // iPad Pro 11
  [820, 1180, 2], // iPad Air, iPad 10
  [810, 1080, 2], // iPad 7–9
  [768, 1024, 2], // iPad mini 5, iPad 9.7
  [744, 1133, 2], // iPad mini 6
];

export const splashFile = (theme: "light" | "dark", [w, h, r]: [number, number, number]) =>
  `${theme}-${w * r}x${h * r}.png`;

export const SPLASH_IMAGES = SPLASH_DEVICES.flatMap((d) =>
  (["light", "dark"] as const).map((theme) => ({
    url: `/splash/${splashFile(theme, d)}`,
    media:
      `(device-width: ${d[0]}px) and (device-height: ${d[1]}px) and (-webkit-device-pixel-ratio: ${d[2]}) ` +
      `and (orientation: portrait) and (prefers-color-scheme: ${theme})`,
  })),
);
