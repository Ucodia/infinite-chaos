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

function hashCode(s) {
  for (var i = 0, h = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

export function randFromSeed(seed) {
  return lcg(Math.abs(hashCode(seed)));
}

const BASE36_CHARSET = "0123456789abcdefghijkmnopqrstuvwxyz";
export function randomString(n) {
  return Array(n)
    .fill(0)
    .map(() => BASE36_CHARSET[(Math.random() * BASE36_CHARSET.length) | 0])
    .join("");
}

export function floorToFirstDecimal(number) {
  if (number >= 1) {
    return Math.floor(number);
  } else {
    const precision = Math.ceil(-Math.log10(number));
    return Number(number.toString().substr(0, precision + 2));
  }
}

export function floorToMultiple(number, increment) {
  const roundedValue = increment * Math.floor(number / increment);
  const precision = Math.ceil(-Math.log10(increment));
  const factor = Math.pow(10, precision);
  return Math.round(roundedValue * factor) / factor;
}

export function alphaToHex(alpha) {
  return Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");
}

export function createProgressUpdater(
  label,
  totalIterations,
  updateInterval = 100
) {
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
