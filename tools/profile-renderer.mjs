import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, webkit } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = 4174;
const url = `http://127.0.0.1:${port}/`;
const sustainedSeconds = 45;
const openCloseCycles = 8;
const maxBackingPixels = 1920 * 1080;
const maxRenderHz = 30.5;
const requestedBrowser = process.env.PROFILE_BROWSER || "chromium";
const browserType = { chromium, webkit }[requestedBrowser];

if (!browserType) {
  throw new Error(`PROFILE_BROWSER must be "chromium" or "webkit", received "${requestedBrowser}"`);
}

function processTreeRssMb(rootPid) {
  const rows = execFileSync("ps", ["-eo", "pid=,ppid=,rss="], { encoding: "utf8" })
    .trim()
    .split("\n")
    .map((line) => line.trim().split(/\s+/).map(Number))
    .filter(([pid, parentPid, rss]) => Number.isFinite(pid) && Number.isFinite(parentPid) && Number.isFinite(rss));
  const descendants = new Set([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [pid, parentPid] of rows) {
      if (!descendants.has(pid) && descendants.has(parentPid)) {
        descendants.add(pid);
        changed = true;
      }
    }
  }
  const rssKb = rows
    .filter(([pid]) => descendants.has(pid))
    .reduce((sum, [, , rss]) => sum + rss, 0);
  return rssKb / 1024;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server startup is bounded by the loop.
    }
    await delay(100);
  }
  throw new Error(`local server did not become ready at ${url}`);
}

function summarize(samples) {
  return {
    firstMb: Number(samples[0].toFixed(1)),
    lastMb: Number(samples.at(-1).toFixed(1)),
    peakMb: Number(Math.max(...samples).toFixed(1)),
    growthMb: Number((samples.at(-1) - samples[0]).toFixed(1)),
  };
}

const webServer = spawn(
  "python3",
  ["-m", "http.server", String(port), "--bind", "127.0.0.1"],
  { cwd: root, stdio: "ignore" },
);

let browserServer;
try {
  await waitForServer();
  browserServer = await browserType.launchServer({
    headless: true,
    ...(requestedBrowser === "chromium"
      ? { args: ["--enable-precise-memory-info"] }
      : {}),
  });
  const browser = await browserType.connect(browserServer.wsEndpoint());
  const browserPid = browserServer.process().pid;
  const consoleErrors = [];
  const sustainedRss = [];

  const context = await browser.newContext({
    viewport: { width: 1728, height: 1117 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__biologicalSetupMetrics?.renderedFrames > 0);

  const start = await page.evaluate(() => ({
    frames: window.__biologicalSetupMetrics.renderedFrames,
    pixels: window.__biologicalSetupMetrics.backingPixels,
  }));
  const startedAt = Date.now();
  const modalities = ["phase", "calcium", "shg", "srs"];

  for (let second = 0; second < sustainedSeconds; second += 1) {
    if (second % 10 === 0) {
      const modality = modalities[(second / 10) % modalities.length];
      await page.locator(`button[data-modality="${modality}"]`).click();
      await page.locator("#specimenCanvas").click({ position: { x: 864, y: 558 } });
    }
    sustainedRss.push(processTreeRssMb(browserPid));
    await delay(1000);
  }

  const finish = await page.evaluate(() => ({
    frames: window.__biologicalSetupMetrics.renderedFrames,
    pixels: window.__biologicalSetupMetrics.backingPixels,
  }));
  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  const renderHz = (finish.frames - start.frames) / elapsedSeconds;
  await context.close();
  await delay(1500);

  const cycleRss = [];
  for (let cycle = 0; cycle < openCloseCycles; cycle += 1) {
    const cycleContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2,
    });
    const cyclePage = await cycleContext.newPage();
    cyclePage.on("pageerror", (error) => consoleErrors.push(`cycle ${cycle}: ${error.message}`));
    await cyclePage.goto(url, { waitUntil: "load" });
    await cyclePage.waitForFunction(() => window.__biologicalSetupMetrics?.renderedFrames >= 10);
    await cycleContext.close();
    await delay(500);
    cycleRss.push(processTreeRssMb(browserPid));
  }

  const sustainedMemory = summarize(sustainedRss.slice(10));
  const cycleMemory = summarize(cycleRss);
  const result = {
    browser: requestedBrowser,
    sustainedSeconds,
    openCloseCycles,
    viewport: "1728x1117@2x requested",
    backingPixels: finish.pixels,
    maxBackingPixels,
    renderHz: Number(renderHz.toFixed(2)),
    maxRenderHz,
    sustainedMemory,
    cycleMemory,
    consoleErrors,
  };

  const failures = [];
  if (finish.pixels > maxBackingPixels) failures.push("backing-pixel budget exceeded");
  if (renderHz > maxRenderHz) failures.push("render-rate budget exceeded");
  if (sustainedMemory.growthMb > 160) failures.push("sustained browser memory grew by more than 160 MB after warmup");
  if (cycleMemory.growthMb > 192) failures.push("open/close cycles grew browser memory by more than 192 MB");
  if (consoleErrors.length) failures.push("browser console or page errors were recorded");

  console.log(JSON.stringify({ ...result, failures }, null, 2));
  await browser.close();
  if (failures.length) process.exitCode = 1;
} finally {
  await browserServer?.close().catch(() => {});
  webServer.kill("SIGTERM");
}
