// Grava páginas HTML quadro a quadro com o navegador do computador: Edge (vem no Windows) ou Chrome. No Mac sem
// Chrome, o instalador baixa o Chrome headless do Playwright para a pasta de cache (`navegadores-baixados`).
// A página precisa expor window.__render(t) e fazer window.__pronto = true quando fontes e imagens carregarem.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { FFMPEG, SKILL } from "./ferramentas.mjs";

const require = createRequire(import.meta.url);

const ESCOLHIDO = join(SKILL, "navegador.txt");   // o navegador que abriu de verdade no último teste

// Todos os navegadores instalados, na ordem de preferência (Edge, que vem no Windows, e depois Chrome).
export function navegadores() {
  const cands = [
    process.env.VIDEOS_OPUS_NAVEGADOR,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    // Mac: em /Applications ou na pasta Aplicativos do próprio usuário
    ...["/Applications", join(homedir(), "Applications")].flatMap((a) => [
      join(a, "Google Chrome.app/Contents/MacOS/Google Chrome"),
      join(a, "Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
      join(a, "Brave Browser.app/Contents/MacOS/Brave Browser"),
      join(a, "Chromium.app/Contents/MacOS/Chromium"),
    ]),
    ...navegadoresBaixados(),
  ].filter(Boolean);
  return [...new Set(cands)].filter((c) => existsSync(c));
}

// Chrome headless que o Playwright baixa (instalador do Mac, quando não há navegador). Fica no cache padrão dele.
function navegadoresBaixados() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), process.platform === "darwin" ? "Library/Caches/ms-playwright" : ".cache/ms-playwright");
  const achados = [];
  try {
    for (const d of readdirSync(base)) {
      if (!d.startsWith("chromium")) continue;
      for (const sub of ["chrome-mac/headless_shell", "chrome-mac-arm64/headless_shell", "chrome-headless-shell-mac-arm64/chrome-headless-shell", "chrome-headless-shell-mac-x64/chrome-headless-shell", "chrome-linux/headless_shell"]) {
        const c = join(base, d, sub);
        if (existsSync(c)) achados.push(c);
      }
    }
  } catch {}
  return achados;
}

// O que o kit de estilos (HyperFrames) deve usar: o que já abriu antes; senão o primeiro instalado.
export function navegadorPreferido() {
  try { const c = readFileSync(ESCOLHIDO, "utf8").trim(); if (c && existsSync(c)) return c; } catch {}
  return navegadores()[0];
}

// Abre o primeiro navegador que o Windows deixar. Se o Edge for barrado (antivírus, política), tenta o Chrome.
async function lancar(chromium) {
  const preferido = navegadorPreferido();
  const lista = [...new Set([preferido, ...navegadores()].filter(Boolean))];
  if (!lista.length) throw new Error("nenhum navegador encontrado: instale o Google Chrome (google.com/chrome) e tente de novo");
  const erros = [];
  for (const exe of lista) {
    try {
      const b = await chromium.launch({ executablePath: exe });
      if (exe !== preferido || !existsSync(ESCOLHIDO)) { try { writeFileSync(ESCOLHIDO, exe); } catch {} }
      return b;
    } catch (e) { erros.push(`${basename(exe)}: ${e.message.split("\n")[0]}`); }
  }
  const bloqueio = erros.some((m) => /EPERM|EACCES|ACCESS_DENIED|UNKNOWN/i.test(m));
  throw new Error(bloqueio && process.platform === "darwin"
    ? `o Mac bloqueou a abertura do navegador. Abra o Google Chrome uma vez pelo Launchpad e tente de novo (${erros.join("; ")})`
    : bloqueio
    ? `o Windows ou o antivírus bloqueou a abertura do navegador. Libere a pasta ${SKILL} nas exceções do antivírus e tente de novo (${erros.join("; ")})`
    : `não consegui abrir o navegador (${erros.join("; ")})`);
}

export async function abrir(html, largura, altura) {
  const { chromium } = require("playwright-core");
  const navegador = await lancar(chromium);
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
