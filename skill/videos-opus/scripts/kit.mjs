// Lançador do kit de estilos (motor da Edição Automática: HyperFrames + 5 estilos) que vem dentro da skill.
// Roda qualquer comando do kit com os programas portáteis no PATH, sem a aluna instalar nada.
//
//   video.mjs kit [--em <subpasta>] node <script.mjs> [args]   → Node portátil
//   video.mjs kit [--em <subpasta>] hyperframes <args>          → HyperFrames (lint, snapshot…)
//   video.mjs kit [--em <subpasta>] ffmpeg|ffprobe <args>       → FFmpeg portátil
//   video.mjs kit pasta                                          → mostra a pasta de trabalho do kit
//
// Pasta de trabalho: %LOCALAPPDATA%\videos-opus\kit. Os projetos (video-projects), os vídeos prontos (prontos)
// e o perfil.json da aluna ficam ali; o código (node_modules, .claude, scripts…) é ligado por junção à pasta
// da skill. Reinstalar ou atualizar a skill não apaga o trabalho dela.
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, symlinkSync, lstatSync, readlinkSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { SKILL } from "./ferramentas.mjs";

const KIT = join(SKILL, "kit");
const ESTADO = new Set(["video-projects", "prontos", "meus-videos", "meus-prints", "perfil.json", "maquina.json"]);

export function pastaKit() {
  return process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "videos-opus", "kit") : join(homedir(), ".videos-opus", "kit");
}

// Garante a pasta de trabalho: junções para as pastas do kit, cópia dos arquivos soltos, pastas de estado.
export function prepararKit() {
  if (!existsSync(join(KIT, "node_modules", "hyperframes"))) throw new Error("o kit de estilos não está nesta instalação da skill (falta kit/node_modules)");
  const W = pastaKit();
  mkdirSync(W, { recursive: true });
  for (const nome of readdirSync(KIT)) {
    if (ESTADO.has(nome)) continue;
    const src = join(KIT, nome), dst = join(W, nome);
    if (statSync(src).isDirectory()) {
      let ok = false;
      try { ok = lstatSync(dst).isSymbolicLink() && resolve(readlinkSync(dst)) === resolve(src); } catch {}
      if (!ok) {
        try { if (lstatSync(dst).isSymbolicLink()) rmSync(dst, { force: true }); } catch {}
        if (!existsSync(dst)) symlinkSync(src, dst, "junction");
      }
    } else if (!existsSync(dst) || statSync(dst).mtimeMs < statSync(src).mtimeMs) {
      copyFileSync(src, dst);
    }
  }
  for (const d of ["video-projects", "prontos", "meus-videos"]) mkdirSync(join(W, d), { recursive: true });
  return W;
}

function navegador() {
  return [
    process.env.VIDEOS_OPUS_NAVEGADOR,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe"),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean).find((c) => existsSync(c));
}

export function ambienteKit(W) {
  const bin = join(SKILL, "bin");
  const sep = process.platform === "win32" ? ";" : ":";
  const chave = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") || "PATH";
  const env = { ...process.env };
  env[chave] = [bin, join(bin, "whisper"), join(W, "node_modules", ".bin"), process.env[chave] || ""].join(sep);
  env.VIDEOS_OPUS_SKILL = SKILL;
  env.EDICAO_MODELOS = join(SKILL, "modelos");
  env.HYPERFRAMES_FFMPEG_PATH = join(bin, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  const nav = navegador();
  if (nav) env.HYPERFRAMES_BROWSER_PATH = nav;
  env.DO_NOT_TRACK = "1";
  env.HYPERFRAMES_NO_UPDATE_CHECK = "1";
  return env;
}

// Executa e devolve o código de saída do comando (stdout/stderr passam direto).
export async function rodarKit(argv) {
  const W = prepararKit();
  let em = W;
  const a = [...argv];
  if (a[0] === "--em") { em = resolve(W, a[1]); a.splice(0, 2); }
  if (!a.length || a[0] === "pasta") { console.log(JSON.stringify({ ok: true, pasta: W }, null, 1)); return 0; }
  const env = ambienteKit(W);
  const [prog, ...resto] = a;
  let cmd, args;
  if (prog === "node") { cmd = process.execPath; args = resto; }
  else if (prog === "hyperframes" || (prog === "npx" && resto[0] === "hyperframes")) {
    cmd = process.execPath; args = [join(W, "node_modules", "hyperframes", "dist", "cli.js"), ...(prog === "npx" ? resto.slice(1) : resto)];
  }
  else if (prog === "ffmpeg" || prog === "ffprobe") { cmd = join(SKILL, "bin", process.platform === "win32" ? `${prog}.exe` : prog); args = resto; }
  else throw new Error(`o kit só roda node, hyperframes, ffmpeg e ffprobe (pediram: ${prog})`);
  return await new Promise((ok) => {
    const p = spawn(cmd, args, { cwd: em, env, stdio: "inherit" });
    p.on("close", (c) => ok(c ?? 1));
    p.on("error", (e) => { console.error(`não consegui rodar ${prog}: ${e.message}`); ok(1); });
  });
}
