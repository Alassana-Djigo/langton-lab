// Draws a simulation on a canvas that has exactly one pixel per cell. CSS scales the
// canvas up with `image-rendering: pixelated`, which keeps every cell crisp and makes
// drawing very cheap: one typed-array write per cell and a single putImageData call.

import { buildPalette } from "./palettes.js";

const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x0a0b0c0d]).buffer)[0] === 0x0d;

// Pack [r, g, b] into the 32-bit value that ImageData expects on this machine.
function pack([r, g, b]) {
  const value = LITTLE_ENDIAN
    ? (255 << 24) | (b << 16) | (g << 8) | r
    : (r << 24) | (g << 16) | (b << 8) | 255;
  return value >>> 0;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.image = null;
    this.pixels = null;
    this.colors = [];
    this.palette32 = new Uint32Array(0);
    this.antColor = "#ffffff";
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.image = this.context.createImageData(width, height);
    this.pixels = new Uint32Array(this.image.data.buffer);
  }

  setPalette(key, nColors) {
    const { colors, ant } = buildPalette(key, nColors);
    this.colors = colors;
    this.palette32 = Uint32Array.from(colors, (color) => pack(color));
    this.antColor = `rgb(${ant.join(",")})`;
  }

  draw(simulation) {
    const { cells, ants, width, height } = simulation;
    const { pixels, palette32, context } = this;
    for (let i = 0; i < cells.length; i++) {
      pixels[i] = palette32[cells[i]];
    }
    context.putImageData(this.image, 0, 0);

    // Ants are drawn a little larger than one cell on big grids, so they stay visible.
    const size = Math.max(1, Math.round(Math.max(width, height) / 80));
    const offset = size >> 1;
    context.fillStyle = this.antColor;
    for (const ant of ants) {
      context.fillRect(ant.x - offset, ant.y - offset, size, size);
    }
  }
}
