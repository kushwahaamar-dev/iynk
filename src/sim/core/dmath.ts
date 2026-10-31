/*
 * Ports of the fdlibm kernels (FreeBSD msun) for sin, cos, atan2, exp, log and
 * pow. Only + - * /, sqrt, floor and abs are used, so every engine gives the
 * same Float64 bits where the built-in math functions may differ by an ulp.
 *
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 */

export const DMATH_VERSION = 1;

const scratch = new Float64Array(1);
const words = new Uint32Array(scratch.buffer);
const HI = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1 ? 1 : 0;
const LO = 1 - HI;

function highWord(x: number): number {
  scratch[0] = x;
  return words[HI] | 0;
}

function lowWord(x: number): number {
  scratch[0] = x;
  return words[LO];
}

function withHigh(x: number, high: number): number {
  scratch[0] = x;
  words[HI] = high;
  return scratch[0];
}

function withLow(x: number, low: number): number {
  scratch[0] = x;
  words[LO] = low;
  return scratch[0];
}

function fromWords(high: number, low: number): number {
  words[HI] = high;
  words[LO] = low;
  return scratch[0];
}

function truncate(x: number): number {
  return x < 0 ? -Math.floor(-x) : Math.floor(x);
}

function pow2(n: number): number {
  return fromWords((n + 1023) << 20, 0);
}

function scalbn(x: number, n: number): number {
  if (n < -1022) return x * pow2(n + 54) * pow2(-54);
  if (n > 1023) return x * pow2(1023) * pow2(n - 1023);
  return x * pow2(n);
}

const S1 = -1.66666666666666324348e-1;
const S2 = 8.33333333332248946124e-3;
const S3 = -1.98412698298579493134e-4;
const S4 = 2.75573137070700676789e-6;
const S5 = -2.50507602534068634195e-8;
const S6 = 1.5896909952115501022e-10;

function kernelSin(x: number, y: number, tail: boolean): number {
  if ((highWord(x) & 0x7fffffff) < 0x3e400000) return x;
  const z = x * x;
  const v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  if (!tail) return x + v * (S1 + z * r);
  return x - ((z * (0.5 * y - v * r) - y) - v * S1);
}

const C1 = 4.16666666666666019037e-2;
const C2 = -1.38888888888741095749e-3;
const C3 = 2.48015872894767294178e-5;
const C4 = -2.75573143513906633035e-7;
const C5 = 2.0875723212981748279e-9;
const C6 = -1.13596475577881948265e-11;

function kernelCos(x: number, y: number): number {
  const ix = highWord(x) & 0x7fffffff;
  if (ix < 0x3e400000) return 1;
  const z = x * x;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3fd33333) return 1 - (0.5 * z - (z * r - x * y));
  const qx = ix > 0x3fe90000 ? 0.28125 : fromWords(ix - 0x00200000, 0);
  const hz = 0.5 * z - qx;
  return 1 - qx - (hz - (z * r - x * y));
}

// 2/pi in 24-bit chunks.
const TWO_OVER_PI = [
  0xa2f983, 0x6e4e44, 0x1529fc, 0x2757d1, 0xf534dd, 0xc0db62, 0x95993c, 0x439041, 0xfe5163, 0xabdebb, 0xc561b7, 0x246e3a,
  0x424dd2, 0xe00649, 0x2eea09, 0xd1921c, 0xfe1deb, 0x1cb129, 0xa73ee8, 0x8235f5, 0x2ebb44, 0x84e99c, 0x7026b4, 0x5f7e41,
  0x3991d6, 0x398353, 0x39f49c, 0x845f8b, 0xbdf928, 0x3b1ff8, 0x97ffde, 0x05980f, 0xef2f11, 0x8b5a0a, 0x6d1f6d, 0x367ecf,
  0x27cb09, 0xb74f46, 0x3f669e, 0x5fea2d, 0x7527ba, 0xc7ebe5, 0xf17b3d, 0x0739f7, 0x8a5292, 0xea6bfb, 0x5fb11f, 0x8d5d08,
  0x560330, 0x46fc7b, 0x6babf0, 0xcfbc20, 0x9af436, 0x1da9e3, 0x91615e, 0xe61b08, 0x659985, 0x5f14a0, 0x68408d, 0xffd880,
  0x4d7327, 0x310606, 0x1556ca, 0x73a8c9, 0x60e27b, 0xc08c6b,
];

const PIO2 = [
  fromWords(0x3ff921fb, 0x40000000),
  fromWords(0x3e74442d, 0x00000000),
  fromWords(0x3cf84698, 0x80000000),
  fromWords(0x3b78cc51, 0x60000000),
  fromWords(0x39f01b83, 0x80000000),
  fromWords(0x387a2520, 0x40000000),
  fromWords(0x36e38222, 0x80000000),
  fromWords(0x3569f31d, 0x00000000),
];

const TWO24 = 16777216;
const TWON24 = 5.9604644775390625e-8;
const JK = 4;

/** Reduces tx (24-bit chunks of an argument scaled by 2^e0) modulo pi/2; writes the two-part remainder to out. */
function kernelRemPio2(tx: number[], out: number[], e0: number, nx: number): number {
  const jx = nx - 1;
  const jv = Math.max(0, Math.floor((e0 - 3) / 24));
  let q0 = e0 - 24 * (jv + 1);

  const f: number[] = [];
  for (let i = 0, j = jv - jx; i <= jx + JK; i++, j++) f[i] = j < 0 ? 0 : TWO_OVER_PI[j];

  const q: number[] = [];
  for (let i = 0; i <= JK; i++) {
    let fw = 0;
    for (let j = 0; j <= jx; j++) fw += tx[j] * f[jx + i - j];
    q[i] = fw;
  }

  let jz = JK;
  const iq: number[] = [];
  let z: number;
  let n: number;
  let ih: number;
  for (;;) {
    z = q[jz];
    for (let i = 0, j = jz; j > 0; i++, j--) {
      const fw = Math.floor(TWON24 * z);
      iq[i] = z - TWO24 * fw;
      z = q[j - 1] + fw;
    }
    z = scalbn(z, q0);
    z -= 8 * Math.floor(z * 0.125);
    n = Math.floor(z);
    z -= n;
    ih = 0;
    if (q0 > 0) {
      const i = iq[jz - 1] >> (24 - q0);
      n += i;
      iq[jz - 1] -= i << (24 - q0);
      ih = iq[jz - 1] >> (23 - q0);
    } else if (q0 === 0) {
      ih = iq[jz - 1] >> 23;
    } else if (z >= 0.5) {
      ih = 2;
    }

    if (ih > 0) {
      n += 1;
      let carry = 0;
      for (let i = 0; i < jz; i++) {
        const j = iq[i];
        if (carry === 0) {
          if (j !== 0) {
            carry = 1;
            iq[i] = 0x1000000 - j;
          }
        } else {
          iq[i] = 0xffffff - j;
        }
      }
      if (q0 === 1) iq[jz - 1] &= 0x7fffff;
      else if (q0 === 2) iq[jz - 1] &= 0x3fffff;
      if (ih === 2) {
        z = 1 - z;
        if (carry !== 0) z -= scalbn(1, q0);
      }
    }

    if (z !== 0) break;
    let j = 0;
    for (let i = jz - 1; i >= JK; i--) j |= iq[i];
    if (j !== 0) break;
    let k = 1;
    while (iq[JK - k] === 0) k++;
    for (let i = jz + 1; i <= jz + k; i++) {
      f[jx + i] = TWO_OVER_PI[jv + i];
      let fw = 0;
      for (let m = 0; m <= jx; m++) fw += tx[m] * f[jx + i - m];
      q[i] = fw;
    }
    jz += k;
  }

  if (z === 0) {
    jz -= 1;
    q0 -= 24;
    while (iq[jz] === 0) {
      jz--;
      q0 -= 24;
    }
  } else {
    z = scalbn(z, -q0);
    if (z >= TWO24) {
      const fw = Math.floor(TWON24 * z);
      iq[jz] = z - TWO24 * fw;
      jz += 1;
      q0 += 24;
      iq[jz] = fw;
    } else {
      iq[jz] = z;
    }
  }

  let fw = scalbn(1, q0);
  for (let i = jz; i >= 0; i--) {
    q[i] = fw * iq[i];
    fw *= TWON24;
  }

  const fq: number[] = [];
  for (let i = jz; i >= 0; i--) {
    let sum = 0;
    for (let k = 0; k <= JK && k <= jz - i; k++) sum += PIO2[k] * q[i + k];
    fq[jz - i] = sum;
  }

  fw = 0;
  for (let i = jz; i >= 0; i--) fw += fq[i];
  out[0] = ih === 0 ? fw : -fw;
  fw = fq[0] - fw;
  for (let i = 1; i <= jz; i++) fw += fq[i];
  out[1] = ih === 0 ? fw : -fw;
  return n & 7;
}

const INV_PIO2 = fromWords(0x3fe45f30, 0x6dc9c883);
const PIO2_1 = fromWords(0x3ff921fb, 0x54400000);
const PIO2_1T = fromWords(0x3dd0b461, 0x1a626331);
const PIO2_2 = fromWords(0x3dd0b461, 0x1a600000);
const PIO2_2T = fromWords(0x3ba3198a, 0x2e037073);
const PIO2_3 = fromWords(0x3ba3198a, 0x2e000000);
const PIO2_3T = fromWords(0x397b839a, 0x252049c1);

const remainder = [0, 0];
const chunks = [0, 0, 0];

/** x = n * pi/2 + (remainder[0] + remainder[1]); returns n. */
function remPio2(x: number): number {
  const hx = highWord(x);
  const ix = hx & 0x7fffffff;
  if (ix <= 0x3fe921fb) {
    remainder[0] = x;
    remainder[1] = 0;
    return 0;
  }

  if (ix < 0x4002d97c) {
    const sign = hx > 0 ? 1 : -1;
    let z = x - sign * PIO2_1;
    let y0: number;
    if (ix !== 0x3ff921fb) {
      y0 = z - sign * PIO2_1T;
      remainder[1] = z - y0 - sign * PIO2_1T;
    } else {
      z -= sign * PIO2_2;
      y0 = z - sign * PIO2_2T;
      remainder[1] = z - y0 - sign * PIO2_2T;
    }
    remainder[0] = y0;
    return sign;
  }

  if (ix <= 0x413921fb) {
    const t = Math.abs(x);
    const n = Math.floor(t * INV_PIO2 + 0.5);
    let r = t - n * PIO2_1;
    let w = n * PIO2_1T;
    const j = ix >> 20;
    let y0 = r - w;
    let i = j - ((highWord(y0) >> 20) & 0x7ff);
    if (i > 16) {
      const t2 = r;
      w = n * PIO2_2;
      r = t2 - w;
      w = n * PIO2_2T - (t2 - r - w);
      y0 = r - w;
      i = j - ((highWord(y0) >> 20) & 0x7ff);
      if (i > 49) {
        const t3 = r;
        w = n * PIO2_3;
        r = t3 - w;
        w = n * PIO2_3T - (t3 - r - w);
        y0 = r - w;
      }
    }
    const y1 = r - y0 - w;
    if (hx < 0) {
      remainder[0] = -y0;
      remainder[1] = -y1;
      return -n;
    }
    remainder[0] = y0;
    remainder[1] = y1;
    return n;
  }

  if (ix >= 0x7ff00000) {
    remainder[0] = remainder[1] = x - x;
    return 0;
  }

  const e0 = (ix >> 20) - 1046;
  let z = fromWords(ix - (e0 << 20), lowWord(x));
  for (let i = 0; i < 2; i++) {
    chunks[i] = Math.floor(z);
    z = (z - chunks[i]) * TWO24;
  }
  chunks[2] = z;
  let nx = 3;
  while (chunks[nx - 1] === 0) nx--;
  const n = kernelRemPio2(chunks, remainder, e0, nx);
  if (hx < 0) {
    remainder[0] = -remainder[0];
    remainder[1] = -remainder[1];
    return -n;
  }
  return n;
}

export function sin(x: number): number {
  const ix = highWord(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelSin(x, 0, false);
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x);
  const y0 = remainder[0];
  const y1 = remainder[1];
  switch (n & 3) {
    case 0:
      return kernelSin(y0, y1, true);
    case 1:
      return kernelCos(y0, y1);
    case 2:
      return -kernelSin(y0, y1, true);
    default:
      return -kernelCos(y0, y1);
  }
}

export function cos(x: number): number {
  const ix = highWord(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelCos(x, 0);
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x);
  const y0 = remainder[0];
  const y1 = remainder[1];
  switch (n & 3) {
    case 0:
      return kernelCos(y0, y1);
    case 1:
      return -kernelSin(y0, y1, true);
    case 2:
      return -kernelCos(y0, y1);
    default:
      return kernelSin(y0, y1, true);
  }
}

const ATAN_HI = [
  fromWords(0x3fddac67, 0x0561bb4f),
  fromWords(0x3fe921fb, 0x54442d18),
  fromWords(0x3fef730b, 0xd281f69b),
  fromWords(0x3ff921fb, 0x54442d18),
];
const ATAN_LO = [
  fromWords(0x3c7a2b7f, 0x222f65e2),
  fromWords(0x3c81a626, 0x33145c07),
  fromWords(0x3c700788, 0x7af0cbbd),
  fromWords(0x3c91a626, 0x33145c07),
];
const AT = [
  3.33333333333329318027e-1, -1.99999999998764832476e-1, 1.42857142725034663711e-1, -1.1111110405462355788e-1,
  9.09088713343650656196e-2, -7.69187620504482999495e-2, 6.66107313738753120669e-2, -5.83357013379057348645e-2,
  4.97687799461593236017e-2, -3.6531572744216915527e-2, 1.62858201153657823623e-2,
];

function atan(input: number): number {
  let x = input;
  const hx = highWord(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x44100000) {
    if (x !== x) return x + x;
    return hx > 0 ? ATAN_HI[3] + ATAN_LO[3] : -ATAN_HI[3] - ATAN_LO[3];
  }
  let id: number;
  if (ix < 0x3fdc0000) {
    if (ix < 0x3e200000) return x;
    id = -1;
  } else {
    x = Math.abs(x);
    if (ix < 0x3ff30000) {
      if (ix < 0x3fe60000) {
        id = 0;
        x = (2 * x - 1) / (2 + x);
      } else {
        id = 1;
        x = (x - 1) / (x + 1);
      }
    } else if (ix < 0x40038000) {
      id = 2;
      x = (x - 1.5) / (1 + 1.5 * x);
    } else {
      id = 3;
      x = -1 / x;
    }
  }
  const z = x * x;
  const w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  const r = ATAN_HI[id] - ((x * (s1 + s2) - ATAN_LO[id]) - x);
  return hx < 0 ? -r : r;
}

const PI = 3.141592653589793116;
const PI_LO = 1.2246467991473531772e-16;
const PI_O_2 = 1.570796326794896558;
const PI_O_4 = 0.78539816339744827900;

export function atan2(y: number, x: number): number {
  if (x !== x || y !== y) return x + y;
  const hx = highWord(x);
  const ix = hx & 0x7fffffff;
  const lx = lowWord(x);
  const hy = highWord(y);
  const iy = hy & 0x7fffffff;
  const ly = lowWord(y);
  if (hx === 0x3ff00000 && lx === 0) return atan(y);
  let m = ((hy >> 31) & 1) | ((hx >> 30) & 2);

  if ((iy | ly) === 0) {
    switch (m) {
      case 0:
      case 1:
        return y;
      case 2:
        return PI;
      default:
        return -PI;
    }
  }
  if ((ix | lx) === 0) return hy < 0 ? -PI_O_2 : PI_O_2;

  if (ix === 0x7ff00000) {
    if (iy === 0x7ff00000) {
      switch (m) {
        case 0:
          return PI_O_4;
        case 1:
          return -PI_O_4;
        case 2:
          return 3 * PI_O_4;
        default:
          return -3 * PI_O_4;
      }
    }
    switch (m) {
      case 0:
        return 0;
      case 1:
        return -0;
      case 2:
        return PI;
      default:
        return -PI;
    }
  }
  if (iy === 0x7ff00000) return hy < 0 ? -PI_O_2 : PI_O_2;

  const k = (iy - ix) >> 20;
  let z: number;
  if (k > 60) {
    z = PI_O_2 + 0.5 * PI_LO;
    m &= 1;
  } else if (hx < 0 && k < -60) {
    z = 0;
  } else {
    z = atan(Math.abs(y / x));
  }
  switch (m) {
    case 0:
      return z;
    case 1:
      return -z;
    case 2:
      return PI - (z - PI_LO);
    default:
      return z - PI_LO - PI;
  }
}

const EXP_P1 = 1.66666666666666019037e-1;
const EXP_P2 = -2.77777777770155933842e-3;
const EXP_P3 = 6.61375632143793436117e-5;
const EXP_P4 = -1.6533902205465251539e-6;
const EXP_P5 = 4.13813679705723846039e-8;
const LN2_HI = 6.9314718036912381649e-1;
const LN2_LO = 1.9082149292705877e-10;
const INV_LN2 = 1.442695040888963387;
const O_THRESHOLD = 7.09782712893383973096e2;
const U_THRESHOLD = -7.4513321910194110842e2;
const TWOM1000 = 9.3326361850321887899e-302;

export function exp(input: number): number {
  let x = input;
  let hx = highWord(x);
  const negative = hx < 0;
  hx &= 0x7fffffff;

  if (hx >= 0x40862e42) {
    if (hx >= 0x7ff00000) {
      if (((hx & 0xfffff) | lowWord(x)) !== 0) return x + x;
      return negative ? 0 : x;
    }
    if (x > O_THRESHOLD) return Infinity;
    if (x < U_THRESHOLD) return 0;
  }

  let hi = 0;
  let lo = 0;
  let k = 0;
  if (hx > 0x3fd62e42) {
    if (hx < 0x3ff0a2b2) {
      hi = negative ? x + LN2_HI : x - LN2_HI;
      lo = negative ? -LN2_LO : LN2_LO;
      k = negative ? -1 : 1;
    } else {
      k = truncate(INV_LN2 * x + (negative ? -0.5 : 0.5));
      hi = x - k * LN2_HI;
      lo = k * LN2_LO;
    }
    x = hi - lo;
  } else if (hx < 0x3e300000) {
    return 1 + x;
  }

  const t = x * x;
  const c = x - t * (EXP_P1 + t * (EXP_P2 + t * (EXP_P3 + t * (EXP_P4 + t * EXP_P5))));
  if (k === 0) return 1 - ((x * c) / (c - 2) - x);
  const y = 1 - ((lo - (x * c) / (2 - c)) - hi);
  if (k >= -1021) return withHigh(y, (highWord(y) + (k << 20)) | 0);
  return withHigh(y, (highWord(y) + ((k + 1000) << 20)) | 0) * TWOM1000;
}

const TWO54 = 1.8014398509481984e16;
const LG1 = 6.666666666666735130e-1;
const LG2 = 3.999999999940941908e-1;
const LG3 = 2.857142874366239149e-1;
const LG4 = 2.222219843214978396e-1;
const LG5 = 1.818357216161805012e-1;
const LG6 = 1.531383769920937332e-1;
const LG7 = 1.479819860511658591e-1;

export function log(input: number): number {
  let x = input;
  let hx = highWord(x);
  let k = 0;
  if (hx < 0x00100000) {
    if (((hx & 0x7fffffff) | lowWord(x)) === 0) return -Infinity;
    if (hx < 0) return NaN;
    k -= 54;
    x *= TWO54;
    hx = highWord(x);
  }
  if (hx >= 0x7ff00000) return x + x;

  k += (hx >> 20) - 1023;
  hx &= 0x000fffff;
  let i = (hx + 0x95f64) & 0x100000;
  x = withHigh(x, hx | (i ^ 0x3ff00000));
  k += i >> 20;
  const f = x - 1;
  const dk = k;

  if ((0x000fffff & (2 + hx)) < 3) {
    if (f === 0) return k === 0 ? 0 : dk * LN2_HI + dk * LN2_LO;
    const r = f * f * (0.5 - 0.33333333333333333 * f);
    return k === 0 ? f - r : dk * LN2_HI - ((r - dk * LN2_LO) - f);
  }

  const s = f / (2 + f);
  const z = s * s;
  const w = z * z;
  const t1 = w * (LG2 + w * (LG4 + w * LG6));
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  i = hx - 0x6147a;
  const j = 0x6b851 - hx;
  const r = t2 + t1;
  if ((i | j) > 0) {
    const hfsq = 0.5 * f * f;
    if (k === 0) return f - (hfsq - s * (hfsq + r));
    return dk * LN2_HI - ((hfsq - (s * (hfsq + r) + dk * LN2_LO)) - f);
  }
  if (k === 0) return f - s * (f - r);
  return dk * LN2_HI - ((s * (f - r) - dk * LN2_LO) - f);
}

const BP = [1, 1.5];
const DP_H = [0, 5.84962487220764160156e-1];
const DP_L = [0, 1.35003920212974897128e-8];
const TWO53 = 9007199254740992;
const POW_L1 = 5.99999999999994648725e-1;
const POW_L2 = 4.28571428578550184252e-1;
const POW_L3 = 3.33333329818377432918e-1;
const POW_L4 = 2.72728123808534006489e-1;
const POW_L5 = 2.30660745775561754067e-1;
const POW_L6 = 2.06975017800338417784e-1;
const LG2_POW = 6.93147180559945286227e-1;
const LG2_H = 6.93147182464599609375e-1;
const LG2_L = -1.90465429995776804525e-9;
const OVT = 8.0085662595372944372e-17;
const CP = 9.61796693925975554329e-1;
const CP_H = 9.61796700954437255859e-1;
const CP_L = -7.02846165095275826516e-9;
const IVLN2 = 1.442695040888963387;
const IVLN2_H = 1.44269502162933349609;
const IVLN2_L = 1.92596299112661746887e-8;

export function pow(x: number, y: number): number {
  const hx = highWord(x);
  const lx = lowWord(x);
  const hy = highWord(y);
  const ly = lowWord(y);
  let ix = hx & 0x7fffffff;
  const iy = hy & 0x7fffffff;

  if ((iy | ly) === 0) return 1;
  if (x !== x || y !== y) return x + y;

  let yisint = 0;
  if (hx < 0) {
    if (iy >= 0x43400000) {
      yisint = 2;
    } else if (iy >= 0x3ff00000) {
      const k = (iy >> 20) - 0x3ff;
      if (k > 20) {
        const j = ly >>> (52 - k);
        if (j << (52 - k) >>> 0 === ly) yisint = 2 - (j & 1);
      } else if (ly === 0) {
        const j = iy >> (20 - k);
        if (j << (20 - k) === iy) yisint = 2 - (j & 1);
      }
    }
  }

  if (ly === 0) {
    if (iy === 0x7ff00000) {
      if (((ix - 0x3ff00000) | lx) === 0) return NaN;
      if (ix >= 0x3ff00000) return hy >= 0 ? y : 0;
      return hy < 0 ? -y : 0;
    }
    if (iy === 0x3ff00000) return hy < 0 ? 1 / x : x;
    if (hy === 0x40000000) return x * x;
    if (hy === 0x3fe00000 && hx >= 0) return Math.sqrt(x);
  }

  let ax = Math.abs(x);
  if (lx === 0 && (ix === 0x7ff00000 || ix === 0 || ix === 0x3ff00000)) {
    let z = ax;
    if (hy < 0) z = 1 / z;
    if (hx < 0) {
      if (((ix - 0x3ff00000) | yisint) === 0) z = NaN;
      else if (yisint === 1) z = -z;
    }
    return z;
  }

  const n0 = hx < 0 ? 0 : 1;
  if ((n0 | yisint) === 0) return NaN;
  const sign = (n0 | (yisint - 1)) === 0 ? -1 : 1;

  let t1: number;
  let t2: number;
  if (iy > 0x41e00000) {
    if (iy > 0x43f00000) {
      if (ix <= 0x3fefffff) return hy < 0 ? Infinity : 0;
      if (ix >= 0x3ff00000) return hy > 0 ? Infinity : 0;
    }
    if (ix < 0x3fefffff) return hy < 0 ? sign * Infinity : sign * 0;
    if (ix > 0x3ff00000) return hy > 0 ? sign * Infinity : sign * 0;
    const t = ax - 1;
    const w = t * t * (0.5 - t * (0.3333333333333333333333 - t * 0.25));
    const u = IVLN2_H * t;
    const v = t * IVLN2_L - w * IVLN2;
    t1 = withLow(u + v, 0);
    t2 = v - (t1 - u);
  } else {
    let n = 0;
    if (ix < 0x00100000) {
      ax *= TWO53;
      n -= 53;
      ix = highWord(ax);
    }
    n += (ix >> 20) - 0x3ff;
    const j = ix & 0x000fffff;
    ix = j | 0x3ff00000;
    let k: number;
    if (j <= 0x3988e) {
      k = 0;
    } else if (j < 0xbb67a) {
      k = 1;
    } else {
      k = 0;
      n += 1;
      ix -= 0x00100000;
    }
    ax = withHigh(ax, ix);

    const u = ax - BP[k];
    const v = 1 / (ax + BP[k]);
    const ss = u * v;
    const sH = withLow(ss, 0);
    let tH = fromWords(((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18), 0);
    let tL = ax - (tH - BP[k]);
    const sL = v * ((u - sH * tH) - sH * tL);
    let s2 = ss * ss;
    let r = s2 * s2 * (POW_L1 + s2 * (POW_L2 + s2 * (POW_L3 + s2 * (POW_L4 + s2 * (POW_L5 + s2 * POW_L6)))));
    r += sL * (sH + ss);
    s2 = sH * sH;
    tH = withLow(3 + s2 + r, 0);
    tL = r - ((tH - 3) - s2);
    const u2 = sH * tH;
    const v2 = sL * tH + tL * ss;
    const pH = withLow(u2 + v2, 0);
    const pL = v2 - (pH - u2);
    const zH = CP_H * pH;
    const zL = CP_L * pH + pL * CP + DP_L[k];
    const t = n;
    t1 = withLow(zH + zL + DP_H[k] + t, 0);
    t2 = zL - (t1 - t - DP_H[k] - zH);
  }

  const y1 = withLow(y, 0);
  const pL = (y - y1) * t1 + y * t2;
  let pH = y1 * t1;
  let z = pL + pH;
  let j = highWord(z);
  const lowBits = lowWord(z);
  if (j >= 0x40900000) {
    if (j !== 0x40900000 || lowBits !== 0) return sign * Infinity;
    if (pL + OVT > z - pH) return sign * Infinity;
  } else if ((j & 0x7fffffff) >= 0x4090cc00) {
    if (j !== (0xc090cc00 | 0) || lowBits !== 0) return sign * 0;
    if (pL <= z - pH) return sign * 0;
  }

  const i = j & 0x7fffffff;
  let k = (i >> 20) - 0x3ff;
  let n = 0;
  if (i > 0x3fe00000) {
    n = j + (0x00100000 >> (k + 1));
    k = ((n & 0x7fffffff) >> 20) - 0x3ff;
    const t = fromWords(n & ~(0x000fffff >> k), 0);
    n = ((n & 0x000fffff) | 0x00100000) >> (20 - k);
    if (j < 0) n = -n;
    pH -= t;
  }
  const t = withLow(pL + pH, 0);
  const u = t * LG2_H;
  const v = (pL - (t - pH)) * LG2_POW + t * LG2_L;
  z = u + v;
  const w = v - (z - u);
  const zz = z * z;
  const tt = z - zz * (EXP_P1 + zz * (EXP_P2 + zz * (EXP_P3 + zz * (EXP_P4 + zz * EXP_P5))));
  const r = (z * tt) / (tt - 2) - (w + z * w);
  z = 1 - (r - z);
  j = highWord(z) + (n << 20);
  return sign * ((j >> 20) <= 0 ? scalbn(z, n) : withHigh(z, j | 0));
}
