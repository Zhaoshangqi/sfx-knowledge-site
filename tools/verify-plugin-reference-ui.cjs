const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = Number(process.env.PORT || 8891);
const debugPort = Number(process.env.DEBUG_PORT || 9331);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png"
};

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    let filePath = path.join(root, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": mime[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

async function waitForDebugUrl() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const list = await fetchJson(`http://127.0.0.1:${debugPort}/json`);
      if (list[0]?.webSocketDebuggerUrl) return list[0].webSocketDebuggerUrl;
    } catch {}
    await delay(300);
  }
  throw new Error("Timed out waiting for Chrome debugger");
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    }
  });
  return {
    send(method, params = {}) {
      id += 1;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() {
      ws.close();
    }
  };
}

async function main() {
  const server = await serve();
  const chromeProcess = spawn(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-dev-shm-usage",
    "--window-size=1440,1100",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${path.join(root, ".chrome-plugin-ui-verify")}`,
    `http://127.0.0.1:${port}/`
  ], { stdio: "ignore" });

  let client;
  try {
    client = await connect(await waitForDebugUrl());
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Page.navigate", { url: `http://127.0.0.1:${port}/` });
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await delay(500);
      const result = await client.send("Runtime.evaluate", {
        expression: "document.querySelectorAll('.card').length",
        returnByValue: true
      });
      if ((result.result.value || 0) > 0) {
        ready = true;
        break;
      }
    }
    if (!ready) {
      const state = await client.send("Runtime.evaluate", {
        expression: `({
          readyState: document.readyState,
          url: location.href,
          title: document.title,
          body: document.body ? document.body.textContent.slice(0, 240) : "",
          scripts: document.scripts.length
        })`,
        returnByValue: true
      });
      throw new Error(`Timed out waiting for rendered cards: ${JSON.stringify(state.result.value)}`);
    }
    const openResult = await client.send("Runtime.evaluate", {
      expression: `
        (() => {
          const cards = [...document.querySelectorAll(".card")];
          const target = cards.find((card) => /Boom|Noah|素材/.test(card.textContent)) || cards[0];
          if (!target) return { error: "no cards", body: document.body.textContent.slice(0, 120) };
          target.click();
          return { opened: target.textContent.slice(0, 80), cards: cards.length };
        })()
      `,
      returnByValue: true
    });
    if (openResult.exceptionDetails) throw new Error(JSON.stringify(openResult.exceptionDetails));
    if (openResult.result.value?.error) throw new Error(JSON.stringify(openResult.result.value));
    await delay(700);
    const desktop = await client.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `
        (() => {
          const plugins = [...document.querySelectorAll(".reader-detail .plugin")];
          const refs = [...document.querySelectorAll(".plugin-reference")];
          const firstPlugin = plugins[0];
          return {
            readerVisible: !document.getElementById("readerView").hidden,
            plugins: plugins.length,
            refs: refs.length,
            noImagePlugins: plugins.filter((plugin) => !plugin.querySelector(".plugin-reference img")).length,
            officialRefs: refs.filter((ref) => /官方/.test(ref.textContent)).length,
            legacyRefs: refs.filter((ref) => new RegExp(["视频", "对照"].join("")).test(ref.textContent)).length,
            firstPluginHasImage: !!firstPlugin?.querySelector(".plugin-reference img"),
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth
          };
        })()
      `
    });
    if (desktop.exceptionDetails) throw new Error(JSON.stringify(desktop.exceptionDetails));
    await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 2, mobile: true });
    await delay(500);
    const mobile = await client.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `
        (() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          pluginRefs: document.querySelectorAll(".plugin-reference").length,
          firstRefWidth: Math.round(document.querySelector(".plugin-reference")?.getBoundingClientRect().width || 0)
        }))()
      `
    });
    if (mobile.exceptionDetails) throw new Error(JSON.stringify(mobile.exceptionDetails));
    const result = { desktop: desktop.result.value, mobile: mobile.result.value };
    console.log(JSON.stringify(result, null, 2));
    if (result.desktop.legacyRefs !== 0) throw new Error("Legacy video reference cards are still visible");
    if (result.desktop.refs <= 0) throw new Error("No official plugin references rendered in selected detail page");
    if (result.mobile.scrollWidth !== result.mobile.clientWidth) throw new Error("Mobile layout has horizontal overflow");
    if (result.mobile.firstRefWidth > 220) throw new Error("Plugin reference image cards are too large on mobile");
  } finally {
    if (client) client.close();
    chromeProcess.kill();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
