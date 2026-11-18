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
const DEFAULTS = { rule: "RL", size: 200, ants: 1, palette: DEFAULT_PALETTE };

const TURN_TEXT = { L: "turns left", R: "turns right", N: "goes straight", U: "turns around" };

const byId = (id) => document.getElementById(id);
const els = {
  board: byId("board"),
  sprites: byId("sprites"),
  caption: byId("caption"),
  play: byId("play"),
  step: byId("step"),
  reset: byId("reset"),
  speed: byId("speed"),
  speedLabel: byId("speed-label"),
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

const renderer = new Renderer(els.board, els.sprites);
const state = {
  simulation: null,
  config: { ...DEFAULTS },
  running: false,
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

  renderer.resize(size, size);
  renderer.setPalette(config.palette, simulation.nColors);
  buildColourTable(config.rule);
  updatePresetButtons(config.rule);
  pause();
  renderer.draw(simulation);
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
  renderer.draw(state.simulation);
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

function updateReadout() {
  const stats = state.simulation.stats();
  els.caption.textContent = describe(stats);
  els.statSteps.textContent = format(stats.steps);
  els.statPainted.textContent = format(stats.painted);
  els.statBox.textContent = stats.boundingBox
    ? `${stats.boundingBox.width} by ${stats.boundingBox.height}`
    : "none yet";
  stats.colorCounts.forEach((count, i) => {
    state.countCells[i].textContent = format(count);
  });
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

function stepOnce() {
  pause();
  state.simulation.run(1);
  renderer.draw(state.simulation);
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
    state.simulation.run(steps);
    renderer.draw(state.simulation);
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
  els.rule.addEventListener("input", previewRule);
  els.rule.addEventListener("change", onConfigChange);
  els.size.addEventListener("change", onConfigChange);
  els.antCount.addEventListener("change", onConfigChange);
  els.palette.addEventListener("change", onPaletteChange);

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

  // Keep the ant sharp when the board changes size (window resize, browser zoom).
  new ResizeObserver(() => {
    if (!state.simulation) return;
    renderer.fitSprites();
    renderer.draw(state.simulation);
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
