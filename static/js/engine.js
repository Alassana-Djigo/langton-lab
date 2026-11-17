// Langton's ant engine: a port of the Python reference implementation in engine/.
// Same rules, same coordinates (x grows right, y grows down) and same update order,
// so for the same input both engines produce exactly the same grid.

export const NORTH = 0;
export const EAST = 1;
export const SOUTH = 2;
export const WEST = 3;

export const MIN_COLORS = 2;
export const MAX_COLORS = 16;

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

// Quarter turns clockwise, as in engine/directions.py.
const TURN_BY_LETTER = { L: 3, R: 1, N: 0, U: 2 };

/** Turn a rule string such as "RL" into an array with one turn per colour. */
export function parseRule(text) {
  const cleaned = String(text).trim().toUpperCase();
  if (cleaned.length < MIN_COLORS || cleaned.length > MAX_COLORS) {
    throw new RangeError(`Use ${MIN_COLORS} to ${MAX_COLORS} letters.`);
  }
  const turns = [];
  for (const letter of cleaned) {
    if (!Object.hasOwn(TURN_BY_LETTER, letter)) {
      throw new RangeError(`Unknown letter "${letter}". Use only L, R, N and U.`);
    }
    turns.push(TURN_BY_LETTER[letter]);
  }
  return turns;
}

export class Simulation {
  /**
   * @param {object} options
   * @param {number} options.width
   * @param {number} options.height
   * @param {string | number[]} options.rule A rule string ("RL") or already parsed turns.
   * @param {{x: number, y: number, heading?: number}[]} [options.ants] Defaults to one
   *   ant in the centre, facing north.
   */
  constructor({ width, height, rule, ants }) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new RangeError(`Invalid grid size ${width}x${height}.`);
    }
    this.width = width;
    this.height = height;
    this.turns = typeof rule === "string" ? parseRule(rule) : rule;
    this.nColors = this.turns.length;
    this.cells = new Uint8Array(width * height);
    this.steps = 0;
    this.ants = (ants ?? [{ x: width >> 1, y: height >> 1 }]).map((ant) => ({
      x: ant.x,
      y: ant.y,
      heading: ant.heading ?? NORTH,
    }));
    for (const ant of this.ants) {
      if (!(ant.x >= 0 && ant.x < width && ant.y >= 0 && ant.y < height)) {
        throw new RangeError(`Ant at (${ant.x}, ${ant.y}) is outside the grid.`);
      }
    }
  }

  /** The colour (0, 1, 2...) of the cell at column x and row y. */
  cell(x, y) {
    return this.cells[y * this.width + x];
  }

  step() {
    this.run(1);
  }

  /** Advance the simulation by `steps` steps. Each ant, in order: turn, recolour, move. */
  run(steps) {
    if (!Number.isInteger(steps) || steps < 0) {
      throw new RangeError(`Cannot run ${steps} steps.`);
    }
    const { width, height, cells, turns, nColors, ants } = this;
    for (let s = 0; s < steps; s++) {
      for (let a = 0; a < ants.length; a++) {
        const ant = ants[a];
        const index = ant.y * width + ant.x;
        const color = cells[index];
        ant.heading = (ant.heading + turns[color]) & 3;
        cells[index] = color + 1 === nColors ? 0 : color + 1;
        ant.x = (ant.x + DX[ant.heading] + width) % width;
        ant.y = (ant.y + DY[ant.heading] + height) % height;
      }
    }
    this.steps += steps;
  }

  /** A summary of the grid, mirroring engine/stats.py. */
  stats() {
    const { width, height, cells } = this;
    const colorCounts = new Array(this.nColors).fill(0);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const color = cells[row + x];
        colorCounts[color]++;
        if (color !== 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          maxY = y;
        }
      }
    }
    return {
      steps: this.steps,
      ants: this.ants.length,
      colorCounts,
      painted: width * height - colorCounts[0],
      boundingBox:
        maxX < 0
          ? null
          : { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 },
    };
  }
}
