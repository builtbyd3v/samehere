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
  // Prefer the real binary. /usr/local/bin/google-chrome is often a wrapper
  // that forces the desktop user-data-dir and debug port 9222.
  const candidates = [
    "/opt/google/chrome/chrome",
    "/opt/google/chrome/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ];
  return candidates.find((p) => existsSync(p)) || "";
}

function cdpPort() {
  return process.env.SAMEHERE_VERIFY_CDP_PORT || "14173";
}

async function waitForJsonVersion(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return { port: String(port), path: "" };
    } catch {
      // Chrome is still binding.
    }
    const marker = join(stateDir, "chrome-profile", "DevToolsActivePort");
    if (existsSync(marker)) {
      const [filePort] = readFileSync(marker, "utf8").trim().split("\n");
      if (filePort && Number(filePort) > 0) {
        try {
          const res = await fetch(`http://127.0.0.1:${filePort}/json/version`);
          if (res.ok) return { port: filePort, path: "" };
        } catch {
          // keep polling
        }
      }
    }
    await delay(150);
  }
  fail(`Chrome DevTools port ${port} never became ready`);
}

async function ensureChrome() {
  const existingPid = readState("chrome_pid");
  const existingPort = readState("cdp_port") || cdpPort();
  if (existingPid) {
    try {
      process.kill(Number(existingPid), 0);
      const res = await fetch(`http://127.0.0.1:${existingPort}/json/version`);
      if (res.ok) {
        writeState("cdp_port", String(existingPort));
        return String(existingPort);
      }
    } catch {
      // Relaunch.
    }
  }
  try {
    const res = await fetch(`http://127.0.0.1:${cdpPort()}/json/version`);
    if (res.ok) {
      writeState("cdp_port", cdpPort());
      return cdpPort();
    }
  } catch {
    // Need a new Chrome.
  }

  const chrome = chromePath();
  if (!chrome) fail("google-chrome / chromium not found. Set SAMEHERE_VERIFY_CHROME.");

  const userData = join(stateDir, "chrome-profile");
  rmSync(join(userData, "DevToolsActivePort"), { force: true });
  mkdirSync(userData, { recursive: true });
  const port = cdpPort();

  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--use-gl=angle",
      "--use-angle=swiftshader-webgl",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-extensions",
      `--remote-debugging-port=${port}`,
      "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${userData}`,
      `--window-size=${DEFAULT_VIEWPORT.width},${DEFAULT_VIEWPORT.height}`,
      "about:blank",
    ],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
  writeState("chrome_pid", String(child.pid));

  const ready = await waitForJsonVersion(port);
  writeState("cdp_port", ready.port);
  return ready.port;
}

async function connectPage() {
  const port = await ensureChrome();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 15000 });
  const context = browser.contexts()[0] || (await browser.newContext({ viewport: DEFAULT_VIEWPORT }));
  await context.setDefaultTimeout(15000);
  let page = context.pages().find((p) => !p.url().startsWith("devtools://")) || context.pages()[0];
  if (!page) page = await context.newPage();
  await page.setViewportSize(DEFAULT_VIEWPORT);
  await page.emulateMedia({ reducedMotion: "reduce" });
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
  const before = page.url();
  await loc.click();
  try {
    await page.waitForURL((url) => url.href !== before, { timeout: 8000 });
  } catch {
    await page.waitForLoadState("domcontentloaded").catch(() => {});
  }
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
  const aria = await page.locator("body").ariaSnapshot({ timeout: 15000 });
  writeFileSync(dest, `${aria}\n`);
  printOk({ path: dest, url: page.url(), title: await page.title() });
}

async function cmdScreenshot(page, args) {
  const dest = resolveArtifactPath(args.path);
  mkdirSync(dirname(dest), { recursive: true });
  await page.screenshot({ path: dest, fullPage: args.full === true, timeout: 15000 });
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


const SHARE_STUB_SOURCE = `(() => {
  if (window.__samehereVerifyShareStubbed) return;
  window.__samehereVerifyShareStubbed = true;
  window.__samehereVerifyShare = null;
  const record = (url, via) => {
    window.__samehereVerifyShare = { url: String(url || ""), via: String(via || "") };
  };
  try {
    navigator.share = async (data) => {
      record(data && data.url, "share");
    };
  } catch (_) {
    // ignore
  }
  try {
    const clipboard = navigator.clipboard;
    if (clipboard && typeof clipboard.writeText === "function") {
      const original = clipboard.writeText.bind(clipboard);
      clipboard.writeText = async (text) => {
        record(text, "clipboard");
        return original(text);
      };
    } else {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text) => {
            record(text, "clipboard");
          },
        },
      });
    }
  } catch (_) {
    // ignore
  }
})();`;

async function installShareStub(page) {
  const context = page.context();
  // Playwright tracks init scripts per client connection; re-call each process.
  await context.addInitScript({ content: SHARE_STUB_SOURCE });
  if (!page.isClosed()) {
    await page.evaluate(SHARE_STUB_SOURCE).catch(() => {});
  }
}

async function cmdStubShare(page) {
  writeState("share_stub", "1");
  await installShareStub(page);
  printOk({ stub: "share" });
}

async function cmdShareLast(page, args) {
  const captured = await page.evaluate(() => window.__samehereVerifyShare);
  if (!captured || !captured.url) {
    fail("no share URL captured; run stub-share, open the profile, click Share");
  }
  const url = String(captured.url);
  const via = String(captured.via || "");

  if (args["expect-https"] === true) {
    if (!/^https:\/\//.test(url)) {
      fail(`share URL is not absolute https: ${url}`);
    }
  }

  const username = args.username ? String(args.username) : "";
  if (username) {
    const needle = `/profile/${username}`;
    if (!url.includes(needle)) {
      fail(`share URL missing ${needle}: ${url}`);
    }
  }

  const expectPath = args["expect-path"] ? String(args["expect-path"]) : "";
  if (expectPath && !url.includes(expectPath)) {
    fail(`share URL missing ${expectPath}: ${url}`);
  }

  if (args.path) {
    const dest = resolveArtifactPath(args.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, `${JSON.stringify({ url, via }, null, 2)}\n`);
  }

  printOk({ url, via, path: args.path || "" });
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
  "stub-share": cmdStubShare,
  "share-last": cmdShareLast,
};

const argv = process.argv.slice(2);
const command = argv.shift();
if (!command || !commands[command]) {
  fail(`unknown command '${command || ""}'. Use goto|click|fill|press|snapshot|screenshot|url|wait|stub-share|share-last`);
}

const args = parseArgs(argv);
const { page } = await connectPage();
// Re-apply share stub on every reconnect when enabled (Playwright init scripts
// do not survive a new CDP client). Install before goto so the next document sees it.
if (command !== "stub-share" && readState("share_stub") === "1") {
  await installShareStub(page);
}
await commands[command](page, args);
// CDP keeps the event loop alive; do not browser.close() (that kills Chrome).
process.exit(0);
