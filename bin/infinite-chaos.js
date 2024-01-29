#!/usr/bin/env node

import os from "os";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Command } from "commander";
import cluster from "cluster";
import { render, mine } from "../attractor.js";
import defaultConfig from "../chaos.config.js";

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
  .name("chaos")
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
    "Number of points to generate the attractor."
  )
  .option(
    "-d, --mods [mods]",
    "Modifier functions for the x and y coordinates in fn/fn format (i.e. sin/cos).",
    splitMods
  )
  .option("-c, --color [color]", "Rendering color.")
  .option("-b, --background [background]", "Rendering background color.")
  .option("-w, --width [width]", "Rendering width.", parseNumber)
  .option("-h, --height [height]", "Rendering height.", parseNumber)
  .option("-r, --marginRatio [ratio]", "Rendering margin ratio.")
  .option("-a, --opacity [opacity]", "Rendering opacity.")
  .option("-o, --output [path]", "Rendering output directory.")
  .option("-C, --cpus [cpus]", "Number of CPU cores to use for mining.");

program.parse(process.argv);

const options = program.opts();

if (options.seed && options.mine) {
  console.error(
    "Cannot provide both --seed and --mine options at the same time."
  );
  process.exit(1);
}

let settings = { ...defaultConfig };

// TODO: try to make this work to load local config files
// try {
//   const configPath = join(process.cwd(), "chaos.config.js");
//   const userConfig = await import(pathToFileURL(configPath));
//   settings = { ...settings, ...userConfig.default };
// } catch (error) {}

settings = { ...settings, ...options };

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
