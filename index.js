import { createCanvas } from "canvas";
import path from "path";
import sharp from "sharp";

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

function createParams(rand) {
  const ax = [];
  const ay = [];
  for (let i = 0; i < 6; i++) {
    ax[i] = 4 * (rand() - 0.5);
    ay[i] = 4 * (rand() - 0.5);
  }
  return { ax, ay };
}

function generateAttractor({ ax, ay, x0, y0 }, n, xFn, yFn, report = true) {
  let x = [x0];
  let y = [y0];

  const updateProgress = createProgressUpdater("generating", n);
  for (let i = 1; i < n; i++) {
    const [nextX, nextY] = attractor(x[i - 1], y[i - 1], ax, ay, xFn, yFn);
    x[i] = nextX;
    y[i] = nextY;

    if (report) updateProgress(i);
  }

  return { x, y };
}

function computeLyapunov(params, xFn, yFn) {
  const lyapunovStart = 1000;
  const lyapunovEnd = 50000;
  const data = generateAttractor(params, lyapunovEnd, xFn, yFn, false);
  const { x, y } = data;
  const { xMin, xMax, yMin, yMax } = computeBounds(data);
  let lyapunov = 0;
  let dRand = namedLcg("disturbance");
  let d0, xe, ye;

  do {
    xe = x[0] + (dRand() - 0.5) / 1000.0;
    ye = y[0] + (dRand() - 0.5) / 1000.0;
    const dxe = x[0] - xe;
    const dye = y[0] - ye;
    d0 = Math.sqrt(dxe * dxe + dye * dye);
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
    const dx = x[i] - x[i - 1];
    const dy = y[i] - y[i - 1];

    if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
      // attracted towards a single point
      return false;
    }

    if (i > lyapunovStart) {
      const [newXe, newYe] = attractor(xe, ye, params.ax, params.ay);
      const dxe = x[i] - newXe;
      const dye = y[i] - newYe;
      const dd = Math.sqrt(dxe * dxe + dye * dye);
      lyapunov += Math.log(Math.abs(dd / d0));
      xe = x[i] + (d0 * dxe) / dd;
      ye = y[i] + (d0 * dye) / dd;
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

function computeBounds({ x, y }) {
  let xMin = Number.MAX_VALUE;
  let xMax = Number.MIN_VALUE;
  let yMin = Number.MAX_VALUE;
  let yMax = Number.MIN_VALUE;
  for (let i = 0; i < x.length; i++) {
    xMin = Math.min(xMin, x[i]);
    yMin = Math.min(yMin, y[i]);
    xMax = Math.max(xMax, x[i]);
    yMax = Math.max(yMax, y[i]);
  }
  return { xMin, xMax, yMin, yMax };
}

function computeSpread({ x, y }, { xMin, xMax, yMin, yMax }, report = true) {
  const cells = {};

  // divide the smallest side in at least 100 cells
  const minSubdivision = 100;
  const minLength = Math.min(Math.abs(xMax - xMin), Math.abs(yMax - yMin));
  const cellSize = floorToFirstDecimal(minLength / minSubdivision);

  // find the number of columns/rows
  const startX = floorToMultiple(xMin, cellSize);
  const endX = floorToMultiple(xMax, cellSize);
  const startY = floorToMultiple(yMin, cellSize);
  const endY = floorToMultiple(yMax, cellSize);
  const gridWidth = Math.abs(endX - startX);
  const gridHeight = Math.abs(endY - startY);
  const cols = Math.round(gridWidth / cellSize);
  const rows = Math.round(gridHeight / cellSize);

  // analyze maximum 1M first points
  // spread does not increase much beyond that
  const n = Math.min(x.length, 1000000);
  const updateProgress = createProgressUpdater("analyzing", n);
  for (let i = 0; i < n; i++) {
    const cellX = floorToMultiple(x[i], cellSize);
    const cellY = floorToMultiple(y[i], cellSize);
    const cellKey = `${cellX}_${cellY}`;
    if (!cells[cellKey]) {
      cells[cellKey] = 1;
    }

    if (report) {
      updateProgress(i);
    }
  }

  const spread = Object.keys(cells).length / (cols * rows);

  return spread;
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

const BASE36_CHARSET = "0123456789abcdefghijkmnopqrstuvwxyz";
function randomString(n) {
  return Array(n)
    .fill(0)
    .map(() => BASE36_CHARSET[(Math.random() * BASE36_CHARSET.length) | 0])
    .join("");
}

function hashCode(s) {
  for (var i = 0, h = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function floorToFirstDecimal(number) {
  if (number >= 1) {
    return Math.floor(number);
  } else {
    const precision = Math.ceil(-Math.log10(number));
    return Number(number.toString().substr(0, precision + 2));
  }
}

function floorToMultiple(number, increment) {
  const roundedValue = increment * Math.floor(number / increment);
  const precision = Math.ceil(-Math.log10(increment));
  const factor = Math.pow(10, precision);
  return Math.round(roundedValue * factor) / factor;
}

function opacityToHex(opacity) {
  return Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");
}

function createProgressUpdater(label, totalIterations, updateInterval = 100) {
  const startTime = performance.now();
  let lastUpdateTime = 0;

  return function updateProgress(iteration) {
    const currentTime = performance.now();
    const isLast = iteration === totalIterations - 1;

    if (currentTime - lastUpdateTime >= updateInterval || isLast) {
      lastUpdateTime = currentTime;
      const elapsedTime = currentTime - startTime;
      const progress = (iteration / totalIterations) * 100;
      const progressChars = Math.round((progress / 100) * 20);
      const progressBar =
        "=".repeat(progressChars) + "-".repeat(20 - progressChars);
      process.stdout.write(
        `\r${label.padEnd(
          20,
          " "
        )}: [${progressBar}] ${progress.toFixed()}% / ${elapsedTime.toFixed()}ms`
      );
    }

    if (isLast) {
      process.stdout.write("\n");
    }
  };
}

function draw(
  context,
  { x, y },
  { xMin, xMax, yMin, yMax },
  settings,
  report = true
) {
  const { color, background, width, height, marginRatio, opacity } = settings;

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

  const updateProgress = createProgressUpdater("drawing", x.length);
  for (let i = 0; i < x.length; i++) {
    let ix = centerX + (x[i] - xMin) * scale;
    let iy = centerY + (y[i] - yMin) * scale;
    context.fillRect(ix, iy, 1, 1);

    if (report) updateProgress(i);
  }
}

/**
 * Renders an attractor as a PNG file on the disk given that provided
 * attractor parameters exhibits chaotic behavior.
 * @param {*} seed The seed to generate the attractor parameters
 * @param {*} xMod The X coordinate modifier
 * @param {*} yMod The Y coordinate modifier
 * @returns The file name of the PNG if written on disk
 */
export function render(seed, settings, report = true) {
  const {
    pointCount,
    xMod,
    yMod,
    width,
    height,
    output,
    quality,
    spreadFilter,
  } = settings;

  const rand = namedLcg(seed);
  const params = createParams(rand);
  const xFn = modifiers[xMod];
  const yFn = modifiers[yMod];
  const x0 = rand() - 0.5;
  const y0 = rand() - 0.5;

  if (!computeLyapunov({ ...params, x0, y0 }, xFn, yFn)) {
    return;
  }

  console.log(`seed: ${seed}\tmods: ${xMod}/${yMod}`);
  const data = generateAttractor(
    { ...params, x0, y0 },
    pointCount,
    xFn,
    yFn,
    report
  );
  const bounds = computeBounds(data);

  // sometimes non-chaotic properties only show after generation
  if (
    isNaN(bounds.xMin) ||
    isNaN(bounds.xMax) ||
    isNaN(bounds.yMin) ||
    isNaN(bounds.yMax)
  ) {
    return;
  }

  const spread = computeSpread(data, bounds, report);

  // filter out attractor below spread factor
  if (spread < spreadFilter) {
    return;
  }

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  draw(context, data, bounds, settings, report);

  const outputDir = path.resolve(process.cwd(), output);
  const outputFile = path.join(outputDir, `${seed}_${xMod}_${yMod}.png`);
  const buffer = canvas.toBuffer("image/png");

  sharp(buffer).png({ quality }).toFile(outputFile);
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
    const seed = randomString(8);
    modCombos.forEach(([xMod, yMod]) => {
      const sx = { ...settings, xMod, yMod };
      render(seed, sx, false);
    });
  }
}
