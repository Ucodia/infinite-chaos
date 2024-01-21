# Infinite Chaos

This is a command line tool to generate and render chaotic attractors with JavaScript.

## Dependencies

This project depends on [node-canvas](https://www.npmjs.com/package/canvas) library which itself relies on operating system (OS) dependent libraries, therefore depending on OS and computer hardware, some external libraries may need to be installed.

### Apple silicon

Install `Cairo` using `brew`:
```
brew install pkg-config cairo pango
```

## Credits

This work was inspired by Paul Bourke's article on random attractors: https://paulbourke.net/fractals/lyapunov/