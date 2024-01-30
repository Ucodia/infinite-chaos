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
  -s, --seed [seed]              Seed for the attractor parameters. Also support inclusion of modifiers in
                                 seed_fn_fn format (i.e. abcdef_sin_cos).
  -m, --mine                     Mine attractor parameters by automatically generating parameters.
  -n, --pointCount [count]       Number of points to generate the attractor.
  -d, --mods [mods]              Modifier functions for the x and y coordinates in fn/fn format (i.e. sin/cos).
  -c, --color [color]            Rendering color.
  -b, --background [background]  Rendering background color.
  -w, --width [width]            Rendering width.
  -h, --height [height]          Rendering height.
  -r, --marginRatio [ratio]      Rendering margin ratio.
  -a, --opacity [opacity]        Rendering opacity.
  -o, --output [path]            Rendering output directory.
  -q, --quality [quality]        Rendering output quality from 0 to 100 (default: 90).
  -C, --cpus [cpus]              Number of CPU cores to use for mining.
  --help                         display help for command
```

## References

- Paul Bourke's article on random attractors using Lyapunov exponents: https://paulbourke.net/fractals/lyapunov/