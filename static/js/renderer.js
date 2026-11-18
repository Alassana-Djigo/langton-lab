// Draws a simulation on two stacked canvases.
//
// The board canvas has exactly one pixel per cell and is scaled up by CSS with
// `image-rendering: pixelated`, which keeps cells crisp and makes drawing cheap: one typed-array
// write per cell and a single putImageData call. The ants are drawn on a second canvas that
// matches the on-screen size, so the ant drawing stays sharp at any zoom.

import { drawAnt } from "./ant.js";
import { buildPalette, hexToRgb } from "./palettes.js";

const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x0a0b0c0d]).buffer)[0] === 0x0d;

// Pack [r, g, b] into the 32-bit value that ImageData expects on this machine.
function pack([r, g, b]) {
  const value = LITTLE_ENDIAN
    ? (255 << 24) | (b << 16) | (g << 8) | r
    : (r << 24) | (g << 16) | (b << 8) | 255;
  return value >>> 0;
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Ant size on screen, in CSS pixels: about six cells long, but never tiny or huge.
const MIN_ANT_PX = 24;
const MAX_ANT_PX = 48;
const ANT_CELLS = 6;

export class Renderer {
  constructor(board, sprites) {
    this.board = board;
    this.boardContext = board.getContext("2d", { alpha: false });
    this.sprites = sprites;
    this.spriteContext = sprites.getContext("2d");
    this.columns = 1;
    this.image = null;
    this.pixels = null;
    this.colours = [];
    this.palette32 = new Uint32Array(0);
    this.antColours = { fill: "#000000", halo: "#FFFFFF" };
    this.pixelsPerCell = 1; // device pixels of the sprite canvas per grid cell
    this.devicePixelRatio = 1;
  }

  resize(width, height) {
    this.columns = width;
    this.board.width = width;
    this.board.height = height;
    this.image = this.boardContext.createImageData(width, height);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.fitSprites();
  }

  /** Match the sprite canvas to the on-screen size of the board. Call it when that size changes. */
  fitSprites() {
    const rect = this.board.getBoundingClientRect();
    this.devicePixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * this.devicePixelRatio));
    const height = Math.max(1, Math.round(rect.height * this.devicePixelRatio));
    if (this.sprites.width !== width || this.sprites.height !== height) {
      this.sprites.width = width;
      this.sprites.height = height;
    }
    this.pixelsPerCell = width / this.columns;
  }

  setPalette(key, nColours) {
    const { colours, ant } = buildPalette(key, nColours);
    this.colours = colours;
    this.palette32 = Uint32Array.from(colours, (hex) => pack(hexToRgb(hex)));
    this.antColours = ant;
  }

  draw(simulation) {
    const { cells, ants } = simulation;
    const { pixels, palette32 } = this;
    for (let i = 0; i < cells.length; i++) {
      pixels[i] = palette32[cells[i]];
    }
    this.boardContext.putImageData(this.image, 0, 0);

    const context = this.spriteContext;
    context.clearRect(0, 0, this.sprites.width, this.sprites.height);
    const size =
      clamp(this.pixelsPerCell * ANT_CELLS, MIN_ANT_PX * this.devicePixelRatio, MAX_ANT_PX * this.devicePixelRatio);
    for (const ant of ants) {
      const x = (ant.x + 0.5) * this.pixelsPerCell;
      const y = (ant.y + 0.5) * this.pixelsPerCell;
      drawAnt(context, x, y, (ant.heading * Math.PI) / 2, size, this.antColours);
    }
  }
}
