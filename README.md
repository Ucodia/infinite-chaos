# Infinite Chaos

This is a command line tool to generate and render chaotic attractors with JavaScript.

## Local installation

Clone this repository and then run

```
npm i
npm i -g
```

The CLI will be available as `infinite-chaos`, see [usage](#usage).

## Dependencies

This project depends on [node-canvas](https://www.npmjs.com/package/canvas) library which itself relies on operating system (OS) dependent libraries, therefore depending on OS and computer hardware, some external libraries may need to be installed.

### Apple silicon

Install `Cairo` using `brew`:
```
brew install pkg-config cairo pango
```

## Usage

```
Usage: infinite-chaos [options]

Command line tool to generate and render chaotic attractors

Options:
  -V, --version                  output the version number
  -s, --seed [seed]              Seed for the attractor parameters. Also support inclusion of modifiers in seed_fn_fn format (i.e. abcdef_sin_cos).
  -m, --mine                     Mine attractor parameters by automatically generating parameters.
  -n, --pointCount [count]       Number of points to generate the attractor (default: 100000)
  -d, --mods [mods]              Modifier functions for the x and y coordinates in fn/fn format (i.e. sin/cos)
  -c, --color [color]            Rendering color (default: #00ffa4)
  -b, --background [background]  Rendering background color (default: #000000)
  -w, --width [width]            Rendering width (default: 1080)
  -h, --height [height]          Rendering height (default: 1080)
  -r, --marginRatio [ratio]      Rendering margin ratio (default: 0.25)
  -a, --alpha [alpha]            Rendering alpha (default: 0.5)
  -o, --output [path]            Rendering output directory (default: ./output)
  -q, --quality [quality]        Rendering output quality from 0 to 100 (default: 99)
  -f, --filter [filter]          Spread filtering level to skip the rendering of clustered outputs from 0 to 1 (default: 0.2)
  -C, --cpus [cpus]              Number of CPU cores to use for mining
  -p, --primitive [style]        Primitive style for drawing points (rect or circle) (default: rect)
  --help                         display help for command
```

## References

- Paul Bourke's article on random attractors using Lyapunov exponents: https://paulbourke.net/fractals/lyapunov/

## Currated examples

```
# the dancer
infinite-chaos -n 10000000 -w 4800 -h 6000 -a 0.5 --seed qwufpc8pu_log_cos
# the cosmic knot
infinite-chaos -n 10000000 -w 4800 -h 6000 -a 0.5 --seed 2e8mn21l2_asinh_cbrt
# wave collapse
infinite-chaos -n 10000000 -w 4800 -h 6000 -a 0.5 --seed 91wni2fcy_asinh_cbrt
# the beginning
infinite-chaos -n 10000000 -w 4800 -h 6000 -a 0.5 --seed km1rw8720_asinh_asinh
```