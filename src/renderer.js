import { pointAlongPath } from "./morphology.js";
import { clamp, lerp, smoothstep } from "./random.js";

const TAU = Math.PI * 2;

function rgba(red, green, blue, alpha) {
  return `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${clamp(alpha, 0, 1)})`;
}

function tracePolyline(context, path) {
  if (!path?.length) return;
  context.beginPath();
  context.moveTo(path[0].x, path[0].y);
  for (let index = 1; index < path.length; index += 1) {
    const point = path[index];
    const previous = path[index - 1];
    const midpointX = (previous.x + point.x) * 0.5;
    const midpointY = (previous.y + point.y) * 0.5;
    context.quadraticCurveTo(previous.x, previous.y, midpointX, midpointY);
  }
  const last = path[path.length - 1];
  context.lineTo(last.x, last.y);
}

function makeCellPath(neuron, timeSeconds) {
  const path = new Path2D();
  const state = neuron.state;
  const push = state.deformation * 0.11;
  const drift = 0.012 * Math.sin(timeSeconds * 0.7 + neuron.x * 0.07);
  neuron.contour.forEach((point, index) => {
    const angularDistance = Math.cos(point.angle - state.deformationAngle);
    const deformation = 1 - push * Math.max(0, angularDistance) + drift * Math.sin(point.angle * 3);
    const x = neuron.x + Math.cos(point.angle + neuron.rotation * 0.08) * point.radiusX * deformation;
    const y = neuron.y + Math.sin(point.angle + neuron.rotation * 0.08) * point.radiusY * deformation;
    if (index === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.closePath();
  return path;
}

function focusWeight(z, focusUm, sigmaUm = 8) {
  const distance = z - focusUm;
  return Math.exp(-(distance * distance) / (2 * sigmaUm * sigmaUm));
}

function pathMeanDepth(path) {
  if (!path?.length) return 20;
  let sum = 0;
  for (const point of path) sum += point.z;
  return sum / path.length;
}

function drawVariablePath(context, path, styleAtSegment, baseWidth = 1) {
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    const style = styleAtSegment(start, end, index);
    if (!style || style.alpha <= 0.001) continue;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.strokeStyle = style.color;
    context.lineWidth = Math.max(0.12, baseWidth * ((start.radius + end.radius) * 0.5) * (style.width ?? 1));
    context.globalAlpha = style.alpha;
    context.stroke();
  }
  context.globalAlpha = 1;
}

export class MicroscopeRenderer {
  constructor(canvas, patch, view = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    this.patch = patch;
    this.view = {
      modality: "phase",
      focusUm: 20,
      exposure: 1,
      polarizationDegrees: 28,
      srsBand: "composite",
      zoom: 1,
      ...view,
    };
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.scale = 1;
    this.centerX = 0;
    this.centerY = 0;
    this.pointer = { visible: false, down: false, xUm: 100, yUm: 100, selectedId: null };
    this.noiseCanvas = document.createElement("canvas");
    this.noiseCanvas.width = 192;
    this.noiseCanvas.height = 192;
    this.noiseContext = this.noiseCanvas.getContext("2d");
    this.noiseImage = this.noiseContext.createImageData(this.noiseCanvas.width, this.noiseCanvas.height);
    this.lastNoiseUpdate = -Infinity;
    this.frameTime = 0;
    this.resize();
  }

  setPatch(patch) {
    this.patch = patch;
  }

  setView(next) {
    Object.assign(this.view, next);
    this.view.focusUm = clamp(this.view.focusUm, 0, this.patch.extentUm.depth);
    this.view.exposure = clamp(this.view.exposure, 0.45, 1.8);
    this.view.zoom = clamp(this.view.zoom, 0.72, 2.8);
  }

  setPointer(next) {
    Object.assign(this.pointer, next);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const backingWidth = Math.round(this.width * this.dpr);
    const backingHeight = Math.round(this.height * this.dpr);
    if (this.canvas.width !== backingWidth || this.canvas.height !== backingHeight) {
      this.canvas.width = backingWidth;
      this.canvas.height = backingHeight;
    }
    this.centerX = this.width * 0.5;
    this.centerY = this.height * 0.5;
    const fit = Math.min(this.width / 230, this.height / 214);
    this.scale = fit * this.view.zoom;
  }

  worldToScreen(xUm, yUm) {
    return {
      x: this.centerX + (xUm - 100) * this.scale,
      y: this.centerY + (yUm - 100) * this.scale,
    };
  }

  screenToWorld(x, y) {
    return {
      x: 100 + (x - this.centerX) / this.scale,
      y: 100 + (y - this.centerY) / this.scale,
    };
  }

  pixelsPerUm() {
    return this.scale;
  }

  render(frameTimeSeconds) {
    this.frameTime = frameTimeSeconds;
    this.resize();
    const context = this.context;
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.filter = "none";

    if (this.view.modality === "calcium") this.drawCalcium();
    else if (this.view.modality === "shg") this.drawShg();
    else if (this.view.modality === "srs") this.drawSrs();
    else this.drawPhase();

    this.drawSelection();
    this.drawPokeEvents();
    this.drawProbe();
    this.drawOpticalArtifacts();
  }

  beginWorld() {
    const context = this.context;
    context.save();
    context.translate(this.centerX, this.centerY);
    context.scale(this.scale, this.scale);
    context.translate(-100, -100);
    context.lineCap = "round";
    context.lineJoin = "round";
    const driftX = Math.sin(this.patch.timeSeconds * 0.19) * 0.28;
    const driftY = Math.sin(this.patch.timeSeconds * 0.13 + 1.2) * 0.22;
    context.translate(driftX, driftY);
  }

  endWorld() {
    this.context.restore();
  }

  drawPhaseBackground() {
    const context = this.context;
    const illumination = context.createRadialGradient(
      this.width * 0.47,
      this.height * 0.43,
      15,
      this.width * 0.5,
      this.height * 0.5,
      Math.max(this.width, this.height) * 0.72,
    );
    illumination.addColorStop(0, "#bbc0b6");
    illumination.addColorStop(0.48, "#a8aea5");
    illumination.addColorStop(0.83, "#8b918a");
    illumination.addColorStop(1, "#696e69");
    context.fillStyle = illumination;
    context.fillRect(0, 0, this.width, this.height);

    const wash = context.createLinearGradient(0, 0, this.width, this.height);
    wash.addColorStop(0, "rgba(229,235,224,0.07)");
    wash.addColorStop(0.52, "rgba(30,38,34,0.025)");
    wash.addColorStop(1, "rgba(24,31,28,0.11)");
    context.fillStyle = wash;
    context.fillRect(0, 0, this.width, this.height);
  }

  drawDarkBackground(colorA, colorB) {
    const context = this.context;
    const gradient = context.createRadialGradient(
      this.width * 0.48,
      this.height * 0.44,
      10,
      this.width * 0.5,
      this.height * 0.5,
      Math.max(this.width, this.height) * 0.74,
    );
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(1, colorB);
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);
  }

  drawNeuropilPhase() {
    const context = this.context;
    for (const path of this.patch.neuropil) {
      const depth = pathMeanDepth(path);
      const weight = focusWeight(depth, this.view.focusUm, 10);
      const blur = Math.min(2.3, Math.abs(depth - this.view.focusUm) * 0.055);
      context.save();
      context.filter = blur > 0.2 ? `blur(${blur}px)` : "none";
      tracePolyline(context, path);
      context.lineWidth = Math.max(0.12, path[0].radius * 1.7);
      context.strokeStyle = rgba(44, 53, 49, 0.075 + weight * 0.12);
      context.stroke();
      context.restore();
    }

    for (const nucleus of this.patch.backgroundNuclei) {
      const weight = focusWeight(nucleus.z, this.view.focusUm, 7.5);
      const drift = 0.08 * Math.sin(this.patch.timeSeconds * 0.27 + nucleus.phase);
      context.save();
      context.translate(nucleus.x + drift, nucleus.y - drift * 0.5);
      context.rotate(nucleus.angle);
      context.filter = Math.abs(nucleus.z - this.view.focusUm) > 9 ? "blur(1.1px)" : "none";
      context.fillStyle = rgba(57, 64, 61, 0.035 + weight * 0.095);
      context.beginPath();
      context.ellipse(0, 0, nucleus.rx, nucleus.ry, 0, 0, TAU);
      context.fill();
      context.restore();
    }
  }

  drawPhase() {
    this.drawPhaseBackground();
    this.beginWorld();
    this.drawNeuropilPhase();
    const neurons = [...this.patch.neurons].sort((a, b) => a.z - b.z);
    for (const neuron of neurons) this.drawPhaseNeuron(neuron);
    this.endWorld();
  }

  drawPhaseNeuron(neuron) {
    const context = this.context;
    const depthWeight = focusWeight(neuron.z, this.view.focusUm, 7.2);
    const depthDistance = Math.abs(neuron.z - this.view.focusUm);
    const blur = Math.min(5.2, depthDistance * 0.16);
    const contrast = (0.08 + depthWeight * 0.92) * this.view.exposure;

    context.save();
    context.filter = blur > 0.18 ? `blur(${blur}px)` : "none";

    for (const path of neuron.dendrites) {
      const pathWeight = focusWeight(pathMeanDepth(path), this.view.focusUm, 8.5);
      tracePolyline(context, path);
      context.lineWidth = Math.max(0.24, path[0].radius * 2.15);
      context.strokeStyle = rgba(238, 243, 236, (0.025 + pathWeight * 0.065) * contrast);
      context.stroke();
      tracePolyline(context, path);
      context.lineWidth = Math.max(0.12, path[0].radius * 1.08);
      context.strokeStyle = rgba(43, 50, 47, (0.055 + pathWeight * 0.145) * contrast);
      context.stroke();
    }

    tracePolyline(context, neuron.axon);
    context.lineWidth = 0.8;
    context.strokeStyle = rgba(38, 45, 42, (0.035 + depthWeight * 0.09) * contrast);
    context.stroke();

    const cellPath = makeCellPath(neuron, this.patch.timeSeconds);
    context.save();
    context.shadowColor = rgba(238, 244, 234, 0.72 * depthWeight);
    context.shadowBlur = 3.2;
    context.strokeStyle = rgba(242, 246, 239, (0.075 + depthWeight * 0.19) * contrast);
    context.lineWidth = 1.2;
    context.stroke(cellPath);
    context.restore();

    const somaGradient = context.createRadialGradient(
      neuron.x - neuron.radiusX * 0.25,
      neuron.y - neuron.radiusY * 0.22,
      0.2,
      neuron.x,
      neuron.y,
      Math.max(neuron.radiusX, neuron.radiusY) * 1.1,
    );
    somaGradient.addColorStop(0, rgba(225, 230, 221, (0.075 + depthWeight * 0.12) * contrast));
    somaGradient.addColorStop(0.52, rgba(118, 126, 120, (0.065 + depthWeight * 0.16) * contrast));
    somaGradient.addColorStop(1, rgba(49, 58, 54, (0.085 + depthWeight * 0.18) * contrast));
    context.fillStyle = somaGradient;
    context.fill(cellPath);

    context.save();
    context.translate(neuron.x + neuron.nucleus.offsetX, neuron.y + neuron.nucleus.offsetY);
    context.rotate(neuron.nucleus.rotation);
    const nuclearGradient = context.createRadialGradient(-0.7, -0.5, 0.1, 0, 0, neuron.nucleus.radiusX * 1.1);
    nuclearGradient.addColorStop(0, rgba(128, 136, 130, (0.035 + depthWeight * 0.09) * contrast));
    nuclearGradient.addColorStop(1, rgba(37, 43, 40, (0.06 + depthWeight * 0.15) * contrast));
    context.fillStyle = nuclearGradient;
    context.beginPath();
    context.ellipse(0, 0, neuron.nucleus.radiusX, neuron.nucleus.radiusY, 0, 0, TAU);
    context.fill();
    context.strokeStyle = rgba(232, 237, 230, (0.025 + depthWeight * 0.065) * contrast);
    context.lineWidth = 0.35;
    context.stroke();
    context.restore();

    this.drawPhaseOrganelles(neuron, depthWeight);
    context.restore();
  }

  mitochondrionPosition(neuron, organelle) {
    if (organelle.compartment === "dendrite") {
      const path = neuron.dendrites[organelle.pathIndex % neuron.dendrites.length];
      return pointAlongPath(path, organelle.phase + this.patch.timeSeconds * organelle.speed);
    }
    const wobble = 0.05 * Math.sin(this.patch.timeSeconds * 0.7 + organelle.phase * 20);
    return {
      x: neuron.x + Math.cos(organelle.angle + wobble) * neuron.radiusX * organelle.radial,
      y: neuron.y + Math.sin(organelle.angle - wobble) * neuron.radiusY * organelle.radial,
      z: clamp(neuron.z + organelle.zOffset, 0, 40),
      angle: organelle.angle + Math.PI * 0.5 + wobble,
    };
  }

  drawPhaseOrganelles(neuron, neuronDepthWeight) {
    const context = this.context;
    for (const mitochondrion of neuron.organelles.mitochondria) {
      const point = this.mitochondrionPosition(neuron, mitochondrion);
      const weight = focusWeight(point.z, this.view.focusUm, 5.8) * neuronDepthWeight;
      context.save();
      context.translate(point.x, point.y);
      context.rotate(point.angle ?? mitochondrion.angle);
      context.fillStyle = rgba(36, 42, 39, 0.1 + weight * 0.22);
      context.strokeStyle = rgba(226, 233, 224, 0.035 + weight * 0.075);
      context.lineWidth = 0.22;
      context.beginPath();
      context.ellipse(0, 0, mitochondrion.length * 0.5, mitochondrion.width * 0.5, 0, 0, TAU);
      context.fill();
      context.stroke();
      context.restore();
    }

    const transportPaths = [...neuron.dendrites, neuron.axon];
    for (const vesicle of neuron.organelles.vesicles) {
      const pause = 0.7 + 0.3 * Math.sin(this.patch.timeSeconds * 0.35 + vesicle.pauseOffset);
      const point = pointAlongPath(
        transportPaths[vesicle.pathIndex % transportPaths.length],
        vesicle.phase + this.patch.timeSeconds * vesicle.speed * pause * neuron.state.metabolic,
      );
      const weight = focusWeight(point.z, this.view.focusUm, 4.5);
      context.fillStyle = rgba(31, 37, 34, 0.04 + weight * 0.13);
      context.beginPath();
      context.arc(point.x, point.y, vesicle.radius, 0, TAU);
      context.fill();
    }
  }

  drawCalcium() {
    this.drawDarkBackground("#07110d", "#010403");
    this.beginWorld();
    const context = this.context;
    context.globalCompositeOperation = "lighter";

    for (const path of this.patch.neuropil) {
      const weight = focusWeight(pathMeanDepth(path), this.view.focusUm, 10);
      tracePolyline(context, path);
      context.lineWidth = Math.max(0.1, path[0].radius * 1.3);
      context.strokeStyle = rgba(36, 121, 75, 0.008 + weight * 0.018 * this.view.exposure);
      context.stroke();
    }

    const neurons = [...this.patch.neurons].sort((a, b) => a.z - b.z);
    for (const neuron of neurons) this.drawCalciumNeuron(neuron);
    this.drawCalciumWaves();
    this.endWorld();
  }

  drawCalciumNeuron(neuron) {
    const context = this.context;
    const depth = focusWeight(neuron.z, this.view.focusUm, 8.5);
    const fluorescence = clamp(0.025 + neuron.state.indicator * 1.28, 0, 1.4) * this.view.exposure;
    const alpha = clamp((0.06 + fluorescence * 0.62) * depth, 0.015, 0.95);
    const glow = clamp(neuron.state.spikeGlow * 0.75 + fluorescence * 0.32, 0, 1);
    context.save();
    const blur = Math.min(3.3, Math.abs(neuron.z - this.view.focusUm) * 0.085);
    context.filter = blur > 0.25 ? `blur(${blur}px)` : "none";
    context.shadowColor = rgba(64, 255, 147, 0.72 * glow * depth);
    context.shadowBlur = 7 + glow * 12;

    for (const path of neuron.dendrites) {
      const pathWeight = focusWeight(pathMeanDepth(path), this.view.focusUm, 8.5);
      tracePolyline(context, path);
      context.lineWidth = Math.max(0.24, path[0].radius * 1.85);
      context.strokeStyle = rgba(
        48 + 35 * fluorescence,
        186 + 62 * fluorescence,
        93 + 58 * fluorescence,
        alpha * pathWeight * 0.72,
      );
      context.stroke();
    }

    tracePolyline(context, neuron.axon);
    context.lineWidth = 0.52;
    context.strokeStyle = rgba(46, 206, 104, alpha * 0.42);
    context.stroke();

    const cellPath = makeCellPath(neuron, this.patch.timeSeconds);
    const somaGradient = context.createRadialGradient(
      neuron.x - neuron.radiusX * 0.2,
      neuron.y - neuron.radiusY * 0.25,
      0,
      neuron.x,
      neuron.y,
      Math.max(neuron.radiusX, neuron.radiusY) * 1.08,
    );
    somaGradient.addColorStop(0, rgba(122, 255, 174, alpha * 0.82));
    somaGradient.addColorStop(0.5, rgba(47, 216, 111, alpha * 0.66));
    somaGradient.addColorStop(1, rgba(11, 76, 42, alpha * 0.3));
    context.fillStyle = somaGradient;
    context.fill(cellPath);
    context.strokeStyle = rgba(98, 255, 156, alpha * 0.58);
    context.lineWidth = 0.5;
    context.stroke(cellPath);
    context.restore();
  }

  drawCalciumWaves() {
    const context = this.context;
    for (const wave of this.patch.spikeWaves) {
      const neuron = this.patch.neuronById.get(wave.neuronId);
      if (!neuron) continue;
      const age = this.patch.timeSeconds - wave.startTime;
      const progress = clamp(age / 0.25, 0, 1);
      const fade = 1 - smoothstep(0.18, 0.82, age);
      if (fade <= 0) continue;
      const paths = [...neuron.dendrites, neuron.axon];
      context.save();
      context.shadowColor = "rgba(111,255,173,0.9)";
      context.shadowBlur = 8;
      for (const path of paths) {
        if (path.length < 2) continue;
        const point = pointAlongPath(path, progress);
        const previous = pointAlongPath(path, Math.max(0, progress - 0.05));
        context.beginPath();
        context.moveTo(previous.x, previous.y);
        context.lineTo(point.x, point.y);
        context.strokeStyle = rgba(162, 255, 202, fade * 0.72 * this.view.exposure);
        context.lineWidth = Math.max(0.4, point.radius * 2.1);
        context.stroke();
      }
      context.restore();
    }
  }

  drawShg() {
    this.drawDarkBackground("#070a16", "#010106");
    this.beginWorld();
    const context = this.context;
    context.globalCompositeOperation = "lighter";
    const polarization = (this.view.polarizationDegrees * Math.PI) / 180;

    for (const path of this.patch.neuropil) {
      drawVariablePath(
        context,
        path,
        (start, end) => {
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const orientation = Math.pow(Math.abs(Math.cos(2 * (angle - polarization))), 4);
          const depth = focusWeight((start.z + end.z) * 0.5, this.view.focusUm, 8);
          return {
            alpha: (0.006 + orientation * 0.035) * depth * this.view.exposure,
            color: rgba(104, 141, 255, 1),
            width: 1.4,
          };
        },
        1,
      );
    }

    for (const neuron of this.patch.neurons) this.drawShgNeuron(neuron, polarization);
    this.endWorld();
  }

  drawShgNeuron(neuron, polarization) {
    const context = this.context;
    const voltageNorm = clamp((neuron.state.voltageMv + 72) / 28, 0, 1);
    const activeBoost = 0.72 + voltageNorm * 0.26 + neuron.state.spikeGlow * 0.24;
    const paths = [...neuron.dendrites, neuron.axon];
    for (const path of paths) {
      drawVariablePath(
        context,
        path,
        (start, end) => {
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const orientation = Math.pow(Math.abs(Math.cos(2 * (angle - polarization))), 3.4);
          const depth = focusWeight((start.z + end.z) * 0.5, this.view.focusUm, 6.5);
          const alpha = (0.025 + orientation * 0.62) * depth * activeBoost * this.view.exposure;
          const blueMix = orientation;
          return {
            alpha,
            color: rgba(135 + 47 * blueMix, 101 + 104 * blueMix, 255, 1),
            width: path === neuron.axon ? 1.4 : 1.8,
          };
        },
        1,
      );
    }

    const contourPoints = neuron.contour.map((point) => ({
      x: neuron.x + Math.cos(point.angle) * point.radiusX,
      y: neuron.y + Math.sin(point.angle) * point.radiusY,
      z: neuron.z,
      radius: 0.48,
    }));
    contourPoints.push(contourPoints[0]);
    drawVariablePath(
      context,
      contourPoints,
      (start, end) => {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const orientation = Math.pow(Math.abs(Math.cos(2 * (angle - polarization))), 4);
        const depth = focusWeight(neuron.z, this.view.focusUm, 6.5);
        return {
          alpha: (0.05 + orientation * 0.8) * depth * activeBoost * this.view.exposure,
          color: rgba(172 + orientation * 50, 106 + orientation * 80, 255, 1),
          width: 1.6,
        };
      },
      0.78,
    );
  }

  drawSrs() {
    this.drawDarkBackground("#11100d", "#030302");
    this.beginWorld();
    const context = this.context;
    context.globalCompositeOperation = "lighter";
    const band = this.view.srsBand;

    for (const path of this.patch.neuropil) {
      const weight = focusWeight(pathMeanDepth(path), this.view.focusUm, 9.5);
      tracePolyline(context, path);
      context.lineWidth = Math.max(0.12, path[0].radius * 1.75);
      const lipid = band !== "protein";
      context.strokeStyle = lipid
        ? rgba(232, 173, 74, (0.015 + weight * 0.05) * this.view.exposure)
        : rgba(80, 148, 174, (0.006 + weight * 0.018) * this.view.exposure);
      context.stroke();
    }

    for (const nucleus of this.patch.backgroundNuclei) {
      const weight = focusWeight(nucleus.z, this.view.focusUm, 7.5);
      if (band === "lipid") continue;
      context.save();
      context.translate(nucleus.x, nucleus.y);
      context.rotate(nucleus.angle);
      context.fillStyle = rgba(69, 170, 190, (0.02 + weight * 0.09) * this.view.exposure);
      context.beginPath();
      context.ellipse(0, 0, nucleus.rx, nucleus.ry, 0, 0, TAU);
      context.fill();
      context.restore();
    }

    for (const neuron of this.patch.neurons) this.drawSrsNeuron(neuron, band);
    this.endWorld();
  }

  drawSrsNeuron(neuron, band) {
    const context = this.context;
    const depth = focusWeight(neuron.z, this.view.focusUm, 7.2);
    const lipidVisible = band !== "protein";
    const proteinVisible = band !== "lipid";
    const metabolic = neuron.state.metabolic;
    context.save();
    const blur = Math.min(2.2, Math.abs(neuron.z - this.view.focusUm) * 0.06);
    context.filter = blur > 0.22 ? `blur(${blur}px)` : "none";

    if (lipidVisible) {
      for (const path of [...neuron.dendrites, neuron.axon]) {
        tracePolyline(context, path);
        context.lineWidth = Math.max(0.22, path[0].radius * 1.75);
        context.strokeStyle = rgba(239, 177, 70, (0.09 + depth * 0.32) * this.view.exposure);
        context.stroke();
      }
    }

    const cellPath = makeCellPath(neuron, this.patch.timeSeconds);
    if (proteinVisible) {
      const proteinGradient = context.createRadialGradient(
        neuron.x - neuron.radiusX * 0.18,
        neuron.y - neuron.radiusY * 0.2,
        0,
        neuron.x,
        neuron.y,
        Math.max(neuron.radiusX, neuron.radiusY),
      );
      proteinGradient.addColorStop(0, rgba(112, 205, 213, depth * 0.42 * this.view.exposure));
      proteinGradient.addColorStop(1, rgba(38, 97, 111, depth * 0.2 * this.view.exposure));
      context.fillStyle = proteinGradient;
      context.fill(cellPath);
    }
    if (lipidVisible) {
      context.strokeStyle = rgba(255, 188, 72, depth * 0.58 * this.view.exposure);
      context.lineWidth = 0.68;
      context.stroke(cellPath);
    }

    if (proteinVisible) {
      context.save();
      context.translate(neuron.x + neuron.nucleus.offsetX, neuron.y + neuron.nucleus.offsetY);
      context.rotate(neuron.nucleus.rotation);
      context.fillStyle = rgba(70, 185, 202, depth * 0.38 * this.view.exposure);
      context.beginPath();
      context.ellipse(0, 0, neuron.nucleus.radiusX, neuron.nucleus.radiusY, 0, 0, TAU);
      context.fill();
      context.restore();
    }

    if (lipidVisible) {
      for (const mitochondrion of neuron.organelles.mitochondria) {
        const point = this.mitochondrionPosition(neuron, mitochondrion);
        const weight = focusWeight(point.z, this.view.focusUm, 5.5) * depth;
        context.save();
        context.translate(point.x, point.y);
        context.rotate(point.angle ?? mitochondrion.angle);
        context.fillStyle = rgba(255, 207, 92, (0.12 + weight * 0.45) * metabolic * this.view.exposure);
        context.beginPath();
        context.ellipse(0, 0, mitochondrion.length * 0.55, mitochondrion.width * 0.58, 0, 0, TAU);
        context.fill();
        context.restore();
      }
    }
    context.restore();
  }

  drawSelection() {
    const id = this.pointer.selectedId;
    if (!id) return;
    const neuron = this.patch.neuronById.get(id);
    if (!neuron) return;
    const point = this.worldToScreen(neuron.x, neuron.y);
    const radius = Math.max(neuron.radiusX, neuron.radiusY) * this.scale + 7;
    const context = this.context;
    context.save();
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    context.strokeStyle = this.view.modality === "phase"
      ? "rgba(255,255,255,0.42)"
      : "rgba(185,255,220,0.45)";
    context.lineWidth = 1;
    context.setLineDash([3, 4]);
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, TAU);
    context.stroke();
    context.setLineDash([]);
    context.restore();
  }

  drawPokeEvents() {
    const context = this.context;
    context.save();
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const event of this.patch.pokeEvents) {
      const age = this.patch.timeSeconds - event.time;
      const progress = clamp(age / 0.75, 0, 1);
      const point = this.worldToScreen(event.x, event.y);
      const radius = (4 + progress * 20) * Math.min(1.5, this.scale / 4);
      const fade = (1 - progress) * (event.hitNeuronId ? 0.58 : 0.22);
      context.strokeStyle = this.view.modality === "phase"
        ? rgba(248, 252, 248, fade)
        : rgba(147, 255, 199, fade);
      context.lineWidth = 1;
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, TAU);
      context.stroke();
    }
    context.restore();
  }

  drawProbe() {
    if (!this.pointer.visible) return;
    const context = this.context;
    const point = this.worldToScreen(this.pointer.xUm, this.pointer.yUm);
    const reach = Math.max(115, Math.min(this.width, this.height) * 0.22);
    const originX = point.x + reach * 0.9;
    const originY = point.y - reach * 0.62;
    const dx = point.x - originX;
    const dy = point.y - originY;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;

    context.save();
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    context.globalAlpha = this.pointer.down ? 0.92 : 0.46;
    const gradient = context.createLinearGradient(originX, originY, point.x, point.y);
    gradient.addColorStop(0, "rgba(224,238,230,0.05)");
    gradient.addColorStop(0.74, "rgba(238,247,241,0.24)");
    gradient.addColorStop(1, "rgba(255,255,255,0.74)");
    context.fillStyle = gradient;
    context.strokeStyle = "rgba(236,246,240,0.28)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(originX + nx * 6, originY + ny * 6);
    context.lineTo(point.x + nx * 0.7, point.y + ny * 0.7);
    context.lineTo(point.x - nx * 0.7, point.y - ny * 0.7);
    context.lineTo(originX - nx * 6, originY - ny * 6);
    context.closePath();
    context.fill();
    context.stroke();

    if (this.pointer.down) {
      context.fillStyle = "rgba(246,255,250,0.92)";
      context.shadowColor = "rgba(184,255,215,0.9)";
      context.shadowBlur = 9;
      context.beginPath();
      context.arc(point.x, point.y, 1.7, 0, TAU);
      context.fill();
    }
    context.restore();
  }

  updateNoise() {
    if (this.frameTime - this.lastNoiseUpdate < 0.075) return;
    this.lastNoiseUpdate = this.frameTime;
    const data = this.noiseImage.data;
    const modalityBoost = this.view.modality === "calcium" ? 1 : this.view.modality === "shg" ? 0.75 : 0.42;
    for (let index = 0; index < data.length; index += 4) {
      const value = Math.floor(Math.random() * 255);
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = Math.floor(Math.random() * 18 * modalityBoost);
    }
    this.noiseContext.putImageData(this.noiseImage, 0, 0);
  }

  drawOpticalArtifacts() {
    const context = this.context;
    context.save();
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.updateNoise();
    context.globalCompositeOperation = this.view.modality === "phase" ? "multiply" : "screen";
    context.globalAlpha = this.view.modality === "phase" ? 0.18 : 0.28 / Math.max(0.7, this.view.exposure);
    context.imageSmoothingEnabled = false;
    context.drawImage(this.noiseCanvas, 0, 0, this.width, this.height);
    context.globalCompositeOperation = "source-over";

    const vignette = context.createRadialGradient(
      this.width * 0.5,
      this.height * 0.48,
      Math.min(this.width, this.height) * 0.24,
      this.width * 0.5,
      this.height * 0.5,
      Math.max(this.width, this.height) * 0.68,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.72, "rgba(0,0,0,0.035)");
    vignette.addColorStop(1, "rgba(0,0,0,0.34)");
    context.fillStyle = vignette;
    context.fillRect(0, 0, this.width, this.height);

    const lineY = ((this.frameTime * 47) % (this.height + 40)) - 20;
    context.fillStyle = this.view.modality === "phase"
      ? "rgba(255,255,255,0.016)"
      : "rgba(155,255,204,0.018)";
    context.fillRect(0, lineY, this.width, 1);
    context.restore();
  }
}
