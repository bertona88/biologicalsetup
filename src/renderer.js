const SLIDE_WIDTH = 400;
const SLIDE_HEIGHT = 260;
const MAX_BACKING_PIXELS = 1920 * 1080;

const FIELD_VERTEX = `#version 300 es
layout(location = 0) in vec2 a_position;
uniform vec2 u_scale;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position * u_scale, 0.0, 1.0);
}`;

const FIELD_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_field;
uniform int u_view;
uniform float u_time;
in vec2 v_uv;
out vec4 out_color;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 values = texture(u_field, vec2(v_uv.x, 1.0 - v_uv.y)).rg;
  float illumination = 0.91 + 0.09 * (1.0 - length(v_uv - 0.48));
  float grain = (hash(floor(v_uv * vec2(900.0, 580.0)) + floor(u_time * 8.0)) - 0.5) * 0.018;
  vec3 color;
  if (u_view == 0) {
    color = mix(vec3(0.018, 0.055, 0.046), vec3(0.075, 0.125, 0.104), 0.35 + values.r * 0.13);
    color += vec3(grain);
  } else if (u_view == 1) {
    color = vec3(0.003, 0.012, 0.010) + vec3(0.0, 0.018, 0.012) * values.g;
  } else {
    vec3 glucose = vec3(0.12, 0.32, 0.72) * values.r;
    vec3 cue = vec3(0.94, 0.43, 0.08) * values.g;
    float contours = smoothstep(0.47, 0.5, abs(fract((values.r + values.g) * 8.0) - 0.5));
    color = vec3(0.012, 0.028, 0.032) + glucose + cue + contours * 0.025;
  }
  out_color = vec4(max(color * illumination, 0.0), 1.0);
}`;

const ENTITY_VERTEX = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_quad;
layout(location = 1) in vec2 a_position;
layout(location = 2) in vec2 a_radius_angle;
layout(location = 3) in float a_kind;
layout(location = 4) in vec4 a_state;
layout(location = 5) in float a_id;
uniform vec2 u_scale;
out vec2 v_local;
flat out float v_kind;
flat out float v_id;
out vec4 v_state;

void main() {
  float elongation = a_kind < 1.5 ? 1.9 : (a_kind > 2.5 && a_kind < 3.5 ? 1.18 : 1.0);
  float wobble = a_kind > 1.5 && a_kind < 2.5 ? 1.0 + 0.05 * sin(a_id * 2.31) : 1.0;
  vec2 local = a_quad * vec2(elongation, wobble) * a_radius_angle.x;
  float c = cos(a_radius_angle.y);
  float s = sin(a_radius_angle.y);
  vec2 rotated = mat2(c, -s, s, c) * local;
  vec2 world = a_position + rotated;
  vec2 clip = vec2(world.x / ${SLIDE_WIDTH.toFixed(1)} * 2.0 - 1.0, 1.0 - world.y / ${SLIDE_HEIGHT.toFixed(1)} * 2.0);
  gl_Position = vec4(clip * u_scale, 0.0, 1.0);
  v_local = a_quad;
  v_kind = a_kind;
  v_id = a_id;
  v_state = a_state;
}`;

const ENTITY_FRAGMENT = `#version 300 es
precision highp float;
uniform int u_view;
uniform float u_selected;
uniform float u_time;
in vec2 v_local;
flat in float v_kind;
flat in float v_id;
in vec4 v_state;
out vec4 out_color;

void main() {
  float radial = length(v_local);
  float boundary = radial;
  if (v_kind > 1.5 && v_kind < 2.5) {
    float angle = atan(v_local.y, v_local.x);
    boundary *= 1.0 + 0.055 * sin(angle * 7.0 + v_id * 1.7 + u_time * 0.25);
  } else if (v_kind > 2.5 && v_kind < 3.5) {
    boundary = pow(pow(abs(v_local.x), 4.0) + pow(abs(v_local.y), 4.0), 0.25);
  }
  float edge = fwidth(boundary) * 1.4;
  float body = 1.0 - smoothstep(0.93 - edge, 0.93 + edge, boundary);
  float rim = 1.0 - smoothstep(0.78, 0.93, boundary);
  rim = body - rim;
  float nucleus = 1.0 - smoothstep(0.25, 0.34, length(v_local - vec2(0.08, -0.03)));

  vec3 color = vec3(0.72, 0.82, 0.76);
  float alpha = body * 0.72;
  if (u_view == 0) {
    if (v_kind < 1.5) color = vec3(0.67, 0.82, 0.59);
    else if (v_kind < 2.5) color = vec3(0.62, 0.78, 0.72);
    else if (v_kind < 3.5) color = vec3(0.72, 0.71, 0.57);
    else color = vec3(0.60, 0.72, 0.65);
    color = mix(color * 0.45, color, rim + nucleus * 0.34);
    alpha = body * 0.78;
  } else if (u_view == 1) {
    if (v_kind < 1.5) {
      float intensity = clamp(v_state.x / 0.6, 0.25, 1.2);
      color = vec3(0.56, 1.0, 0.28) * intensity;
    } else if (v_kind < 2.5) {
      color = mix(vec3(0.05, 0.36, 0.31), vec3(0.29, 0.97, 0.88), clamp(v_state.z + v_state.x * 0.12, 0.0, 1.0));
    } else if (v_kind < 3.5) {
      color = mix(vec3(0.14, 0.20, 0.16), vec3(1.0, 0.45, 0.18), clamp(v_state.x, 0.0, 1.0));
    } else {
      float calcium = clamp(v_state.y / 1.5, 0.04, 1.0);
      color = v_kind > 4.5
        ? mix(vec3(0.22, 0.03, 0.07), vec3(1.0, 0.25, 0.42), calcium)
        : mix(vec3(0.04, 0.16, 0.06), vec3(0.65, 1.0, 0.23), calcium);
    }
    alpha = body * (0.35 + max(max(color.r, color.g), color.b) * 0.65);
  } else {
    if (v_kind < 1.5) color = vec3(0.64, 0.92, 0.35);
    else if (v_kind < 2.5) color = vec3(0.30, 0.86, 0.82);
    else if (v_kind < 3.5) color = vec3(0.87, 0.77, 0.51);
    else color = v_kind > 4.5 ? vec3(1.0, 0.35, 0.50) : vec3(0.65, 1.0, 0.25);
    alpha = rim * 0.95 + body * 0.12;
  }

  float selected = abs(v_id - u_selected) < 0.25 ? 1.0 : 0.0;
  float selection_ring = selected * smoothstep(0.78, 0.85, boundary) * (1.0 - smoothstep(0.94, 0.99, boundary));
  color = mix(color, vec3(0.73, 1.0, 0.40), selection_ring);
  alpha = max(alpha, selection_ring);
  if (alpha < 0.01) discard;
  out_color = vec4(color, alpha);
}`;

const LINE_VERTEX = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
layout(location = 1) in float a_sign;
uniform vec2 u_scale;
out float v_sign;
void main() {
  vec2 clip = vec2(a_position.x / ${SLIDE_WIDTH.toFixed(1)} * 2.0 - 1.0, 1.0 - a_position.y / ${SLIDE_HEIGHT.toFixed(1)} * 2.0);
  gl_Position = vec4(clip * u_scale, 0.0, 1.0);
  v_sign = a_sign;
}`;

const LINE_FRAGMENT = `#version 300 es
precision highp float;
uniform int u_view;
in float v_sign;
out vec4 out_color;
void main() {
  vec3 excitatory = u_view == 1 ? vec3(0.60, 1.0, 0.25) : vec3(0.45, 0.70, 0.57);
  vec3 inhibitory = vec3(1.0, 0.28, 0.44);
  out_color = vec4(v_sign < 0.0 ? inhibitory : excitatory, u_view == 1 ? 0.21 : 0.11);
}`;

export class SlideRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      depth: false,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
    });
    if (!this.gl) {
      throw new Error("WebGL 2 is required for the virtual slide renderer.");
    }
    this.view = 0;
    this.selected = 0;
    this.scale = [1, 1];
    this.fieldPixels = null;
    this.lastFieldShape = "";
    this.initialize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  initialize() {
    const gl = this.gl;
    this.fieldProgram = createProgram(gl, FIELD_VERTEX, FIELD_FRAGMENT);
    this.entityProgram = createProgram(gl, ENTITY_VERTEX, ENTITY_FRAGMENT);
    this.lineProgram = createProgram(gl, LINE_VERTEX, LINE_FRAGMENT);

    this.fieldBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fieldBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    this.instanceBuffer = gl.createBuffer();
    this.lineBuffer = gl.createBuffer();
    this.fieldTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const desiredWidth = Math.max(1, Math.round(rect.width * dpr));
    const desiredHeight = Math.max(1, Math.round(rect.height * dpr));
    const pixelScale = Math.min(
      1,
      Math.sqrt(MAX_BACKING_PIXELS / (desiredWidth * desiredHeight)),
    );
    const width = Math.max(1, Math.round(desiredWidth * pixelScale));
    const height = Math.max(1, Math.round(desiredHeight * pixelScale));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.gl.viewport(0, 0, width, height);
    const screenAspect = rect.width / Math.max(rect.height, 1);
    const worldAspect = SLIDE_WIDTH / SLIDE_HEIGHT;
    this.scale =
      screenAspect > worldAspect
        ? [worldAspect / screenAspect, 1]
        : [1, screenAspect / worldAspect];
  }

  worldCoordinates(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;
    const normalizedX = ndcX / this.scale[0];
    const normalizedY = ndcY / this.scale[1];
    return {
      x: ((normalizedX + 1) * 0.5) * SLIDE_WIDTH,
      y: ((1 - normalizedY) * 0.5) * SLIDE_HEIGHT,
      inside:
        Math.abs(normalizedX) <= 1 &&
        Math.abs(normalizedY) <= 1,
    };
  }

  render(frame, timeSeconds) {
    const gl = this.gl;
    gl.clearColor(0.005, 0.016, 0.013, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawField(frame, timeSeconds);
    if (frame.connections.length > 0) {
      this.drawConnections(frame);
    }
    this.drawEntities(frame, timeSeconds);
  }

  drawField(frame, timeSeconds) {
    const gl = this.gl;
    const shape = `${frame.fieldWidth}x${frame.fieldHeight}`;
    if (shape !== this.lastFieldShape) {
      this.fieldPixels = new Uint8Array(frame.fieldWidth * frame.fieldHeight * 4);
      this.lastFieldShape = shape;
    }
    for (let index = 0; index < frame.glucose.length; index += 1) {
      const output = index * 4;
      this.fieldPixels[output] = Math.round(Math.min(1, frame.glucose[index] / 2.5) * 255);
      this.fieldPixels[output + 1] = Math.round(Math.min(1, frame.cue[index] / 2.0) * 255);
      this.fieldPixels[output + 2] = 0;
      this.fieldPixels[output + 3] = 255;
    }

    gl.useProgram(this.fieldProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fieldBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2fv(gl.getUniformLocation(this.fieldProgram, "u_scale"), this.scale);
    gl.uniform1i(gl.getUniformLocation(this.fieldProgram, "u_view"), this.view);
    gl.uniform1f(gl.getUniformLocation(this.fieldProgram, "u_time"), timeSeconds);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTexture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      frame.fieldWidth,
      frame.fieldHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.fieldPixels,
    );
    gl.uniform1i(gl.getUniformLocation(this.fieldProgram, "u_field"), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  drawEntities(frame, timeSeconds) {
    if (frame.count === 0) return;
    const gl = this.gl;
    gl.useProgram(this.entityProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, frame.entities, gl.DYNAMIC_DRAW);
    const strideBytes = frame.stride * 4;
    instanceAttribute(gl, 1, 2, strideBytes, 2 * 4);
    instanceAttribute(gl, 2, 2, strideBytes, 4 * 4);
    instanceAttribute(gl, 3, 1, strideBytes, 1 * 4);
    instanceAttribute(gl, 4, 4, strideBytes, 6 * 4);
    instanceAttribute(gl, 5, 1, strideBytes, 0);

    gl.uniform2fv(gl.getUniformLocation(this.entityProgram, "u_scale"), this.scale);
    gl.uniform1i(gl.getUniformLocation(this.entityProgram, "u_view"), this.view);
    gl.uniform1f(gl.getUniformLocation(this.entityProgram, "u_selected"), this.selected);
    gl.uniform1f(gl.getUniformLocation(this.entityProgram, "u_time"), timeSeconds);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, frame.count);
  }

  drawConnections(frame) {
    const idToPosition = new Map();
    for (let offset = 0; offset < frame.entities.length; offset += frame.stride) {
      idToPosition.set(frame.entities[offset], [
        frame.entities[offset + 2],
        frame.entities[offset + 3],
      ]);
    }
    const vertices = [];
    for (let offset = 0; offset < frame.connections.length; offset += 4) {
      const source = idToPosition.get(frame.connections[offset]);
      const target = idToPosition.get(frame.connections[offset + 1]);
      if (!source || !target) continue;
      const sign = Math.sign(frame.connections[offset + 2]) || 1;
      vertices.push(source[0], source[1], sign, target[0], target[1], sign);
    }
    if (vertices.length === 0) return;

    const gl = this.gl;
    gl.useProgram(this.lineProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 12, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 12, 8);
    gl.vertexAttribDivisor(0, 0);
    gl.vertexAttribDivisor(1, 0);
    gl.uniform2fv(gl.getUniformLocation(this.lineProgram, "u_scale"), this.scale);
    gl.uniform1i(gl.getUniformLocation(this.lineProgram, "u_view"), this.view);
    gl.drawArrays(gl.LINES, 0, vertices.length / 3);
  }
}

function instanceAttribute(gl, location, size, stride, offset) {
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
  gl.vertexAttribDivisor(location, 1);
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`WebGL program link failed: ${gl.getProgramInfoLog(program)}`);
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  return program;
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`WebGL shader compile failed: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

