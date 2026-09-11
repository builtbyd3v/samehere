#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright-core";

const stateDir = process.env.SAMEHERE_VERIFY_STATE_DIR;
if (!stateDir) {
  fail("SAMEHERE_VERIFY_STATE_DIR is not set");
}

const DEFAULT_VIEWPORT = { width: 1280, height: 800 };

function fail(message, extra) {
  if (extra) console.error(extra);
  console.error(`control-samehere browser: ${message}`);
  process.exit(1);
}

function readState(key) {
  const file = join(stateDir, key);
  if (!existsSync(file)) return "";
  return readFileSync(file, "utf8").trim();
}

function writeState(key, value) {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, key), `${value}\n`);
}

function baseUrl() {
  const host = readState("host") || "127.0.0.1";
  const port = readState("port") || "4173";
  return `http://${host}:${port}`;
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(token);
    }
  }
  return out;
}

function chromePath() {
  const fromEnv = process.env.SAMEHERE_VERIFY_CHROME;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const candidates = [
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((p) => existsSync(p)) || "";
}

async function waitForDevtools(userData, timeoutMs = 20000) {
  const marker = join(userData, "DevToolsActivePort");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(marker)) {
      const [port, path] = readFileSync(marker, "utf8").trim().split("\n");
      if (port && Number(port) > 0) {
        try {
          const res = await fetch(`http://127.0.0.1:${port}/json/version`);
          if (res.ok) return { port, path: path || "" };
        } catch {
          // Chrome is still binding.
        }
      }
    }
    await delay(150);
  }
  fail("Chrome DevTools port never became ready");
}

async function ensureChrome() {
  const existingPid = readState("chrome_pid");
  const existingPort = readState("cdp_port");
  if (existingPid && existingPort) {
    try {
      process.kill(Number(existingPid), 0);
      const res = await fetch(`http://127.0.0.1:${existingPort}/json/version`);
      if (res.ok) return existingPort;
    } catch {
      // Relaunch.
    }
  }

  const chrome = chromePath();
  if (!chrome) fail("google-chrome / chromium not found. Set SAMEHERE_VERIFY_CHROME.");

  const userData = join(stateDir, "chrome-profile");
  rmSync(join(userData, "DevToolsActivePort"), { force: true });
  mkdirSync(userData, { recursive: true });

  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-sync",
      "--remote-debugging-port=0",
      `--user-data-dir=${userData}`,
      `--window-size=${DEFAULT_VIEWPORT.width},${DEFAULT_VIEWPORT.height}`,
      "about:blank",
    ],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
  writeState("chrome_pid", String(child.pid));

  const { port } = await waitForDevtools(userData);
  writeState("cdp_port", port);
  return port;
}

async function connectPage() {
  const port = await ensureChrome();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0] || (await browser.newContext({ viewport: DEFAULT_VIEWPORT }));
  await context.setDefaultTimeout(15000);
  let page = context.pages().find((p) => !p.url().startsWith("devtools://")) || context.pages()[0];
  if (!page) page = await context.newPage();
  await page.setViewportSize(DEFAULT_VIEWPORT);
  return { browser, page };
}

function locatorFor(page, args) {
  const role = args.role;
  const name = args.name;
  const nth = Number(args.nth ?? 0);
  if (!role) fail("missing --role");
  if (!name) fail("missing --name");
  return page.getByRole(role, { name, exact: args.exact === true }).nth(nth);
}

function resolveArtifactPath(p) {
  if (!p) fail("missing --path");
  if (isAbsolute(p)) return p;
  const artifacts = process.env.SAMEHERE_VERIFY_ARTIFACTS_DIR;
  if (artifacts && (p.startsWith("artifacts/") || p.startsWith("artifacts\\"))) {
    return resolve(artifacts, p.slice("artifacts/".length));
  }
  if (artifacts && !p.includes("/")) return resolve(artifacts, p);
  return resolve(process.cwd(), p);
}

function printOk(fields) {
  const parts = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${String(v).replace(/\n/g, " ")}`);
  console.log(`ok ${parts.join(" ")}`);
}

async function cmdGoto(page, args) {
  const path = args.path ?? args._[0] ?? "/";
  const url = path.startsWith("http") ? path : `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator("main").first().waitFor({ state: "visible", timeout: 20000 });
  printOk({
    url: page.url(),
    status: response?.status() ?? "",
    title: await page.title(),
  });
}

async function cmdClick(page, args) {
  const loc = locatorFor(page, args);
  await loc.waitFor({ state: "visible" });
  await loc.click();
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.locator("main").first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  await delay(250);
  printOk({
    url: page.url(),
    title: await page.title(),
    clicked: `${args.role}:${args.name}`,
  });
}

async function cmdFill(page, args) {
  if (args.value === undefined) fail("missing --value");
  const loc = locatorFor(page, args);
  await loc.waitFor({ state: "visible" });
  await loc.fill(String(args.value));
  printOk({
    url: page.url(),
    filled: `${args.role}:${args.name}`,
  });
}

async function cmdPress(page, args) {
  const key = args.key;
  if (!key) fail("missing --key");
  if (args.role && args.name) {
    await locatorFor(page, args).press(key);
  } else {
    await page.keyboard.press(key);
  }
  await delay(200);
  printOk({ url: page.url(), key });
}

async function cmdSnapshot(page, args) {
  const dest = resolveArtifactPath(args.path);
  mkdirSync(dirname(dest), { recursive: true });
  const aria = await page.locator("body").ariaSnapshot();
  writeFileSync(dest, `${aria}\n`);
  printOk({ path: dest, url: page.url(), title: await page.title() });
}

async function cmdScreenshot(page, args) {
  const dest = resolveArtifactPath(args.path);
  mkdirSync(dirname(dest), { recursive: true });
  await page.screenshot({ path: dest, fullPage: args.full === true });
  printOk({ path: dest, url: page.url(), title: await page.title() });
}

async function cmdUrl(page) {
  printOk({ url: page.url(), title: await page.title() });
}

async function cmdWait(page, args) {
  if (args.text) {
    await page.getByText(args.text, { exact: args.exact === true }).first().waitFor({ state: "visible" });
    printOk({ url: page.url(), text: args.text });
    return;
  }
  if (args.url) {
    await page.waitForURL(args.url);
    printOk({ url: page.url() });
    return;
  }
  if (args.role && args.name) {
    await locatorFor(page, args).waitFor({ state: "visible" });
    printOk({ url: page.url(), waited: `${args.role}:${args.name}` });
    return;
  }
  fail("wait needs --text, --url, or --role and --name");
}

const commands = {
  goto: cmdGoto,
  click: cmdClick,
  fill: cmdFill,
  press: cmdPress,
  snapshot: cmdSnapshot,
  screenshot: cmdScreenshot,
  url: cmdUrl,
  wait: cmdWait,
};

const argv = process.argv.slice(2);
const command = argv.shift();
if (!command || !commands[command]) {
  fail(`unknown command '${command || ""}'. Use goto|click|fill|press|snapshot|screenshot|url|wait`);
}

const args = parseArgs(argv);
const { page } = await connectPage();
await commands[command](page, args);
