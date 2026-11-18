// The ant. One drawing, defined once: this module draws it on the canvas, and the same
// path data is used by static/img/ant.svg and by the illustration in the page.
// Coordinates are in a 100 x 100 box with the ant facing up (north) and centred at (50, 50).

export const ANT = {
  body: "M50 11.5C56.2 11.5 60 15.6 59.2 21C58.5 25.8 54.6 29 50 29C45.4 29 41.5 25.8 40.8 21C40 15.6 43.8 11.5 50 11.5ZM39 19.2C39 17.7 40 16.5 41.2 16.5C42.4 16.5 43.4 17.7 43.4 19.2C43.4 20.7 42.4 21.9 41.2 21.9C40 21.9 39 20.7 39 19.2ZM56.6 19.2C56.6 17.7 57.6 16.5 58.8 16.5C60 16.5 61 17.7 61 19.2C61 20.7 60 21.9 58.8 21.9C57.6 21.9 56.6 20.7 56.6 19.2ZM50 27.8C55.3 27.8 57.4 31 57 34.2C56.7 37 54.4 38.8 50 38.8C45.6 38.8 43.3 37 43 34.2C42.6 31 44.7 27.8 50 27.8ZM50 37.4C54.6 37.4 56 40.6 55.6 44C55.2 47 53.6 48.8 50 48.8C46.4 48.8 44.8 47 44.4 44C44 40.6 45.4 37.4 50 37.4ZM50 47.2C53.6 47.2 54.8 49.6 54.4 52.4C54 54.6 52.6 55.9 50 55.9C47.4 55.9 46 54.6 45.6 52.4C45.2 49.6 46.4 47.2 50 47.2ZM50 55.2C52 55.2 53 56.6 52.6 58.4C52.3 59.6 51.3 60.4 50 60.4C48.7 60.4 47.7 59.6 47.4 58.4C47 56.6 48 55.2 50 55.2ZM50 59.5C58.6 59.5 62.6 68 61.4 77C60.4 84.4 55.6 90.6 50 93.5C44.4 90.6 39.6 84.4 38.6 77C37.4 68 41.4 59.5 50 59.5Z",
  femur: "M44.6 33.2L33.2 27.6M55.4 33.2L66.8 27.6M44.8 43L28.4 38.2M55.2 43L71.6 38.2M45.2 50.6L31.2 57M54.8 50.6L68.8 57",
  tibia: "M33.2 27.6L22.2 15.4L18.2 12.4M66.8 27.6L77.8 15.4L81.8 12.4M28.4 38.2L17.4 49L14.4 53.4M71.6 38.2L82.6 49L85.6 53.4M31.2 57L25.2 74L24 79.4M68.8 57L74.8 74L76 79.4",
  feelers: "M47 13.4L41.6 5.2L34.4 2.6L29.4 5.6M53 13.4L58.4 5.2L65.6 2.6L70.6 5.6M46.4 12.4C45 9.6 46 8 48.6 7.9M53.6 12.4C55 9.6 54 8 51.4 7.9",
};

const CENTER_Y = 51;

let shapes = null;

function getShapes() {
  shapes ??= {
    body: new Path2D(ANT.body),
    femur: new Path2D(ANT.femur),
    tibia: new Path2D(ANT.tibia),
    feelers: new Path2D(ANT.feelers),
  };
  return shapes;
}

/**
 * Draw the ant on a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x Centre of the ant, in canvas pixels.
 * @param {number} y
 * @param {number} angle Rotation in radians; 0 faces up (north), PI / 2 faces east.
 * @param {number} size Height of the 100-unit box, in canvas pixels.
 * @param {{fill: string, halo: string}} colors The ant colour and the outline that keeps it
 *   visible on cells of the same colour.
 */
export function drawAnt(ctx, x, y, angle, size, colors) {
  const shape = getShapes();
  const k = size / 100;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(k, k);
  ctx.translate(-50, -CENTER_Y);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Outline first: about one screen pixel on each side, whatever the size.
  const outline = Math.max(4.5, 2 / k);
  ctx.fillStyle = colors.halo;
  ctx.strokeStyle = colors.halo;
  ctx.lineWidth = outline;
  ctx.fill(shape.body);
  ctx.stroke(shape.body);
  for (const part of [shape.femur, shape.tibia, shape.feelers]) {
    ctx.stroke(part);
  }

  // The ant itself. Lines never get thinner than about one pixel.
  ctx.fillStyle = colors.fill;
  ctx.strokeStyle = colors.fill;
  ctx.fill(shape.body);
  ctx.lineWidth = Math.max(2.2, 1.1 / k);
  ctx.stroke(shape.femur);
  ctx.lineWidth = Math.max(1.6, 0.9 / k);
  ctx.stroke(shape.tibia);
  ctx.lineWidth = Math.max(1.3, 0.8 / k);
  ctx.stroke(shape.feelers);

  ctx.restore();
}
