// Grava páginas HTML quadro a quadro com o Microsoft Edge que já vem no Windows (sem baixar Chromium).
// A página precisa expor window.__render(t) e fazer window.__pronto = true quando fontes e imagens carregarem.
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { FFMPEG } from "./ferramentas.mjs";

const require = createRequire(import.meta.url);

function caminhoNavegador() {
  const cands = [
    process.env.VIDEOS_OPUS_NAVEGADOR,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  ].filter(Boolean);
  return cands.find((c) => existsSync(c));
}

export async function abrir(html, largura, altura) {
  const { chromium } = require("playwright-core");
  const exe = caminhoNavegador();
  const navegador = await chromium.launch(exe ? { executablePath: exe } : { channel: "chromium" });
  const pagina = await navegador.newPage({ viewport: { width: largura, height: altura } });
  await pagina.goto(`${pathToFileURL(html).href}#t0`, { waitUntil: "load" });
  await pagina.waitForFunction("window.__pronto === true", null, { timeout: 30000 }).catch(() => {});
  if (!(await pagina.evaluate("typeof window.__render === 'function'"))) {
    await navegador.close();
    throw new Error("a página não expõe window.__render(t): reescreva a animação como função do tempo");
  }
  // Captura pela CDP: JPEG para vídeo opaco (~95 ms/quadro) e PNG rápido com fundo transparente para camadas.
  const cdp = await pagina.context().newCDPSession(pagina);
  let fundoTransparente = false;
  return {
    async quadro(t, transparente = false) {
      if (transparente !== fundoTransparente) {
        await cdp.send("Emulation.setDefaultBackgroundColorOverride", transparente ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
        fundoTransparente = transparente;
      }
      await pagina.evaluate((x) => window.__render(x), t);
      const r = await cdp.send("Page.captureScreenshot", transparente ? { format: "png", optimizeForSpeed: true } : { format: "jpeg", quality: 92, optimizeForSpeed: true });
      return Buffer.from(r.data, "base64");
    },
    fechar: () => navegador.close(),
  };
}

// HTML → MP4 (sem som, ou com --audio). Devolve o caminho de saída.
export async function gravar(html, saida, { largura = 1080, altura = 1920, segundos = 15, fps = 30, audio = null } = {}) {
  const p = await abrir(html, largura, altura);
  const args = ["-hide_banner", "-y", "-loglevel", "error", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(fps), "-i", "-"];
  if (audio) args.push("-i", audio, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-shortest");
  args.push("-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", saida);
  const ff = spawn(FFMPEG, args, { stdio: ["pipe", "ignore", "pipe"] });
  let erro = "";
  ff.stderr.on("data", (d) => (erro += d));
  const fim = new Promise((r) => ff.on("close", r));
  const total = Math.round(segundos * fps);
  for (let i = 0; i < total; i++) {
    const png = await p.quadro(i / fps);
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await p.fechar();
  const codigo = await fim;
  if (codigo !== 0) throw new Error(`ffmpeg falhou ao montar o vídeo: ${erro.trim().split("\n").pop()}`);
  return saida;
}

// Fotos de alguns instantes, para conferir antes de gravar tudo.
export async function fotos(html, instantes, prefixo, { largura = 1080, altura = 1920 } = {}) {
  const { writeFileSync } = await import("node:fs");
  const p = await abrir(html, largura, altura);
  const out = [];
  for (const t of instantes) {
    const arq = `${prefixo}-${String(t).replace(".", "_")}.jpg`;
    writeFileSync(arq, await p.quadro(t));
    out.push(arq);
  }
  await p.fechar();
  return out;
}
