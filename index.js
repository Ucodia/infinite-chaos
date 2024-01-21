const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const ATTRACTOR_LENGTH = 1000000 * 0.1;
const PIXEL_RATIO = 1;
const CANVAS_WIDTH = 1080 * PIXEL_RATIO;
const CANVAS_HEIGHT = 1080 * PIXEL_RATIO;
const MARGIN_RATIO = 0.25;
const OPACITY = 0.5;
const HIGH_RES = false;
const COLORS = {
  black: "#000000",
  darkgrey: "#333333",
  lightgrey: "#cccccc",
  white: "#ffffff",
  cyan: "#00aeef",
  magenta: "#ec008c",
  yellow: "#fff200",
  matrix: "#00ffa4",
};

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
      process.stdout.write(`\rgenerating (${((i / n) * 100).toFixed()}%)`);
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

function draw(context, color, { x, y, xMin, xMax, yMin, yMax }, report = true) {
  const margin = CANVAS_WIDTH * MARGIN_RATIO;
  const attractorWidth = xMax - xMin;
  const attractorHeight = yMax - yMin;
  const scale = Math.min(
    (CANVAS_WIDTH - margin) / attractorWidth,
    (CANVAS_HEIGHT - margin) / attractorHeight
  );

  const centerX = (CANVAS_WIDTH - attractorWidth * scale) / 2;
  const centerY = (CANVAS_HEIGHT - attractorHeight * scale) / 2;

  context.fillStyle = `${color}${opacityToHex(OPACITY)}`;

  for (let i = 0; i < x.length; i++) {
    let ix = centerX + (x[i] - xMin) * scale;
    let iy = centerY + (y[i] - yMin) * scale;
    if (HIGH_RES) {
      context.beginPath();
      context.arc(ix, iy, radius, 0, 2 * Math.PI);
      context.fill();
    } else {
      context.fillRect(ix, iy, 1, 1);
    }

    if (report && i % 1000 === 0) {
      process.stdout.write(`\rdrawing (${((i / x.length) * 100).toFixed()}%)`);
    }
  }

  if (report) console.log();
}

function render(seed, xMod, yMod) {
  let rand = namedLcg(seed);
  const params = createAttractorParams(rand);
  const xFn = modifiers[xMod];
  const yFn = modifiers[yMod];

  if (!isChaotic(params, xFn, yFn)) {
    return;
  }

  console.log(`seed: ${seed}\tmods: ${xMod}/${yMod}`);
  const data = generateAttractor(params, ATTRACTOR_LENGTH, xFn, yFn);

  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const context = canvas.getContext("2d");
  context.fillStyle = COLORS.darkgrey;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  draw(context, COLORS.matrix, data);

  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(outputDir, `${seed}_${xMod}_${yMod}.png`), buffer);
}

/**
 * Function to "mine" the attractor algorithm by first generating
 * a seed and then trying multiple combinations of x/y modifiers to
 * maximize the exploration of possible outputs.
 */
function mine() {
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
      render(seed, xMod, yMod);
    });
  }
}

// const seedMods = "3vg11h8l6_noop_noop"; // drop
// const seedMods = "qwufpc8pu_log_cos"; // dancer
// const seedMods = "2e8mn21l2_asinh_cbrt"; // cosmic knot
// const [seed, xMod, yMod] = seedMods.split("_");
// render(seed, xMod, yMod);

mine();
