import { render, mine } from "./attractor.js";
import defaultSx from "./chaos.config.js";

const hdSx = {
  pointCount: 1000000 * 100,
  width: 1080 * 8,
  height: 1080 * 8,
  opacity: 0.1,
};

// const seedMods = "3vg11h8l6_noop_noop"; // drop
// const seedMods = "qwufpc8pu_log_cos"; // dancer
// const seedMods = "2e8mn21l2_asinh_cbrt"; // cosmic knot
// const seedMods = "yv82mrz2l_atan_cbrt"; // shrimp
// const [seed, xMod, yMod] = seedMods.split("_");

// render(seed, { ...defaultSx, ...hdSx, xMod, yMod });
mine(defaultSx);
