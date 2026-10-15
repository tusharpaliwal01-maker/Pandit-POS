/**
 * High-Precision Pure TypeScript CODE128 Barcode Generator (Subsets B & C Auto)
 * Emits sharp, scalable, high-contrast SVG strings for thermal label printers (TSC TE244)
 * and optical laser/CCD handheld scanner readability.
 */

// Code 128 character patterns: bar/space widths (1 to 4 units) summing to 11
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (106 is STOP)
];

const START_CODE_B = 104;
const START_CODE_C = 105;
const STOP_CODE = 106;

/**
 * Encodes text into Code 128 symbol sequence.
 * Uses Code 128 Subset C for numeric strings with even lengths (halves bar count, doubling thickness for effortless scanning).
 * Falls back to Subset B for alphanumeric codes.
 */
export function encodeCode128(text: string): { widths: number[]; checksum: number; mode: 'B' | 'C' } {
  const clean = String(text ?? '').trim().replace(/[^ -~]/g, '') || '000000';
  const isAllDigits = /^\d+$/.test(clean);
  const useSubsetC = isAllDigits && clean.length >= 2 && clean.length % 2 === 0;

  const codes: number[] = [];
  let checksum = 0;

  if (useSubsetC) {
    // Subset C (numeric pairs 00-99)
    codes.push(START_CODE_C);
    checksum = START_CODE_C;

    for (let i = 0; i < clean.length; i += 2) {
      const val = parseInt(clean.slice(i, i + 2), 10);
      codes.push(val);
      const position = codes.length - 1;
      checksum += val * position;
    }
  } else {
    // Subset B (ASCII 32 to 126)
    codes.push(START_CODE_B);
    checksum = START_CODE_B;

    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i) - 32;
      codes.push(code);
      const position = codes.length - 1;
      checksum += code * position;
    }
  }

  checksum = checksum % 103;
  codes.push(checksum);
  codes.push(STOP_CODE);

  const widths: number[] = [];
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (pattern) {
      for (let j = 0; j < pattern.length; j++) {
        widths.push(parseInt(pattern[j], 10));
      }
    }
  }

  return { widths, checksum, mode: useSubsetC ? 'C' : 'B' };
}

/**
 * Backwards-compatible alias for encodeCode128
 */
export function encodeCode128B(text: string): { widths: number[]; checksum: number } {
  const res = encodeCode128(text);
  return { widths: res.widths, checksum: res.checksum };
}

/**
 * Generates an ultra-crisp SVG string representation of CODE128
 * with optical quiet zones, pure white backdrop, and non-overlapping human-readable digits.
 */
export function generateCode128Svg(
  text: string,
  options: {
    height?: number;
    moduleWidth?: number;
    showText?: boolean;
    fontSize?: number;
  } = {}
): string {
  const clean = String(text ?? '').trim() || '000000';
  const { height = 48, moduleWidth = 2, showText = true, fontSize = 11 } = options;
  const { widths } = encodeCode128(clean);

  let totalModules = 0;
  for (const w of widths) {
    totalModules += w;
  }

  // Optical quiet zones: 10 modules on each side as mandated by ISO/IEC 15417
  const quietZone = 10 * moduleWidth;
  const barcodeWidth = totalModules * moduleWidth;
  const svgWidth = barcodeWidth + quietZone * 2;

  // Vertical budget: bars + 6px gap + font height + 3px baseline padding
  const textGap = showText ? 6 : 0;
  const textSpace = showText ? fontSize + 4 : 0;
  const svgHeight = height + textGap + textSpace;

  let currentX = quietZone;
  let isBar = true;
  let rects = '';

  for (const w of widths) {
    const barWidth = w * moduleWidth;
    if (isBar) {
      rects += `<rect x="${currentX}" y="0" width="${barWidth}" height="${height}" fill="#000000" />`;
    }
    currentX += barWidth;
    isBar = !isBar;
  }

  const textY = height + textGap + fontSize;
  const textElement = showText
    ? `<text class="barcode-number" x="${(svgWidth / 2).toFixed(1)}" y="${textY.toFixed(1)}" font-family="'JetBrains Mono', monospace, Arial, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="1" text-anchor="middle" fill="#000000">${clean}</text>`
    : '';

  // Include solid #ffffff backdrop so laser scanners have guaranteed contrast even if parent styling differs
  return `<svg class="barcode" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff" />${rects}${textElement}</svg>`;
}
