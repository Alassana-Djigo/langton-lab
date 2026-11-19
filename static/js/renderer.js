// Draws a simulation on one canvas, seen through a camera that can zoom and pan.
//
// The cells live in a small off-screen canvas with exactly one pixel per cell, rewritten from a
// typed array on every draw. The visible canvas shows the part of that image the camera sees,
// scaled with smoothing off so every cell stays a crisp square at any zoom. Grid lines, the
// highlight around the cell under each ant, and the ants themselves are drawn on top at screen
// resolution, so they stay sharp.

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
const lerp = (from, to, t) => from + (to - from) * t;

export const MAX_CELL_PX = 80; // the most you can zoom in: one cell is 80 CSS pixels wide
const GRID_MIN_CELL_PX = 6; // grid lines only help once cells are big enough
const HIGHLIGHT_MIN_CELL_PX = 10; // same for the box around the cell the ant stands on
const MIN_ANT_PX = 24;
const MAX_MARKER_PX = 40;
const HIGHLIGHT = "#FFD60A";

/**
 * Ant size in CSS pixels. With tiny cells the ant is a marker about six cells long, so you can
 * find it. As the cells grow it shrinks, relative to them, to about two cells, so you can see
 * exactly which cell it is on.
 */
export function antSize(cellPx) {
  const marker = clamp(cellPx * 6, MIN_ANT_PX, MAX_MARKER_PX);
  const real = cellPx * 2;
  return lerp(marker, real, clamp((cellPx - 6) / 10, 0, 1));
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.cellsCanvas = document.createElement("canvas");
    this.cellsContext = this.cellsCanvas.getContext("2d", { alpha: false });
    this.columns = 1;
    this.rows = 1;
    this.image = null;
    this.pixels = null;
    this.colours = ["#FFFFFF"];
    this.palette32 = new Uint32Array(0);
    this.antColours = { fill: "#000000", halo: "#FFFFFF" };
    this.gridColour = "rgba(0, 0, 0, 0.18)";
    this.showGrid = true;

    this.cssWidth = 0;
    this.cssHeight = 0;
    this.devicePixelRatio = 1;
    // The camera: where it looks (in cells) and how far it is zoomed in. A factor of 1 shows the
    // whole grid.
    this.factor = 1;
    this.centerX = 0;
    this.centerY = 0;
  }

  // ------------------------------------------------------------------- the camera

  /** CSS pixels per cell when the whole grid is in view. */
  get fitZoom() {
    if (!this.cssWidth || !this.cssHeight) return 1;
    return Math.min(this.cssWidth / this.columns, this.cssHeight / this.rows);
  }

  /** CSS pixels per cell right now. */
  get zoom() {
    return this.fitZoom * this.factor;
  }

  get maxFactor() {
    return Math.max(1, MAX_CELL_PX / this.fitZoom);
  }

  /** Keep the camera inside the grid. */
  keepInside() {
    const halfWidth = this.cssWidth / (2 * this.zoom);
    const halfHeight = this.cssHeight / (2 * this.zoom);
    this.centerX =
      halfWidth * 2 >= this.columns
        ? this.columns / 2
        : clamp(this.centerX, halfWidth, this.columns - halfWidth);
    this.centerY =
      halfHeight * 2 >= this.rows
        ? this.rows / 2
        : clamp(this.centerY, halfHeight, this.rows - halfHeight);
  }

  showWholeGrid() {
    this.factor = 1;
    this.centerX = this.columns / 2;
    this.centerY = this.rows / 2;
    this.keepInside();
  }

  /** Zoom by `factor`, keeping the point under (px, py) in place. Defaults to the centre. */
  zoomBy(factor, px = this.cssWidth / 2, py = this.cssHeight / 2) {
    const dx = px - this.cssWidth / 2;
    const dy = py - this.cssHeight / 2;
    const cellX = this.centerX + dx / this.zoom;
    const cellY = this.centerY + dy / this.zoom;
    this.factor = clamp(this.factor * factor, 1, this.maxFactor);
    this.centerX = cellX - dx / this.zoom;
    this.centerY = cellY - dy / this.zoom;
    this.keepInside();
  }

  /** Zoom so that one cell is `cellPx` CSS pixels wide. */
  zoomTo(cellPx, px, py) {
    this.zoomBy(cellPx / this.zoom, px, py);
  }

  /** Zoom and move so that `box` (in cells, as returned by Simulation.stats) fills the view. */
  fitBox(box, margin = 0.2) {
    if (!box) {
      this.showWholeGrid();
      return;
    }
    const wanted = Math.min(
      this.cssWidth / (box.width * (1 + 2 * margin)),
      this.cssHeight / (box.height * (1 + 2 * margin)),
    );
    this.factor = clamp(wanted / this.fitZoom, 1, this.maxFactor);
    this.centerX = box.minX + box.width / 2;
    this.centerY = box.minY + box.height / 2;
    this.keepInside();
  }

  centerOn(x, y) {
    this.centerX = x;
    this.centerY = y;
    this.keepInside();
  }

  /** Move the view by a drag of (dx, dy) CSS pixels. */
  panBy(dx, dy) {
    this.centerX -= dx / this.zoom;
    this.centerY -= dy / this.zoom;
    this.keepInside();
  }

  // ------------------------------------------------------------------ setting up

  resize(columns, rows) {
    this.columns = columns;
    this.rows = rows;
    this.cellsCanvas.width = columns;
    this.cellsCanvas.height = rows;
    this.image = this.cellsContext.createImageData(columns, rows);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.fit();
    this.showWholeGrid();
  }

  /** Match the canvas resolution to its on-screen size. Call it when that size changes. */
  fit() {
    const rect = this.canvas.getBoundingClientRect();
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
    this.devicePixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * this.devicePixelRatio));
    const height = Math.max(1, Math.round(rect.height * this.devicePixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.factor = clamp(this.factor, 1, this.maxFactor);
    this.keepInside();
  }

  setPalette(key, nColours) {
    const { colours, ant, grid } = buildPalette(key, nColours);
    this.colours = colours;
    this.palette32 = Uint32Array.from(colours, (hex) => pack(hexToRgb(hex)));
    this.antColours = ant;
    this.gridColour = grid;
  }

  // ---------------------------------------------------------------------- drawing

  draw(simulation) {
    const { cells, ants } = simulation;
    const { pixels, palette32 } = this;
    for (let i = 0; i < cells.length; i++) {
      pixels[i] = palette32[cells[i]];
    }
    this.cellsContext.putImageData(this.image, 0, 0);

    const context = this.context;
    const ratio = this.devicePixelRatio;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const cell = this.zoom * ratio; // device pixels per cell
    const left = this.centerX - width / (2 * cell); // the camera's edges, in cells
    const top = this.centerY - height / (2 * cell);

    context.fillStyle = this.colours[0];
    context.fillRect(0, 0, width, height);

    // Whole cells only, so the source rectangle is always aligned to the cell grid.
    const firstColumn = Math.max(0, Math.floor(left));
    const lastColumn = Math.min(this.columns, Math.ceil(left + width / cell));
    const firstRow = Math.max(0, Math.floor(top));
    const lastRow = Math.min(this.rows, Math.ceil(top + height / cell));
    context.imageSmoothingEnabled = false;
    if (lastColumn > firstColumn && lastRow > firstRow) {
      context.drawImage(
        this.cellsCanvas,
        firstColumn,
        firstRow,
        lastColumn - firstColumn,
        lastRow - firstRow,
        (firstColumn - left) * cell,
        (firstRow - top) * cell,
        (lastColumn - firstColumn) * cell,
        (lastRow - firstRow) * cell,
      );
    }

    if (this.showGrid && this.zoom >= GRID_MIN_CELL_PX) {
      this.drawGrid(firstColumn, lastColumn, firstRow, lastRow, left, top, cell);
    }
    if (this.zoom >= HIGHLIGHT_MIN_CELL_PX) {
      this.drawHighlights(ants, left, top, cell);
    }
    this.drawAnts(ants, left, top, cell);
  }

  drawGrid(firstColumn, lastColumn, firstRow, lastRow, left, top, cell) {
    const context = this.context;
    const line = Math.max(1, Math.round(this.devicePixelRatio));
    const x0 = Math.round((firstColumn - left) * cell);
    const x1 = Math.round((lastColumn - left) * cell);
    const y0 = Math.round((firstRow - top) * cell);
    const y1 = Math.round((lastRow - top) * cell);
    context.fillStyle = this.gridColour;
    for (let column = firstColumn; column <= lastColumn; column++) {
      context.fillRect(Math.round((column - left) * cell), y0, line, y1 - y0);
    }
    for (let row = firstRow; row <= lastRow; row++) {
      context.fillRect(x0, Math.round((row - top) * cell), x1 - x0, line);
    }
  }

  /** A box around the cell each ant stands on: dark outline, bright inside, readable on any colour. */
  drawHighlights(ants, left, top, cell) {
    const context = this.context;
    const ratio = this.devicePixelRatio;
    context.lineJoin = "miter";
    for (const ant of ants) {
      const x = (ant.x - left) * cell;
      const y = (ant.y - top) * cell;
      context.strokeStyle = "#000000";
      context.lineWidth = 6 * ratio;
      context.strokeRect(x, y, cell, cell);
      context.strokeStyle = HIGHLIGHT;
      context.lineWidth = 3 * ratio;
      context.strokeRect(x, y, cell, cell);
    }
  }

  drawAnts(ants, left, top, cell) {
    const size = antSize(this.zoom) * this.devicePixelRatio;
    for (const ant of ants) {
      const x = (ant.x + 0.5 - left) * cell;
      const y = (ant.y + 0.5 - top) * cell;
      if (x < -size || y < -size || x > this.canvas.width + size || y > this.canvas.height + size) {
        continue; // off screen
      }
      drawAnt(this.context, x, y, (ant.heading * Math.PI) / 2, size, this.antColours);
    }
  }
}
