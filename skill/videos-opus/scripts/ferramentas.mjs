// Caminhos dos programas portáteis que vêm dentro da skill e utilidades comuns.
// No Windows usa bin/*.exe da própria skill; fora dele (desenvolvimento) cai para o que estiver no PATH.
import { existsSync, mkdirSync, copyFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname, basename, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { spawnSync, execFileSync } from "node:child_process";

export const SKILL = dirname(dirname(fileURLToPath(import.meta.url)));
const WIN = process.platform === "win32";
const BIN = join(SKILL, "bin");
const exe = (nome, sub = "") => {
  const p = join(BIN, sub, WIN ? `${nome}.exe` : nome);
  return existsSync(p) ? p : nome;
};
export const FFMPEG = exe("ffmpeg");
export const FFPROBE = exe("ffprobe");
export const WHISPER = exe("whisper-cli", "whisper");
export const MODELO = process.env.VIDEOS_OPUS_MODELO || join(SKILL, "modelos", "ggml-small-q5_1.bin");
export const FONTES = join(SKILL, "fontes");

export function rodar(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });
  if (r.error) throw new Error(`não consegui rodar ${basename(cmd)}: ${r.error.message}`);
  if (r.status !== 0 && !opts.aceitaErro) {
    const fim = (r.stderr || "").trim().split("\n").slice(-6).join("\n");
    throw new Error(`${basename(cmd)} falhou (código ${r.status}):\n${fim}`);
  }
  return r;
}

// O whisper.cpp (fopen do C) não abre caminhos com acento no Windows (ex.: C:\\Users\\Conceição\\…) e trava com 0xC0000409.
// Por isso roda a partir da pasta do modelo e recebe caminhos RELATIVOS, que não carregam o nome da usuária.
// arquivos: { f: wav, of: base de saída, vm?: modelo do VAD }; extra: demais argumentos.
export function rodarWhisper(arquivos, extra = [], opts = {}) {
  const cwd = dirname(MODELO);
  const rel = (p) => relative(cwd, p) || ".";
  const args = ["-m", basename(MODELO), "-f", rel(arquivos.f), "-of", rel(arquivos.of)];
  if (arquivos.vm) args.push("--vad", "-vm", rel(arquivos.vm));
  return rodar(WHISPER, [...args, ...extra], { ...opts, cwd });
}

export function ffmpeg(args, opts = {}) {
  return rodar(FFMPEG, ["-hide_banner", "-y", "-loglevel", "error", ...args], opts);
}

export function probe(arquivo) {
  const r = rodar(FFPROBE, ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", arquivo]);
  const j = JSON.parse(r.stdout);
  const v = (j.streams || []).find((s) => s.codec_type === "video");
  const a = (j.streams || []).find((s) => s.codec_type === "audio");
  let w = v?.width || 0, h = v?.height || 0;
  const rot = Number(v?.tags?.rotate || (v?.side_data_list || []).find((s) => s.rotation != null)?.rotation || 0);
  if (Math.abs(rot) % 180 === 90) [w, h] = [h, w];
  const [fn, fd] = String(v?.r_frame_rate || "30/1").split("/").map(Number);
  return {
    duracao: Number(j.format?.duration || 0), largura: w, altura: h, temAudio: !!a, temVideo: !!v,
    codec: v?.codec_name, fps: fd ? fn / fd : 30, hdr: /arib-std-b67|smpte2084/.test(v?.color_transfer || ""),
    bytes: Number(j.format?.size || 0),
  };
}

// HDR de celular (HLG do iPhone, PQ do Android) vira SDR; sem isso a cor sai lavada no Instagram.
export function filtroHDR(info) {
  if (!info.hdr) return "";
  return "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,";
}

// Encoder rápido para arquivos intermediários: placa de vídeo se existir, senão CPU.
let encCache;
export function encoderRapido() {
  if (encCache) return encCache;
  const CPU = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p"];
  if (process.env.VIDEOS_OPUS_ENCODER === "cpu") return (encCache = CPU);
  for (const [nome, extra] of [
    ["h264_nvenc", ["-preset", "p4", "-rc", "vbr", "-cq", "19", "-b:v", "0"]],
    ["h264_qsv", ["-global_quality", "20"]],
    ["h264_amf", ["-quality", "balanced", "-rc", "cqp", "-qp_i", "18", "-qp_p", "20"]],
    ["h264_videotoolbox", ["-b:v", "12M", "-allow_sw", "1"]],   // Mac
  ]) {
    const t = spawnSync(FFMPEG, ["-v", "error", "-f", "lavfi", "-i", "color=c=black:s=320x320:d=0.2", "-pix_fmt", "yuv420p", "-c:v", nome, ...extra, "-f", "null", "-"]);
    if (t.status === 0) return (encCache = ["-c:v", nome, ...extra, "-pix_fmt", "yuv420p"]);
  }
  return (encCache = CPU);
}
// Encoder do arquivo final que a aluna posta: qualidade alta e compatível com Instagram e WhatsApp.
export const ENCODER_FINAL = ["-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart"];

// Véu em degradê escuro atrás da legenda (padrão premium: legibilidade sem contorno nas letras).
// Devolve um trecho de filtro que recebe [entrada] e entrega [saida].
export function filtroVeu(W, H, posicao, entrada, saida) {
  const a = posicao === "cima" ? `if(lt(Y,H*0.42),(H*0.42-Y)/(H*0.42)*150,0)`
    : posicao === "meio" ? `if(lt(abs(Y-H*0.5),H*0.2),(1-abs(Y-H*0.5)/(H*0.2))*120,0)`
    : `if(gt(Y,H*0.5),(Y-H*0.5)/(H*0.5)*165,0)`;
  return `color=c=0x140a05:s=${W}x${H}:d=1,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${a}'[veu];${entrada}[veu]overlay=0:0:eof_action=repeat${saida}`;
}

export const FORMATOS = {
  reels: [1080, 1920], stories: [1080, 1920], tiktok: [1080, 1920],
  feed: [1080, 1350], retrato: [1080, 1350],
  quadrado: [1080, 1080],
  horizontal: [1920, 1080], youtube: [1920, 1080],
};

// Pasta de trabalho de cada vídeo (fora da Área de Trabalho, para não poluir).
export function pastaTrabalho(nome) {
  const base = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "videos-opus", "trabalhos") : join(homedir(), ".videos-opus", "trabalhos");
  const d = new Date(), z = (n) => String(n).padStart(2, "0");
  const carimbo = `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
  const slug = basename(nome, extname(nome)).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "-").slice(0, 40);
  const p = join(base, `${slug}-${carimbo}`);
  mkdirSync(p, { recursive: true });
  return p;
}

// Área de Trabalho real (no Windows pode estar dentro do OneDrive).
export function areaDeTrabalho() {
  if (WIN) {
    try {
      const d = Buffer.from(execFileSync("powershell", ["-NoProfile", "-Command", "[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes([Environment]::GetFolderPath('Desktop')))"], { encoding: "utf8" }).trim(), "base64").toString("utf8");   // base64: acento ("Área de Trabalho") não quebra no codepage do console
      if (d && existsSync(d)) return d;
    } catch {}
  }
  for (const d of [join("OneDrive", "Área de Trabalho"), join("OneDrive", "Desktop"), "Desktop", "Área de Trabalho"]) {
    const c = join(homedir(), d);
    if (existsSync(c)) return c;
  }
  return homedir();
}

// Onde os vídeos prontos vão: "Vídeos editados" na Área de Trabalho. Se o antivírus (Acesso a Pastas Controladas,
// escudo anti-ransomware) não deixar gravar ali, vai para C:\Users\<ela>\Vídeos editados, que não é pasta protegida.
let saidaCache = null;
export function pastaSaida() {
  if (saidaCache) return saidaCache;
  for (const p of [join(areaDeTrabalho(), "Vídeos editados"), join(homedir(), "Vídeos editados")]) {
    try {
      mkdirSync(p, { recursive: true });
      const t = join(p, `.teste-${process.pid}`);
      writeFileSync(t, "ok");
      unlinkSync(t);
      return (saidaCache = p);
    } catch {}
  }
  throw new Error(`o Windows ou o antivírus não deixou gravar em "Vídeos editados" na Área de Trabalho nem em ${join(homedir(), "Vídeos editados")}: libere a pasta ${SKILL} nas exceções do antivírus`);
}

// Copia o resultado para "Vídeos editados" sem sobrescrever nada.
export function entregar(arquivo, nomeBase) {
  const destino = pastaSaida();
  const base = basename(nomeBase, extname(nomeBase));
  for (let n = 1; ; n++) {
    const alvo = join(destino, n === 1 ? `${base}.mp4` : `${base}-${n}.mp4`);
    if (!existsSync(alvo)) { copyFileSync(arquivo, alvo); return alvo; }
  }
}

// Opções que nunca levam valor (o que vier depois delas é argumento comum).
const SEM_VALOR = new Set(["ultimo", "encaixar", "leve", "sem-entregar", "completos", "com-refacao", "manter-inicio"]);
export function lerArgs(argv) {
  const pos = [], op = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2), prox = argv[i + 1];
      if (SEM_VALOR.has(k) || prox === undefined || prox.startsWith("--")) op[k] = true; else { op[k] = prox; i++; }
    } else pos.push(a.trim().replace(/^["']|["']$/g, ""));
  }
  return { pos, op };
}

export function listarFontes() {
  return existsSync(FONTES) ? readdirSync(FONTES).filter((f) => /\.(ttf|otf)$/i.test(f)) : [];
}

export const tempo = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
