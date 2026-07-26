import { clamp, gaussian, lerp } from "./random.js";

function makePathPoint(x, y, z, radius) {
  return { x, y, z, radius };
}

function growPath(random, origin, angle, options) {
  const {
    segments,
    step,
    taper,
    curvature,
    depthWander,
    startRadius,
    boundary = 112,
  } = options;
  const points = [makePathPoint(origin.x, origin.y, origin.z, startRadius)];
  let x = origin.x;
  let y = origin.y;
  let z = origin.z;
  let direction = angle;

  for (let index = 1; index <= segments; index += 1) {
    direction += gaussian(random, 0, curvature);
    const localStep = step * (0.82 + random() * 0.34);
    x += Math.cos(direction) * localStep;
    y += Math.sin(direction) * localStep;
    z = clamp(z + gaussian(random, 0, depthWander), 0, 40);

    if (Math.abs(x - 100) > boundary || Math.abs(y - 100) > boundary) {
      direction += Math.PI * (0.55 + random() * 0.45);
      x = clamp(x, -8, 208);
      y = clamp(y, -8, 208);
    }

    points.push(
      makePathPoint(
        x,
        y,
        z,
        Math.max(0.18, startRadius * Math.pow(taper, index)),
      ),
    );
  }
  return points;
}

function branchFromPath(random, sourcePath, options) {
  const branchPointIndex = Math.floor(
    lerp(sourcePath.length * 0.34, sourcePath.length * 0.82, random()),
  );
  const start = sourcePath[Math.min(sourcePath.length - 1, branchPointIndex)];
  const previous = sourcePath[Math.max(0, branchPointIndex - 1)];
  const baseAngle = Math.atan2(start.y - previous.y, start.x - previous.x);
  const branchAngle = baseAngle + (random() < 0.5 ? -1 : 1) * lerp(0.35, 0.9, random());
  return growPath(random, start, branchAngle, options);
}

function generateExcitatoryDendrites(random, neuron) {
  const paths = [];
  const apicalAngle = neuron.rotation - Math.PI / 2 + gaussian(random, 0, 0.16);
  const apicalOrigin = {
    x: neuron.x + Math.cos(apicalAngle) * neuron.radiusX * 0.72,
    y: neuron.y + Math.sin(apicalAngle) * neuron.radiusY * 0.72,
    z: neuron.z,
  };
  const apical = growPath(random, apicalOrigin, apicalAngle, {
    segments: 13 + Math.floor(random() * 5),
    step: 3.1,
    taper: 0.9,
    curvature: 0.078,
    depthWander: 0.4,
    startRadius: 1.05,
  });
  paths.push(apical);
  paths.push(
    branchFromPath(random, apical, {
      segments: 7 + Math.floor(random() * 5),
      step: 2.8,
      taper: 0.88,
      curvature: 0.08,
      depthWander: 0.4,
      startRadius: 0.62,
    }),
  );

  const basalCount = 3 + Math.floor(random() * 3);
  for (let index = 0; index < basalCount; index += 1) {
    const angle = neuron.rotation + Math.PI / 2 + (index / basalCount) * Math.PI * 2 + gaussian(random, 0, 0.25);
    const origin = {
      x: neuron.x + Math.cos(angle) * neuron.radiusX * 0.68,
      y: neuron.y + Math.sin(angle) * neuron.radiusY * 0.68,
      z: neuron.z,
    };
    const path = growPath(random, origin, angle, {
      segments: 7 + Math.floor(random() * 6),
      step: 2.25,
      taper: 0.87,
      curvature: 0.145,
      depthWander: 0.5,
      startRadius: 0.72,
    });
    paths.push(path);
    if (random() < 0.63) {
      paths.push(
        branchFromPath(random, path, {
          segments: 4 + Math.floor(random() * 5),
          step: 2.1,
          taper: 0.86,
          curvature: 0.13,
          depthWander: 0.5,
          startRadius: 0.44,
        }),
      );
    }
  }
  return paths;
}

function generateInhibitoryDendrites(random, neuron) {
  const paths = [];
  const count = 5 + Math.floor(random() * 4);
  for (let index = 0; index < count; index += 1) {
    const angle = neuron.rotation + (index / count) * Math.PI * 2 + gaussian(random, 0, 0.32);
    const origin = {
      x: neuron.x + Math.cos(angle) * neuron.radiusX * 0.66,
      y: neuron.y + Math.sin(angle) * neuron.radiusY * 0.66,
      z: neuron.z,
    };
    const path = growPath(random, origin, angle, {
      segments: 7 + Math.floor(random() * 7),
      step: 2.25,
      taper: 0.89,
      curvature: 0.19,
      depthWander: 0.62,
      startRadius: 0.65,
    });
    paths.push(path);
    if (random() < 0.42) {
      paths.push(
        branchFromPath(random, path, {
          segments: 3 + Math.floor(random() * 5),
          step: 2,
          taper: 0.86,
          curvature: 0.18,
          depthWander: 0.62,
          startRadius: 0.4,
        }),
      );
    }
  }
  return paths;
}

function generateAxon(random, neuron) {
  const angle = neuron.rotation + gaussian(random, 0, 1.2);
  const origin = {
    x: neuron.x + Math.cos(angle) * neuron.radiusX * 0.72,
    y: neuron.y + Math.sin(angle) * neuron.radiusY * 0.72,
    z: neuron.z,
  };
  return growPath(random, origin, angle, {
    segments: 25 + Math.floor(random() * 20),
    step: 3.2,
    taper: 0.975,
    curvature: 0.13,
    depthWander: 0.66,
    startRadius: neuron.type === "inhibitory" ? 0.42 : 0.34,
    boundary: 125,
  });
}

function generateContour(random, neuron) {
  const count = 28;
  const contour = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const elongation = neuron.type === "excitatory"
      ? 1 + 0.23 * Math.cos(angle * 2)
      : 1 + 0.1 * Math.cos(angle * 3);
    const irregularity = 1 + gaussian(random, 0, 0.045) + 0.025 * Math.sin(angle * 5 + neuron.id.length);
    contour.push({
      angle,
      radiusX: neuron.radiusX * elongation * irregularity,
      radiusY: neuron.radiusY * irregularity,
    });
  }
  return contour;
}

function generateOrganelles(random, neuron) {
  const mitochondria = [];
  const vesicles = [];
  const mitoCount = 5 + Math.floor(random() * 8);
  for (let index = 0; index < mitoCount; index += 1) {
    const usePath = random() < 0.58 && neuron.dendrites.length > 0;
    mitochondria.push({
      compartment: usePath ? "dendrite" : "soma",
      pathIndex: usePath ? Math.floor(random() * neuron.dendrites.length) : -1,
      phase: random(),
      speed: lerp(0.0025, 0.012, random()) * (random() < 0.5 ? -1 : 1),
      radial: Math.sqrt(random()) * 0.68,
      angle: random() * Math.PI * 2,
      length: lerp(1.2, 3.1, random()),
      width: lerp(0.42, 0.82, random()),
      zOffset: gaussian(random, 0, 1.4),
      activity: lerp(0.7, 1.15, random()),
    });
  }

  const vesicleCount = 16 + Math.floor(random() * 18);
  const transportPaths = [...neuron.dendrites, neuron.axon];
  for (let index = 0; index < vesicleCount; index += 1) {
    vesicles.push({
      pathIndex: Math.floor(random() * transportPaths.length),
      phase: random(),
      speed: lerp(0.01, 0.045, random()) * (random() < 0.18 ? -1 : 1),
      radius: lerp(0.16, 0.33, random()),
      pauseOffset: random() * 20,
    });
  }

  return { mitochondria, vesicles };
}

export function buildNeuronMorphology(random, neuron) {
  neuron.contour = generateContour(random, neuron);
  neuron.dendrites = neuron.type === "excitatory"
    ? generateExcitatoryDendrites(random, neuron)
    : generateInhibitoryDendrites(random, neuron);
  neuron.axon = generateAxon(random, neuron);
  neuron.organelles = generateOrganelles(random, neuron);
  return neuron;
}

export function pointAlongPath(path, amount) {
  if (!path || path.length === 0) return { x: 0, y: 0, z: 0, radius: 0 };
  if (path.length === 1) return path[0];
  const wrapped = ((amount % 1) + 1) % 1;
  const scaled = wrapped * (path.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(path.length - 1, index + 1);
  const fraction = scaled - index;
  const start = path[index];
  const end = path[nextIndex];
  return {
    x: lerp(start.x, end.x, fraction),
    y: lerp(start.y, end.y, fraction),
    z: lerp(start.z, end.z, fraction),
    radius: lerp(start.radius, end.radius, fraction),
    angle: Math.atan2(end.y - start.y, end.x - start.x),
  };
}

export function makeNeuropil(random, count = 185) {
  const fibers = [];
  for (let index = 0; index < count; index += 1) {
    const start = {
      x: lerp(-20, 220, random()),
      y: lerp(-20, 220, random()),
      z: lerp(0, 40, random()),
    };
    fibers.push(
      growPath(random, start, random() * Math.PI * 2, {
        segments: 6 + Math.floor(random() * 13),
        step: lerp(2.2, 4.8, random()),
        taper: 0.985,
        curvature: lerp(0.08, 0.24, random()),
        depthWander: 0.8,
        startRadius: lerp(0.12, 0.46, random()),
        boundary: 145,
      }),
    );
  }
  return fibers;
}

export function makeBackgroundNuclei(random, count = 78) {
  return Array.from({ length: count }, (_, index) => ({
    id: `B${String(index + 1).padStart(2, "0")}`,
    x: lerp(-5, 205, random()),
    y: lerp(-5, 205, random()),
    z: lerp(0, 40, random()),
    rx: lerp(2.2, 4.4, random()),
    ry: lerp(1.8, 3.7, random()),
    angle: random() * Math.PI,
    phase: random() * Math.PI * 2,
  }));
}
