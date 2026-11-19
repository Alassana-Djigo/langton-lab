// The simulator UI: wires the DOM, the engine and the renderer together.

import { MAX_COLORS, Simulation, parseRule } from "./engine.js";
import { DEFAULT_PALETTE, PALETTES } from "./palettes.js";
import { Renderer } from "./renderer.js";

const SIZES = [50, 100, 200, 300, 400, 500];
const PRESETS = ["RL", "RLR", "LLRR", "RLLR", "LRRRRRLLR", "RRLLLRLLLRRR"];
const PRESET_NOTES = {
  RL: "The classic ant. It builds its highway after about 10,000 steps.",
  RLR: "Grows chaotically. Nobody knows whether it ever builds a highway.",
  LLRR: "Grows symmetrically.",
  RLLR: "Its pattern becomes symmetric over and over again.",
  LRRRRRLLR: "Fills a square around itself.",
  RRLLLRLLLRRR: "Builds a filled triangle that grows and moves.",
};
const MAX_ANTS = 32;
const MAX_FRAME_SECONDS = 0.1; // never simulate more than 100 ms of work per frame
const READOUT_INTERVAL_MS = 100;
const DEFAULT_SPEED = 55; // slider position (0-100)
const ZOOM_STEP = 1.5;
const FOLLOW_CELL_PX = 16; // how big the cells get when you start following the ant
const DEFAULTS = { rule: "RL", size: 200, ants: 1, palette: DEFAULT_PALETTE };

const TURN_TEXT = { L: "turns left", R: "turns right", N: "goes straight", U: "turns around" };
const TURN_PAST = { L: "turned left", R: "turned right", N: "went straight", U: "turned around" };
const COMPASS = ["north", "east", "south", "west"];

const NARRATION_IDLE =
  "Press Step to watch one move at a time: what the ant stands on, how it turns and what it leaves behind.";
const NARRATION_FAST =
  "Running fast. Slow the speed down, or pause and press Step, to see single moves.";

const byId = (id) => document.getElementById(id);
const els = {
  board: byId("board"),
  caption: byId("caption"),
  narration: byId("narration"),
  play: byId("play"),
  step: byId("step"),
  reset: byId("reset"),
  speed: byId("speed"),
  speedLabel: byId("speed-label"),
  zoomOut: byId("zoom-out"),
  zoomIn: byId("zoom-in"),
  zoomLabel: byId("zoom-label"),
  zoomWhole: byId("zoom-whole"),
  zoomPattern: byId("zoom-pattern"),
  follow: byId("follow"),
  grid: byId("grid"),
  rule: byId("rule"),
  presets: byId("presets"),
  presetNote: byId("preset-note"),
  size: byId("size"),
  antCount: byId("ant-count"),
  palette: byId("palette"),
  share: byId("share"),
  error: byId("config-error"),
  statSteps: byId("stat-steps"),
  statPainted: byId("stat-painted"),
  statBox: byId("stat-box"),
  colours: byId("colours"),
};

const renderer = new Renderer(els.board);
const state = {
  simulation: null,
  config: { ...DEFAULTS },
  running: false,
  follow: false,
  narration: NARRATION_IDLE,
  stepsPerSecond: 1,
  budget: 0,
  lastFrame: 0,
  lastReadout: 0,
  countCells: [],
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const format = (number) => number.toLocaleString("en-US");

// ---------------------------------------------------------------- configuration

/** Deterministic placement: one ant in the centre, or several on a ring around it. */
function placeAnts(count, width, height) {
  const cx = width >> 1;
  const cy = height >> 1;
  if (count === 1) {
    return [{ x: cx, y: cy, heading: 0 }];
  }
  const radius = Math.floor(Math.min(width, height) / 4);
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count;
    return {
      x: clamp(Math.round(cx + radius * Math.cos(angle)), 0, width - 1),
      y: clamp(Math.round(cy + radius * Math.sin(angle)), 0, height - 1),
      heading: i % 4,
    };
  });
}

function readConfigFromHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const config = { ...DEFAULTS };

  const rule = (params.get("rule") ?? "").trim().toUpperCase();
  try {
    parseRule(rule);
    config.rule = rule;
  } catch {
    // keep the default rule
  }

  const size = Number(params.get("size"));
  if (SIZES.includes(size)) config.size = size;

  const ants = Number(params.get("ants"));
  if (Number.isInteger(ants) && ants >= 1 && ants <= MAX_ANTS) config.ants = ants;

  const palette = params.get("palette");
  if (palette && Object.hasOwn(PALETTES, palette)) config.palette = palette;

  return config;
}

function writeConfigToHash(config) {
  const params = new URLSearchParams({
    rule: config.rule,
    size: String(config.size),
    ants: String(config.ants),
    palette: config.palette,
  });
  history.replaceState(null, "", `#${params}`);
}

/** Reads and validates the form. Throws a RangeError with a message the person can act on. */
function readConfigFromInputs() {
  const rule = els.rule.value.trim().toUpperCase();
  parseRule(rule);
  const ants = Number(els.antCount.value);
  if (!Number.isInteger(ants) || ants < 1 || ants > MAX_ANTS) {
    throw new RangeError(`Use between 1 and ${MAX_ANTS} ants.`);
  }
  return { rule, size: Number(els.size.value), ants, palette: els.palette.value };
}

function syncInputs(config) {
  els.rule.value = config.rule;
  els.size.value = String(config.size);
  els.antCount.value = String(config.ants);
  els.palette.value = config.palette;
  updatePresetButtons(config.rule);
}

function showError(message) {
  els.error.textContent = message;
  els.rule.setAttribute("aria-invalid", message ? "true" : "false");
}

/** Builds a fresh simulation from `config` and shows it, paused. */
function applyConfig(config) {
  const size = config.size;
  const simulation = new Simulation({
    width: size,
    height: size,
    rule: config.rule,
    ants: placeAnts(config.ants, size, size),
  });
  state.simulation = simulation;
  state.config = config;
  state.budget = 0;
  state.narration = NARRATION_IDLE;

  renderer.resize(size, size);
  renderer.setPalette(config.palette, simulation.nColors);
  buildColourTable(config.rule);
  updatePresetButtons(config.rule);
  pause();
  setFollowFlag(false);
  updateReadout();
  writeConfigToHash(config);
}

function onConfigChange() {
  try {
    applyConfig(readConfigFromInputs());
    showError("");
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    showError(error.message);
  }
}

function onPaletteChange() {
  state.config = { ...state.config, palette: els.palette.value };
  renderer.setPalette(state.config.palette, state.simulation.nColors);
  buildColourTable(state.config.rule);
  updateReadout();
  writeConfigToHash(state.config);
}

function previewRule() {
  try {
    parseRule(els.rule.value);
    showError("");
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    showError(error.message);
  }
}

// ---------------------------------------------------------------------- readout

function buildColourTable(rule) {
  els.colours.replaceChildren();
  state.countCells = [];
  for (let i = 0; i < state.simulation.nColors; i++) {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.backgroundColor = renderer.colours[i];
    nameCell.append(swatch, i === 0 ? "Ground" : `Colour ${i}`);

    const turnCell = document.createElement("td");
    turnCell.textContent = TURN_TEXT[rule[i]];

    const countCell = document.createElement("td");
    countCell.className = "num";

    row.append(nameCell, turnCell, countCell);
    els.colours.append(row);
    state.countCells.push(countCell);
  }
}

function describe(stats) {
  if (stats.steps === 0) {
    const who = stats.ants === 1 ? "One ant stands" : `${stats.ants} ants stand`;
    return `${who} on an empty grid. Press Play or hit the space bar.`;
  }
  const painted = `${format(stats.painted)} ${stats.painted === 1 ? "cell" : "cells"} painted`;
  const box = stats.boundingBox;
  const area = box ? `, in an area ${box.width} cells wide and ${box.height} tall` : "";
  return `Step ${format(stats.steps)}. ${painted}${area}.`;
}

/** Redraws the board and updates the numbers and the sentences around it. */
function updateReadout() {
  redraw();
  const stats = state.simulation.stats();
  els.caption.textContent = describe(stats);
  els.narration.textContent = state.narration;
  els.statSteps.textContent = format(stats.steps);
  els.statPainted.textContent = format(stats.painted);
  els.statBox.textContent = stats.boundingBox
    ? `${stats.boundingBox.width} by ${stats.boundingBox.height}`
    : "none yet";
  stats.colorCounts.forEach((count, i) => {
    state.countCells[i].textContent = format(count);
  });
}

// ------------------------------------------------------------------ the camera

/** Draws the board, keeping the camera on the ant when "Follow ant" is on. */
function redraw() {
  if (state.follow) {
    const ant = state.simulation.ants[0];
    renderer.centerOn(ant.x + 0.5, ant.y + 0.5);
  }
  renderer.draw(state.simulation);
  updateViewControls();
}

function updateViewControls() {
  const factor = renderer.factor;
  els.zoomLabel.textContent = `${Number(factor.toFixed(1))}\u00d7`;
  els.zoomOut.disabled = factor <= 1.001;
  els.zoomIn.disabled = factor >= renderer.maxFactor - 0.001;
  els.board.dataset.zoomed = String(factor > 1.05);
}

function zoom(factor) {
  renderer.zoomBy(factor);
  redraw();
}

function showWholeGrid() {
  setFollowFlag(false);
  renderer.showWholeGrid();
  redraw();
}

function fitPattern() {
  setFollowFlag(false);
  renderer.fitBox(state.simulation.stats().boundingBox);
  redraw();
}

/** Only records whether the camera follows the ant. The caller redraws. */
function setFollowFlag(on) {
  state.follow = on;
  els.follow.setAttribute("aria-pressed", String(on));
}

function setFollow(on) {
  setFollowFlag(on);
  if (on && renderer.zoom < FOLLOW_CELL_PX * 0.75) {
    renderer.zoomTo(FOLLOW_CELL_PX);
  }
  redraw();
}

function bindBoardGestures() {
  const pointers = new Map();
  let lastPinch = 0;

  const pinchDistance = () => {
    if (pointers.size !== 2) return 0;
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  els.board.addEventListener("pointerdown", (event) => {
    els.board.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastPinch = pinchDistance();
  });

  els.board.addEventListener("pointermove", (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, current);
    if (pointers.size === 1) {
      if (state.follow) setFollowFlag(false);
      renderer.panBy(current.x - previous.x, current.y - previous.y);
    } else if (pointers.size === 2) {
      const distance = pinchDistance();
      const rect = els.board.getBoundingClientRect();
      const [a, b] = [...pointers.values()];
      if (lastPinch > 0) {
        renderer.zoomBy(
          distance / lastPinch,
          (a.x + b.x) / 2 - rect.left,
          (a.y + b.y) / 2 - rect.top,
        );
      }
      lastPinch = distance;
    }
    redraw();
  });

  const release = (event) => {
    pointers.delete(event.pointerId);
    lastPinch = pinchDistance();
  };
  els.board.addEventListener("pointerup", release);
  els.board.addEventListener("pointercancel", release);

  // Scroll over the board to zoom towards the cursor.
  els.board.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const rect = els.board.getBoundingClientRect();
      const lines = event.deltaMode === 1 ? 16 : 1;
      renderer.zoomBy(
        Math.exp(-event.deltaY * lines * 0.0015),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
      redraw();
    },
    { passive: false },
  );
}

// ---------------------------------------------------------------------- running

function updatePlayButton() {
  els.play.textContent = state.running ? "Pause" : "Play";
}

function play() {
  if (state.running) return;
  state.running = true;
  state.lastFrame = performance.now();
  state.lastReadout = 0;
  updatePlayButton();
  requestAnimationFrame(frame);
}

function pause() {
  state.running = false;
  updatePlayButton();
}

function toggle() {
  if (state.running) pause();
  else play();
}

/** Runs one step and writes a sentence about what the first ant just did. */
function narratedStep() {
  const simulation = state.simulation;
  const ant = simulation.ants[0];
  const { x, y } = ant;
  const before = simulation.cell(x, y);
  simulation.run(1);
  const after = simulation.cell(x, y);

  const who = simulation.ants.length > 1 ? "Ant 1" : "The ant";
  const stood = before === 0 ? "a ground cell" : `a colour ${before} cell`;
  const left = after === 0 ? "turned it back to ground" : `painted it colour ${after}`;
  state.narration = `${who} stood on ${stood}, ${TURN_PAST[state.config.rule[before]]}, ${left} and moved ${COMPASS[ant.heading]}.`;
}

function stepOnce() {
  pause();
  narratedStep();
  updateReadout();
}

function resetSimulation() {
  applyConfig(state.config);
}

/** One animation frame: simulate as many steps as the elapsed time and speed allow. */
function frame(now) {
  if (!state.running) return;
  const elapsed = Math.min((now - state.lastFrame) / 1000, MAX_FRAME_SECONDS);
  state.lastFrame = now;
  state.budget += state.stepsPerSecond * elapsed;

  const steps = Math.floor(state.budget);
  if (steps > 0) {
    state.budget -= steps;
    if (steps === 1) {
      narratedStep();
    } else {
      state.simulation.run(steps);
      state.narration = NARRATION_FAST;
    }
    redraw();
  }
  if (now - state.lastReadout >= READOUT_INTERVAL_MS) {
    updateReadout();
    state.lastReadout = now;
  }
  requestAnimationFrame(frame);
}

// The slider is logarithmic: 0 -> 1 step/s, 100 -> 1,000,000 steps/s.
const rateFromSlider = (value) => Math.round(10 ** ((value / 100) * 6));

function formatRate(rate) {
  if (rate >= 1_000_000) return "1M steps/s";
  if (rate >= 1000) return `${(rate / 1000).toFixed(rate >= 10000 ? 0 : 1)}k steps/s`;
  return `${rate} steps/s`;
}

function onSpeedChange() {
  state.stepsPerSecond = rateFromSlider(Number(els.speed.value));
  els.speedLabel.textContent = formatRate(state.stepsPerSecond);
}

// ------------------------------------------------------------------------ setup

function updatePresetButtons(rule) {
  for (const button of els.presets.children) {
    button.setAttribute("aria-pressed", String(button.textContent === rule));
  }
  els.presetNote.textContent = PRESET_NOTES[rule] ?? "";
}

function populateControls() {
  for (const size of SIZES) {
    els.size.append(new Option(`${size} by ${size}`, String(size)));
  }
  for (const [key, palette] of Object.entries(PALETTES)) {
    els.palette.append(new Option(palette.label, key));
  }
  els.rule.maxLength = MAX_COLORS;
  els.antCount.max = String(MAX_ANTS);

  for (const rule of PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset";
    button.textContent = rule;
    button.addEventListener("click", () => {
      els.rule.value = rule;
      onConfigChange();
    });
    els.presets.append(button);
  }
}

function bindEvents() {
  els.play.addEventListener("click", toggle);
  els.step.addEventListener("click", stepOnce);
  els.reset.addEventListener("click", resetSimulation);
  els.speed.addEventListener("input", onSpeedChange);
  els.zoomIn.addEventListener("click", () => zoom(ZOOM_STEP));
  els.zoomOut.addEventListener("click", () => zoom(1 / ZOOM_STEP));
  els.zoomWhole.addEventListener("click", showWholeGrid);
  els.zoomPattern.addEventListener("click", fitPattern);
  els.follow.addEventListener("click", () => setFollow(!state.follow));
  els.grid.addEventListener("change", () => {
    renderer.showGrid = els.grid.checked;
    redraw();
  });
  els.rule.addEventListener("input", previewRule);
  els.rule.addEventListener("change", onConfigChange);
  els.size.addEventListener("change", onConfigChange);
  els.antCount.addEventListener("change", onConfigChange);
  els.palette.addEventListener("change", onPaletteChange);
  bindBoardGestures();

  els.share.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      els.share.textContent = "Link copied";
    } catch {
      els.share.textContent = "Copy the address bar";
    }
    setTimeout(() => {
      els.share.textContent = "Copy link";
    }, 1500);
  });

  window.addEventListener("hashchange", () => {
    const config = readConfigFromHash();
    syncInputs(config);
    applyConfig(config);
  });

  // Keep the board sharp when its size changes (window resize, browser zoom).
  new ResizeObserver(() => {
    if (!state.simulation) return;
    renderer.fit();
    redraw();
  }).observe(els.board);

  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target.matches("input, select, textarea")) return;
    if (event.code === "Space" && event.target.tagName !== "BUTTON") {
      event.preventDefault();
      toggle();
    } else if (event.key === "s" || event.key === "S") {
      stepOnce();
    } else if (event.key === "r" || event.key === "R") {
      resetSimulation();
    } else if (event.key === "+" || event.key === "=") {
      zoom(ZOOM_STEP);
    } else if (event.key === "-" || event.key === "_") {
      zoom(1 / ZOOM_STEP);
    } else if (event.key === "0") {
      showWholeGrid();
    } else if (event.key === "f" || event.key === "F") {
      setFollow(!state.follow);
    }
  });
}

function init() {
  populateControls();
  bindEvents();
  els.speed.value = String(DEFAULT_SPEED);
  onSpeedChange();
  const config = readConfigFromHash();
  syncInputs(config);
  applyConfig(config);
}

init();
