import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "canvas";

// polyfill for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modifiers = {
  noop: (v) => v,
  sin: Math.sin,
  cos: Math.cos,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  log: Math.log,
  asinh: Math.asinh,
  atan: Math.atan,
};

/**
 * Computes the next coordinate in a system
 * as defined by a 2D quadratic function
 * @param {*} x Current x coordinate
 * @param {*} y Current y coordinate
 * @param {*} ax a parameters of the system
 * @param {*} ay b parameters of the system
 * @param {*} xFn function to apply to x coordinate
 * @param {*} yFn function to apply to y coordinate
 * @returns The next coordinate [x, y]
 */
function attractor(x, y, ax, ay, xFn = (v) => v, yFn = (v) => v) {
  return [
    ax[0] +
      ax[1] * xFn(x) +
      ax[2] * xFn(x) * xFn(x) +
      ax[3] * xFn(x) * yFn(y) +
      ax[4] * yFn(y) +
      ax[5] * yFn(y) * yFn(y),
    ay[0] +
      ay[1] * xFn(x) +
      ay[2] * xFn(x) * xFn(x) +
      ay[3] * xFn(x) * yFn(y) +
      ay[4] * yFn(y) +
      ay[5] * yFn(y) * yFn(y),
  ];
}

function createAttractorParams(rand) {
  const ax = [];
  const ay = [];
  for (let i = 0; i < 6; i++) {
    ax[i] = truncateFloat(4 * (rand() - 0.5));
    ay[i] = truncateFloat(4 * (rand() - 0.5));
  }
  const x0 = truncateFloat(rand() - 0.5);
  const y0 = truncateFloat(rand() - 0.5);
  return { ax, ay, x0, y0 };
}

const lyapunovStart = 1000;
const lyapunovEnd = 2000;
function isChaotic(params, xFn, yFn) {
  const { x, y, xMin, xMax, yMin, yMax } = generateAttractor(
    params,
    lyapunovEnd,
    xFn,
    yFn,
    false
  );
  let lyapunov = 0;
  let dRand = namedLcg("disturbance");
  let d0, xe, ye;

  do {
    xe = x[0] + (dRand() - 0.5) / 1000.0;
    ye = y[0] + (dRand() - 0.5) / 1000.0;
    const dx = x[0] - xe;
    const dy = y[0] - ye;
    d0 = Math.sqrt(dx * dx + dy * dy);
  } while (d0 <= 0);

  if (
    xMin < -1e10 ||
    yMin < -1e10 ||
    xMax > 1e10 ||
    yMax > 1e10 ||
    Number.isNaN(xMin) ||
    Number.isNaN(xMax) ||
    Number.isNaN(yMin) ||
    Number.isNaN(yMax)
  ) {
    // attracted towards infinity
    return false;
  }

  for (let i = 1; i < lyapunovEnd; i++) {
    let dx = x[i] - x[i - 1];
    let dy = y[i] - y[i - 1];

    if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
      // attracted towards a single point
      return false;
    }

    if (i > lyapunovStart) {
      const [newXe, newYe] = attractor(xe, ye, params.ax, params.ay);
      dx = x[i] - newXe;
      dy = y[i] - newYe;
      const dd = Math.sqrt(dx * dx + dy * dy);
      lyapunov += Math.log(Math.abs(dd / d0));
      xe = x[i] + (d0 * dx) / dd;
      ye = y[i] + (d0 * dy) / dd;
    }
  }

  if (Math.abs(lyapunov) < 10) {
    // neutral stable attractor
    return false;
  } else if (lyapunov < 0) {
    // periodic attractor
    return false;
  }

  return true;
}

function generateAttractor({ ax, ay, x0, y0 }, n, xFn, yFn, report = true) {
  const startTime = performance.now();
  let x = [x0];
  let y = [y0];
  let xMin = Number.MAX_VALUE;
  let xMax = Number.MIN_VALUE;
  let yMin = Number.MAX_VALUE;
  let yMax = Number.MIN_VALUE;

  for (let i = 1; i < n; i++) {
    const [nextX, nextY] = attractor(x[i - 1], y[i - 1], ax, ay, xFn, yFn);
    x[i] = nextX;
    y[i] = nextY;

    xMin = Math.min(xMin, x[i]);
    yMin = Math.min(yMin, y[i]);
    xMax = Math.max(xMax, x[i]);
    yMax = Math.max(yMax, y[i]);

    if (report && i % 1000 === 0) {
      const elapsedTime = performance.now() - startTime;
      process.stdout.write(
        `\rgenerating (${(
          (i / n) *
          100
        ).toFixed()}% / ${elapsedTime.toFixed()}ms)`
      );
    }
  }

  if (report) console.log();
  return { x, y, xMin, xMax, yMin, yMax };
}

function lcg(
  seed,
  modulus = 4294967296,
  multiplier = 1664525,
  increment = 1013904223
) {
  let z = seed;
  return () => {
    z = (multiplier * z + increment) % modulus;
    return z / modulus;
  };
}

function namedLcg(seed) {
  return lcg(Math.abs(hashCode(seed)));
}

function randomString() {
  return Math.random().toString(36).substr(2, 9);
}

function randomInt(min, max, rand) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function hashCode(s) {
  for (var i = 0, h = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function truncateFloat(num, decimalPlaces = 4) {
  return Number.parseFloat(num.toFixed(decimalPlaces));
}

function opacityToHex(opacity) {
  return Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");
}

function draw(context, data, settings, report = true) {
  const { x, y, xMin, xMax, yMin, yMax } = data;
  const { color, background, width, height, marginRatio, opacity } = settings;
  const startTime = performance.now();

  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const margin = width * marginRatio;
  const attractorWidth = xMax - xMin;
  const attractorHeight = yMax - yMin;
  const scale = Math.min(
    (width - margin) / attractorWidth,
    (height - margin) / attractorHeight
  );

  const centerX = (width - attractorWidth * scale) / 2;
  const centerY = (height - attractorHeight * scale) / 2;

  context.fillStyle = `${color}${opacityToHex(opacity)}`;

  for (let i = 0; i < x.length; i++) {
    let ix = centerX + (x[i] - xMin) * scale;
    let iy = centerY + (y[i] - yMin) * scale;
    context.fillRect(ix, iy, 1, 1);

    if (report && i % 1000 === 0) {
      const elapsedTime = performance.now() - startTime;
      process.stdout.write(
        `\rdrawing (${(
          (i / x.length) *
          100
        ).toFixed()}% / ${elapsedTime.toFixed()}ms)`
      );
    }
  }

  if (report) console.log();
}

/**
 * Renders an attractor as a PNG file on the disk given that provided
 * attractor parameters exhibits chaotic behavior.
 * @param {*} seed The seed to generate the attractor parameters
 * @param {*} xMod The X coordinate modifier
 * @param {*} yMod The Y coordinate modifier
 * @returns The file name of the PNG if written on disk
 */
export function render(seed, settings) {
  const { pointCount, xMod, yMod, width, height, output } = settings;

  const rand = namedLcg(seed);
  const params = createAttractorParams(rand);
  const xFn = modifiers[xMod];
  const yFn = modifiers[yMod];

  if (!isChaotic(params, xFn, yFn)) {
    return;
  }

  console.log(`seed: ${seed}\tmods: ${xMod}/${yMod}`);
  const data = generateAttractor(params, pointCount, xFn, yFn);

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  draw(context, data, settings);

  const outputDir = path.resolve(process.cwd(), output);
  const buffer = canvas.toBuffer("image/png");
  const fileName = path.join(outputDir, `${seed}_${xMod}_${yMod}.png`);
  fs.writeFileSync(fileName, buffer);

  return fileName;
}

/**
 * Function to "mine" the attractor algorithm by first generating
 * a seed and then trying multiple combinations of x/y modifiers to
 * maximize the exploration of possible outputs.
 */
export function mine(settings) {
  const modNames = Object.keys(modifiers);
  const modCombos = [];
  modNames.forEach((i1) => {
    modNames.forEach((i2) => {
      modCombos.push([i1, i2]);
    });
  });

  while (true) {
    const seed = randomString();
    modCombos.forEach(([xMod, yMod]) => {
      const sx = { ...settings, xMod, yMod };
      render(seed, sx);
    });
  }
}
