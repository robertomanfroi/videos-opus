#!/usr/bin/env node
// Vídeo de referência: baixa o link (Instagram, TikTok, YouTube) e destrincha a edição para o Claude modelar o estilo.
// O mesmo arquivo está na Vídeos Opus (scripts/referencia.mjs) e na Edição Automática (_motor/referencia.mjs):
// mudou um, copie para o outro.
//
//   node referencia.mjs <link ou caminho do vídeo> [--pasta <pasta de saída>]
//
// Programas: FFMPEG, FFPROBE e YTDLP pelo ambiente; sem eles, procura ao lado (bin/), no venv da Edição
// Automática e no PATH. Imprime um JSON no fim; tudo o que gera fica na pasta (ficha.json + imagens + fala.wav).
//
// O vídeo baixado é só para estudo, na máquina de quem pediu: nunca republicar, nem reaproveitar texto,
// marca, música ou imagens dele.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, extname, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const WIN = process.platform === "win32";
const AQUI = dirname(fileURLToPath(import.meta.url));

function acharPrograma(nome, variavel) {
  if (process.env[variavel]) return process.env[variavel];
  const arq = WIN ? `${nome}.exe` : nome;
  const lugares = [
    join(AQUI, "..", "bin", arq), // Vídeos Opus: scripts/ ao lado de bin/
    join(homedir(), ".venvs", "edicao", WIN ? "Scripts" : "bin", arq), // Edição Automática: yt-dlp do venv
  ];
  return lugares.find(existsSync) || nome;
}

function rodar(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });
  if (r.error) throw new Error(`não consegui rodar ${basename(cmd)}: ${r.error.message}`);
  if (r.status !== 0 && !opts.aceitaErro) {
    const fim = (r.stderr || "").trim().split("\n").slice(-6).join("\n");
    throw new Error(`${basename(cmd)} falhou (código ${r.status}):\n${fim}`);
  }
  return r;
}

export const ehLink = (s) => /^https?:\/\//i.test(String(s || "").trim());

// ---------------------------------------------------------------- baixar
const MOTIVO_SALVAR =
  "Não consegui baixar esse link (perfil privado, post só de fotos, ou o Instagram barrou). " +
  "Peça para salvar o vídeo (ou gravar a tela) e colocar em Downloads, e use o caminho do arquivo.";

/** Baixa o vídeo do link para `pasta`. Devolve { video, autor, legenda, link } ou lança erro com motivo simples. */
export function baixar(link, pasta, { ytdlp = acharPrograma("yt-dlp", "YTDLP"), ffmpeg = acharPrograma("ffmpeg", "FFMPEG") } = {}) {
  mkdirSync(pasta, { recursive: true });
  const url = String(link).trim().split("?")[0] || String(link).trim();
  const args = [
    "--no-playlist", "--no-warnings", "--no-progress", "--restrict-filenames", "--no-part",
    "-f", "b[ext=mp4][vcodec!=none][acodec!=none]/bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b",
    "--merge-output-format", "mp4", "--write-info-json",
    ...(existsSync(ffmpeg) ? ["--ffmpeg-location", ffmpeg] : []), // só caminho de verdade; nome solto = PATH
    "-o", join(pasta, "referencia.%(ext)s"), url,
  ];
  const tentar = () => spawnSync(ytdlp, args, { encoding: "utf8", maxBuffer: 1 << 26, timeout: 180_000 });
  let r = tentar();
  if (r.error) throw new Error(`não achei o baixador de vídeos (yt-dlp): ${r.error.message}. ${MOTIVO_SALVAR}`);
  if (r.status !== 0) {
    // o Instagram muda e o yt-dlp acompanha: atualiza uma vez e tenta de novo
    // (no venv da Edição Automática pelo pip; o .exe/binário avulso da Vídeos Opus se atualiza sozinho com -U)
    const py = join(dirname(ytdlp), WIN ? "python.exe" : "python");
    if (existsSync(py)) spawnSync(py, ["-m", "pip", "install", "--quiet", "--upgrade", "yt-dlp"], { encoding: "utf8", timeout: 180_000 });
    else spawnSync(ytdlp, ["-U"], { encoding: "utf8", timeout: 120_000 });
    r = tentar();
  }
  const video = readdirSync(pasta).filter((f) => /^referencia\.(mp4|mkv|webm|mov)$/i.test(f)).map((f) => join(pasta, f))[0];
  if (r.status !== 0 || !video) {
    const fim = (r.stderr || "").trim().split("\n").slice(-3).join(" ");
    const e = new Error(MOTIVO_SALVAR);
    e.detalhe = fim;
    throw e;
  }
  let info = {};
  const arqInfo = join(pasta, "referencia.info.json");
  if (existsSync(arqInfo)) {
    try { info = JSON.parse(readFileSync(arqInfo, "utf8")); } catch {}
    rmSync(arqInfo, { force: true }); // tem dados de rastreio do site; só guardamos o que importa
  }
  const origem = {
    link: info.webpage_url || url,
    autor: info.uploader || info.channel || info.uploader_id || null,
    legenda: (info.description || "").slice(0, 2200) || null,
    data: info.upload_date || null,
  };
  writeFileSync(join(pasta, "origem.json"), JSON.stringify(origem, null, 1));
  return { video, ...origem };
}

// ---------------------------------------------------------------- analisar
function probe(ffprobe, arquivo) {
  const j = JSON.parse(rodar(ffprobe, ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", arquivo]).stdout);
  const v = (j.streams || []).find((s) => s.codec_type === "video");
  const a = (j.streams || []).find((s) => s.codec_type === "audio");
  let w = v?.width || 0, h = v?.height || 0;
  const rot = Number(v?.tags?.rotate || (v?.side_data_list || []).find((s) => s.rotation != null)?.rotation || 0);
  if (Math.abs(rot) % 180 === 90) [w, h] = [h, w];
  const [fn, fd] = String(v?.r_frame_rate || "30/1").split("/").map(Number);
  return { duracao: Number(j.format?.duration || 0), largura: w, altura: h, fps: fd ? fn / fd : 30, temVideo: !!v, temAudio: !!a };
}

const r2 = (n) => +(+n).toFixed(2);
const carimbo = "drawtext=text='%{pts\\:hms}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.55";

/** Quadros nos instantes dados, cada um com o tempo carimbado, montados numa folha colunas x linhas. */
function folha(ffmpeg, video, instantes, saida, { colunas = 4, largura = 300, rotulos } = {}) {
  const tmp = join(dirname(saida), `.q-${basename(saida, ".jpg")}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  instantes.forEach((t, i) => {
    const txt = rotulos ? `drawtext=text='${rotulos[i]}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.55` : carimbo.replace("%{pts\\:hms}", `${t.toFixed(2)}s`);
    rodar(ffmpeg, ["-v", "error", "-y", "-ss", String(Math.max(0, t)), "-i", video, "-frames:v", "1", "-vf", `scale=${largura}:-2,${txt}`, join(tmp, `q${String(i).padStart(3, "0")}.jpg`)], { aceitaErro: true });
  });
  const n = readdirSync(tmp).length;
  if (!n) { rmSync(tmp, { recursive: true, force: true }); return null; }
  const linhas = Math.ceil(n / colunas);
  rodar(ffmpeg, ["-v", "error", "-y", "-framerate", "1", "-i", join(tmp, "q%03d.jpg"), "-vf", `tile=${colunas}x${linhas}:padding=6:color=black`, "-frames:v", "1", saida]);
  rmSync(tmp, { recursive: true, force: true });
  return saida;
}

/** Destrincha a edição do vídeo: cortes, gancho, movimento dentro de cada cena, texto, áudio. */
export function analisar(video, pasta, { ffmpeg = acharPrograma("ffmpeg", "FFMPEG"), ffprobe = acharPrograma("ffprobe", "FFPROBE") } = {}) {
  mkdirSync(pasta, { recursive: true });
  const info = probe(ffprobe, video);
  if (!info.temVideo) throw new Error("o arquivo não tem imagem de vídeo");
  const D = info.duracao;

  // 1. cortes de cena (troca de plano) com a força de cada um
  const sc = rodar(ffmpeg, ["-hide_banner", "-i", video, "-vf", "select='gt(scene,0.28)',metadata=print", "-an", "-f", "null", "-"], { aceitaErro: true });
  const cortes = [];
  for (const m of (sc.stderr || "").matchAll(/pts_time:([\d.]+)[\s\S]*?lavfi\.scene_score=([\d.]+)/g)) {
    const t = r2(m[1]);
    if (t > 0.15 && t < D - 0.15 && (!cortes.length || t - cortes[cortes.length - 1].t > 0.12)) cortes.push({ t, forca: r2(m[2]) });
  }
  const limites = [0, ...cortes.map((c) => c.t), D];
  const cenas = limites.slice(1).map((fim, i) => ({ inicio: r2(limites[i]), fim: r2(fim), duracao: r2(fim - limites[i]) }));
  const dur = cenas.map((c) => c.duracao);

  // 2. folhas de imagem
  const geral = folha(ffmpeg, video, Array.from({ length: 12 }, (_, i) => (D * (i + 0.5)) / 12), join(pasta, "folha-geral.jpg"));
  const gancho = folha(ffmpeg, video, Array.from({ length: 12 }, (_, i) => i * 0.25 + 0.05).filter((t) => t < D), join(pasta, "folha-gancho.jpg"));
  // começo e fim de cada cena lado a lado: mostra zoom, movimento de câmera, texto que entra e transição
  const escolhidas = cenas.length <= 10 ? cenas : Array.from({ length: 10 }, (_, i) => cenas[Math.round((i * (cenas.length - 1)) / 9)]);
  const inst = [], rot = [];
  for (const c of escolhidas) {
    const n = cenas.indexOf(c) + 1;
    inst.push(c.inicio + Math.min(0.08, c.duracao / 4), c.fim - Math.min(0.08, c.duracao / 4));
    rot.push(`cena ${n} começo ${c.inicio.toFixed(1)}s`, `cena ${n} fim ${c.fim.toFixed(1)}s`);
  }
  const folhaCenas = folha(ffmpeg, video, inst, join(pasta, "folha-cenas.jpg"), { colunas: 4, largura: 260, rotulos: rot });
  // quadros grandes do gancho, para ler o texto na tela
  const inicio = [0.3, 1.2, 2.5].filter((t) => t < D).map((t, i) => {
    const arq = join(pasta, `inicio-${i + 1}.jpg`);
    rodar(ffmpeg, ["-v", "error", "-y", "-ss", String(t), "-i", video, "-frames:v", "1", "-vf", "scale=720:-2", arq]);
    return arq;
  });

  // 3. movimento por segundo (diferença média entre quadros): cena parada x câmera viva x zoom/efeito constante
  const mov = rodar(ffmpeg, ["-hide_banner", "-i", video, "-vf", "fps=10,scale=160:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-an", "-f", "null", "-"], { aceitaErro: true });
  const porSeg = [];
  let quadro = 0;
  for (const m of (mov.stderr || "").matchAll(/lavfi\.signalstats\.YAVG=([\d.]+)/g)) {
    const s = Math.floor(quadro++ / 10);
    (porSeg[s] ||= []).push(+m[1]);
  }
  const movimentoPorSegundo = porSeg.map((v) => r2(v.reduce((a, b) => a + b, 0) / v.length));
  const mediaMov = movimentoPorSegundo.length ? movimentoPorSegundo.reduce((a, b) => a + b, 0) / movimentoPorSegundo.length : 0;

  // 4. áudio: volume, trechos de silêncio e a fala separada para transcrever
  let audio = { tem: info.temAudio };
  if (info.temAudio) {
    const lufs = rodar(ffmpeg, ["-hide_banner", "-i", video, "-vn", "-af", "ebur128", "-f", "null", "-"], { aceitaErro: true });
    const I = (lufs.stderr || "").match(/I:\s+(-?[\d.]+) LUFS/g);
    const sil = rodar(ffmpeg, ["-hide_banner", "-i", video, "-vn", "-af", "silencedetect=n=-40dB:d=0.4", "-f", "null", "-"], { aceitaErro: true });
    const silencio = [...(sil.stderr || "").matchAll(/silence_duration: ([\d.]+)/g)].reduce((a, m) => a + +m[1], 0);
    rodar(ffmpeg, ["-v", "error", "-y", "-i", video, "-vn", "-ac", "1", "-ar", "16000", join(pasta, "fala.wav")]);
    audio = {
      tem: true, volumeLUFS: I ? +I[I.length - 1].match(/-?[\d.]+/)[0] : null,
      silencioPct: Math.round((100 * silencio) / D), fala: join(pasta, "fala.wav"),
    };
  }

  const ficha = {
    duracao: r2(D), formato: `${info.largura}x${info.altura}`, fps: Math.round(info.fps),
    ritmo: {
      cortes: cortes.length, cenas: cenas.length,
      segundosPorCena: r2(D / cenas.length), cenaMaisCurta: r2(Math.min(...dur)), cenaMaisLonga: r2(Math.max(...dur)),
      cortesNos3Primeiros: cortes.filter((c) => c.t < 3).length,
      temposDosCortes: cortes.map((c) => c.t).slice(0, 60),
    },
    cenas: cenas.slice(0, 60),
    movimento: {
      media: r2(mediaMov),
      leitura: mediaMov < 1.5 ? "quase parado (câmera fixa, pouca ação)" : mediaMov < 4 ? "movimento moderado (câmera na mão, gestos, zoom lento)" : "muito movimento (câmera andando, zoom/efeitos constantes)",
      porSegundo: movimentoPorSegundo,
    },
    audio,
    imagens: { geral, gancho, cenas: folhaCenas, inicio },
  };
  writeFileSync(join(pasta, "ficha.json"), JSON.stringify(ficha, null, 1));
  return { pasta, ficha: join(pasta, "ficha.json"), ...ficha };
}

/** Link ou arquivo → pasta com o vídeo (se baixado), origem.json, ficha.json e as folhas. */
export function referencia(entrada, pasta, programas = {}) {
  let video = entrada, origem = null;
  if (ehLink(entrada)) {
    const b = baixar(entrada, pasta, programas);
    video = b.video;
    origem = { link: b.link, autor: b.autor, legenda: b.legenda, data: b.data };
  } else if (!existsSync(entrada)) throw new Error("diga o link do vídeo ou o caminho do arquivo");
  return { ok: true, video: resolve(video), baixado: !!origem, origem, ...analisar(video, pasta, programas) };
}

// ---------------------------------------------------------------- linha de comando
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--pasta");
  const pasta = i >= 0 ? resolve(args.splice(i, 2)[1]) : null;
  const entrada = args[0];
  try {
    if (!entrada) throw new Error("uso: node referencia.mjs <link ou caminho do vídeo> [--pasta <saída>]");
    const nome = ehLink(entrada) ? "referencia-" + (entrada.match(/(?:reel|p|tv|video|shorts)\/([\w-]+)/)?.[1] || Date.now()) : "referencia-" + basename(entrada, extname(entrada));
    const destino = pasta || join(tmpdir(), "referencias", nome.replace(/[^\w.-]+/g, "-"));
    console.log(JSON.stringify(referencia(entrada, destino), null, 1));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, motivo: e.message, detalhe: e.detalhe }, null, 1));
    process.exit(1);
  }
}
