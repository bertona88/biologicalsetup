export class MetricChart {
  constructor(canvas, limit = 120) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.limit = limit;
    this.seriesA = [];
    this.seriesB = [];
  }

  clear() {
    this.seriesA.length = 0;
    this.seriesB.length = 0;
    this.draw();
  }

  push(a, b) {
    this.seriesA.push(Number.isFinite(a) ? a : 0);
    this.seriesB.push(Number.isFinite(b) ? b : 0);
    if (this.seriesA.length > this.limit) {
      this.seriesA.shift();
      this.seriesB.shift();
    }
    this.draw();
  }

  draw() {
    const { canvas, context } = this;
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "rgba(207, 239, 224, 0.09)";
    context.lineWidth = 1;
    for (let row = 1; row < 4; row += 1) {
      const y = (height / 4) * row;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    this.drawSeries(this.seriesB, "#75a7ff", width, height);
    this.drawSeries(this.seriesA, "#b9ff66", width, height);
  }

  drawSeries(values, color, width, height) {
    if (values.length < 2) return;
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (max - min < 1e-6) {
      min -= 0.5;
      max += 0.5;
    }
    const context = this.context;
    context.beginPath();
    values.forEach((value, index) => {
      const x = (index / (this.limit - 1)) * width;
      const y = height - 8 - ((value - min) / (max - min)) * (height - 16);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();
  }
}

