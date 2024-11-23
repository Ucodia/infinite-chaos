import { createCanvas } from "canvas";
import path from "path";
import sharp from "sharp";
import {
  createProgressUpdater,
  floorToFirstDecimal,
  floorToMultiple,
  opacityToHex,
  randFromSeed,
  randomString,
} from "./utlis.js";

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

function generateAttractor(params, n, mods, report = true) {
  const { ax, ay, x0, y0 } = params;
  const points = [[x0, y0]];
  const updateProgress = createProgressUpdater("generating", n);

  for (let i = 1; i < n; i++) {
    points[i] = attractor(
      points[i - 1][0],
      points[i - 1][1],
      ax,
      ay,
      mods[0],
      mods[1]
    );
    if (report) updateProgress(i);
  }

  return points;
}

function computeLyapunov(params, mods) {
  const lyapunovStart = 1000;
  const lyapunovEnd = 50000;
  const points = generateAttractor(params, lyapunovEnd, mods, false);
  const { xMin, xMax, yMin, yMax } = computeBounds(points);
  let lyapunov = 0;
  let dRand = randFromSeed("disturbance");
  let d0, xe, ye;

  do {
    xe = points[0][0] + (dRand() - 0.5) / 1000.0;
    ye = points[0][1] + (dRand() - 0.5) / 1000.0;
    const dxe = points[0][0] - xe;
    const dye = points[0][1] - ye;
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
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];

    if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
      // attracted towards a single point
      return false;
    }

    if (i > lyapunovStart) {
      const [newXe, newYe] = attractor(
        xe,
        ye,
        params.ax,
        params.ay,
        mods[0],
        mods[1]
      );
      const dxe = points[i][0] - newXe;
      const dye = points[i][1] - newYe;
      const dd = Math.sqrt(dxe * dxe + dye * dye);
      lyapunov += Math.log(Math.abs(dd / d0));
      xe = points[i][0] + (d0 * dxe) / dd;
      ye = points[i][1] + (d0 * dye) / dd;
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

function computeBounds(points) {
  let xMin = Number.MAX_VALUE;
  let xMax = Number.MIN_VALUE;
  let yMin = Number.MAX_VALUE;
  let yMax = Number.MIN_VALUE;
  for (let i = 0; i < points.length; i++) {
    xMin = Math.min(xMin, points[i][0]);
    yMin = Math.min(yMin, points[i][1]);
    xMax = Math.max(xMax, points[i][0]);
    yMax = Math.max(yMax, points[i][1]);
  }
  return { xMin, xMax, yMin, yMax };
}

function computeSpread(points, bounds, report = true) {
  const { xMin, xMax, yMin, yMax } = bounds;
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
  const n = Math.min(points.length, 1000000);
  const updateProgress = createProgressUpdater("analyzing", n);
  for (let i = 0; i < n; i++) {
    const cellX = floorToMultiple(points[i][0], cellSize);
    const cellY = floorToMultiple(points[i][1], cellSize);
    const cellKey = `${cellX}_${cellY}`;
    if (!cells[cellKey]) {
      cells[cellKey] = 1;
    }

    if (report) updateProgress(i);
  }

  const spread = Object.keys(cells).length / (cols * rows);

  return spread;
}

function draw(context, points, bounds, settings, report = true) {
  const { xMin, xMax, yMin, yMax } = bounds;
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

  const updateProgress = createProgressUpdater("drawing", points.length);
  for (let i = 0; i < points.length; i++) {
    let ix = centerX + (points[i][0] - xMin) * scale;
    let iy = centerY + (points[i][1] - yMin) * scale;
    context.fillRect(ix, iy, 1, 1);

    if (report) updateProgress(i);
  }
}

/**
 * Renders an attractor as a PNG file on the disk given that provided
 * attractor parameters exhibits chaotic behavior.
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

  const rand = randFromSeed(seed);
  const params = createParams(rand);
  const mods = [modifiers[xMod], modifiers[yMod]];
  const x0 = rand() - 0.5;
  const y0 = rand() - 0.5;

  if (!computeLyapunov({ ...params, x0, y0 }, mods)) {
    return;
  }

  console.log(`seed: ${seed}\tmods: ${xMod}/${yMod}`);
  const points = generateAttractor(
    { ...params, x0, y0 },
    pointCount,
    mods,
    report
  );
  const bounds = computeBounds(points);

  // sometimes non-chaotic properties only show after generation
  if (
    isNaN(bounds.xMin) ||
    isNaN(bounds.xMax) ||
    isNaN(bounds.yMin) ||
    isNaN(bounds.yMax)
  ) {
    return;
  }

  const spread = computeSpread(points, bounds, report);

  // filter out attractor below spread factor
  if (spread < spreadFilter) {
    return;
  }

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  draw(context, points, bounds, settings, report);

  const outputDir = path.resolve(process.cwd(), output);
  const outputFile = path.join(outputDir, `${seed}_${xMod}_${yMod}.png`);
  const buffer = canvas.toBuffer("image/png");

  sharp(buffer).removeAlpha().png({ quality }).toFile(outputFile);
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
