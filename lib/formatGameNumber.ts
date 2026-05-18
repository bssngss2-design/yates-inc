/**
 * Compact notation for idle-game numbers (groups of 1000: K … Tr).
 * Uses repeated /1000 so tier selection stays stable for large integers.
 */

const THOUSAND_SUFFIXES = [
  'K',
  'M',
  'B',
  'T',
  'Q',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
  'Un',
  'Dr',
  'Tr',
] as const;

function formatPositiveAbs(
  abs: number,
  fractionDigits: number,
): string {
  if (abs === 0) return '0';
  if (abs < 1000) {
    if (Number.isInteger(abs)) return String(Math.trunc(abs));
    return abs.toFixed(fractionDigits);
  }

  let m = abs;
  let divs = 0;
  while (m >= 1000 && divs < THOUSAND_SUFFIXES.length) {
    m /= 1000;
    divs++;
  }
  return `${m.toFixed(fractionDigits)}${THOUSAND_SUFFIXES[divs - 1]}`;
}

/**
 * @param raw - Money, HP, counts; coerced safely for UI (strings from saves, etc.)
 */
export function formatGameNumber(
  raw: number | string | bigint | null | undefined,
  fractionDigits = 1,
): string {
  if (raw === null || raw === undefined) return '0';

  if (typeof raw === 'bigint') {
    if (raw === 0n) return '0';
    const negative = raw < 0n;
    let v = negative ? -raw : raw;
    if (v < 1000n) return (negative ? '-' : '') + v.toString();

    let divs = 0;
    while (v >= 1000n && divs < THOUSAND_SUFFIXES.length) {
      v /= 1000n;
      divs++;
    }
    const mantissa = Number(v);
    if (!Number.isFinite(mantissa)) return '∞';
    const body = `${mantissa.toFixed(fractionDigits)}${THOUSAND_SUFFIXES[divs - 1]}`;
    return negative ? `-${body}` : body;
  }

  const n = typeof raw === 'string' ? Number(raw) : Number(raw);
  if (!Number.isFinite(n)) return '∞';
  if (n === 0) return '0';

  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return sign + formatPositiveAbs(abs, fractionDigits);
}
