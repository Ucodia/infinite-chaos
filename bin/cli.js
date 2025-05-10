#!/usr/bin/env node --max-old-space-size=8192

import cluster from "cluster";
import { Command } from "commander";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { mine, render } from "../index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

function splitMods(value) {
  return value.split("/");
}

function processSeed(seed) {
  const seedComponents = seed.split("_");
  if (seedComponents.length === 3) {
    const [seedValue, xMod, yMod] = seedComponents;
    return { seed: seedValue, xMod, yMod };
  } else {
    return { seed: seedComponents[0] };
  }
}

function parseNumber(value) {
  const parsedValue = Number(value);
  return isNaN(parsedValue) ? null : parsedValue;
}

const program = new Command();

program
  .name(pkg.name)
  .version(pkg.version)
  .description(pkg.description)
  .option(
    "-s, --seed [seed]",
    "Seed for the attractor parameters. Also support inclusion of modifiers in seed_fn_fn format (i.e. abcdef_sin_cos)."
  )
  .option(
    "-m, --mine",
    "Mine attractor parameters by automatically generating parameters."
  )
  .option(
    "-n, --pointCount [count]",
    "Number of points to generate the attractor",
    parseNumber,
    100000
  )
  .option(
    "-d, --mods [mods]",
    "Modifier functions for the x and y coordinates in fn/fn format (i.e. sin/cos)",
    splitMods
  )
  .option("-c, --color [color]", "Rendering color", "#00ffa4")
  .option(
    "-b, --background [background]",
    "Rendering background color",
    "#333333"
  )
  .option("-w, --width [width]", "Rendering width", parseNumber, 1080)
  .option("-h, --height [height]", "Rendering height", parseNumber, 1080)
  .option(
    "-r, --marginRatio [ratio]",
    "Rendering margin ratio",
    parseNumber,
    0.25
  )
  .option("-a, --alpha [alpha]", "Rendering alpha", parseNumber, 0.5)
  .option("-o, --output [path]", "Rendering output directory", "./output")
  .option(
    "-q, --quality [quality]",
    "Rendering output quality from 0 to 100",
    parseNumber,
    99
  )
  .option(
    "-f, --filter [filter]",
    "Spread filtering level to skip the rendering of clustered outputs from 0 to 1",
    parseNumber,
    0.2
  )
  .option("-C, --cpus [cpus]", "Number of CPU cores to use for mining")
  .option(
    "-p, --primitive [style]",
    "Primitive style for drawing points (rect or circle)",
    "rect"
  )
  .configureHelp({
    optionDescription: (option) => {
      const defaultValue = option.defaultValue;
      if (defaultValue === undefined) return option.description;
      return `${option.description} (default: ${defaultValue})`;
    },
  });

program.parse(process.argv);

const options = program.opts();

if (options.seed && options.mine) {
  console.error(
    "Cannot provide both --seed and --mine options at the same time."
  );
  process.exit(1);
}

let settings = { ...options };

let seedValue;
if (options.seed) {
  const { seed, xMod, yMod } = processSeed(options.seed);
  seedValue = seed;
  if (xMod && yMod) {
    settings.xMod = xMod;
    settings.yMod = yMod;
  }
}

const threadCount = settings.cpus || os.cpus().length;

// ensure that target directory exists, if not create it
const outputDir = path.resolve(process.cwd(), settings.output);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

if (options.mine) {
  if (cluster.isPrimary) {
    for (let i = 0; i < threadCount; i++) {
      cluster.fork();
    }
  } else {
    mine(settings);
  }
} else if (options.seed) {
  render(seedValue, settings);
} else {
  console.error("Please provide either --mine or --seed [seed]");
  process.exit(1);
}
