#!/usr/bin/env node
// Edição de vídeo gravado: achar, preparar, cortar pausas, transcrever, legendar, formato, entregar.
// Uso: node video.mjs <comando> [argumentos]   (cada comando imprime um JSON no fim)
//   achar [nome ou caminho] [--ultimo]
//   preparar <video> [--formato reels|feed|quadrado|horizontal] [--inicio s] [--fim s] [--encaixar]
//   cortar <pasta> [--limiar -35] [--pausa 0.3] [--respiro 0.08] [--remover "3.2-5.1,9-10.4"]
//   transcrever <pasta> [--arquivo cortado.mp4]
//   legendar <pasta> [--estilo classica|destaque|uma-palavra|caixa] [--fonte bebas|anton|montserrat|poppins]
//            [--cor branco] [--destaque amarelo] [--posicao baixo|meio|cima] [--tamanho 120]
//            [--maiusculas sim|nao] [--max-palavras 3] [--arquivo cortado.mp4] [--nome saida] [--sem-entregar]
//   formato <video ou pasta> --formato quadrado [--leve] [--encaixar] [--nome saida]
//   entregar <arquivo> [--nome saida]
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, copyFileSync } from "node:fs";
import { join, basename, extname, resolve } from "node:path";
import { homedir, cpus } from "node:os";
import {
  ffmpeg, probe, filtroHDR, encoderRapido, ENCODER_FINAL, FORMATOS, pastaTrabalho, entregar, lerArgs,
  areaDeTrabalho, WHISPER, MODELO, FONTES, SKILL, rodar, tempo,
} from "./ferramentas.mjs";
import { montarLegenda } from "./legenda.mjs";

const [cmd, ...resto] = process.argv.slice(2);
const { pos, op } = lerArgs(resto);
const saida = (obj) => { console.log(JSON.stringify(obj, null, 1)); };
const lerJSON = (p) => JSON.parse(readFileSync(p, "utf8"));
const trabalho = (pasta) => (existsSync(join(pasta, "trabalho.json")) ? lerJSON(join(pasta, "trabalho.json")) : {});
const salvarTrabalho = (pasta, extra) => writeFileSync(join(pasta, "trabalho.json"), JSON.stringify({ ...trabalho(pasta), ...extra }, null, 1));

// ---------------------------------------------------------------- achar
const EXT = new Set([".mp4", ".mov", ".m4v", ".mkv", ".webm", ".3gp", ".avi"]);
function pastasDeVideo() {
  const h = homedir();
  const p = [join(h, "Downloads"), areaDeTrabalho(), join(h, "Videos"), join(h, "Vídeos"), join(h, "Pictures"), join(h, "OneDrive", "Imagens"), join(h, "OneDrive", "Pictures")];
  return [...new Set(p)].filter(existsSync);
}
function listar(pasta, fundo = 2) {
  let out = [];
  let itens = [];
  try { itens = readdirSync(pasta, { withFileTypes: true }); } catch { return out; }
  for (const it of itens) {
    const full = join(pasta, it.name);
    if (it.isDirectory() && fundo > 0 && !it.name.startsWith(".") && it.name !== "Vídeos editados") out = out.concat(listar(full, fundo - 1));
    else if (it.isFile() && EXT.has(extname(it.name).toLowerCase())) {
      try { const st = statSync(full); if (st.size > 100_000) out.push({ video: full, nome: it.name, mb: +(st.size / 1e6).toFixed(1), quando: new Date(Math.max(st.mtimeMs, st.birthtimeMs || 0)).toISOString() }); } catch {}
    }
  }
  return out;
}
function cmdAchar() {
  const alvo = pos[0];
  if (alvo && existsSync(alvo)) return saida({ ok: true, video: resolve(alvo), info: probe(alvo) });
  let todos = pastasDeVideo().flatMap((p) => listar(p)).sort((a, b) => b.quando.localeCompare(a.quando));
  if (alvo) {
    const n = alvo.toLowerCase();
    todos = todos.filter((c) => c.nome.toLowerCase().includes(n));
  }
  const candidatos = todos.slice(0, 8);
  if (!candidatos.length) return saida({ ok: false, motivo: alvo ? `nenhum vídeo com "${alvo}" no nome em Downloads, Área de Trabalho, Vídeos ou Imagens` : "nenhum vídeo encontrado", pastas: pastasDeVideo() });
  if (candidatos.length === 1 || op.ultimo) {
    const c = candidatos[0];
    return saida({ ok: true, video: c.video, confirmar: !alvo, info: probe(c.video), candidatos });
  }
  saida({ ok: false, motivo: "vários vídeos; pergunte qual", candidatos });
}

// ---------------------------------------------------------------- preparar
function filtroFormato(info, W, H, encaixar) {
  const ar = info.largura / info.altura, alvo = W / H;
  const diferenca = Math.abs(ar - alvo) / alvo;
  if (!encaixar || diferenca < 0.15) // preenche cortando as bordas
    return `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},setsar=1`;
  // vídeo inteiro no meio, com o próprio vídeo desfocado no fundo
  return `split[a][b];[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=40:4,eq=brightness=-0.08[fundo];` +
    `[b]scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos[frente];[fundo][frente]overlay=(W-w)/2:(H-h)/2,setsar=1`;
}
function cmdPreparar() {
  const video = pos[0];
  if (!video || !existsSync(video)) throw new Error("diga o caminho do vídeo (use o comando achar)");
  const info = probe(video);
  if (!info.temVideo) throw new Error("o arquivo não tem imagem de vídeo");
  const formato = op.formato || (info.largura > info.altura ? "horizontal" : "reels");
  const [W, H] = FORMATOS[formato] || FORMATOS.reels;
  const pasta = pastaTrabalho(video);
  const corte = [];
  if (op.inicio) corte.push("-ss", String(op.inicio));
  if (op.fim) corte.push("-to", String(op.fim));
  const vf = filtroHDR(info) + filtroFormato(info, W, H, !!op.encaixar) + ",fps=30";
  const audio = info.temAudio ? ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"] : ["-an"];
  ffmpeg(["-hwaccel", "auto", ...corte, "-i", video, "-filter_complex", `[0:v]${vf}[v]`, "-map", "[v]", ...(info.temAudio ? ["-map", "0:a:0"] : []), ...encoderRapido(), ...audio, join(pasta, "base.mp4")]);
  const base = probe(join(pasta, "base.mp4"));
  salvarTrabalho(pasta, { original: resolve(video), formato, largura: W, altura: H, hdrConvertido: info.hdr });
  saida({ ok: true, pasta, base: join(pasta, "base.mp4"), duracao: +base.duracao.toFixed(2), formato: `${W}x${H}`, hdrConvertido: info.hdr, temAudio: info.temAudio });
}

// ---------------------------------------------------------------- cortar
function silencios(arquivo, limiar, minimo) {
  const r = ffmpeg(["-loglevel", "info", "-i", arquivo, "-vn", "-af", `silencedetect=noise=${limiar}dB:d=${minimo}`, "-f", "null", "-"]);
  const txt = r.stderr || "";
  const ini = [...txt.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Math.max(0, +m[1]));
  const fim = [...txt.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  return ini.map((a, i) => [a, fim[i] ?? Infinity]);
}
// Onde a fala começa: primeiro trecho com som por pelo menos 0,6 s (ruídos curtos do começo não contam).
function inicioDaFala(arquivo) {
  const sil = silencios(arquivo, -35, 0.3);
  let cur = 0;
  for (const [a, b] of sil) {
    if (a - cur >= 0.6) return cur;
    cur = b === Infinity ? cur : b;
  }
  return cur;
}
function intervalos(txt) {
  return String(txt || "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => s.split("-").map(Number)).filter(([a, b]) => b > a);
}
function cmdCortar() {
  const pasta = pos[0];
  const base = join(pasta, "base.mp4");
  if (!existsSync(base)) throw new Error("rode preparar antes");
  const info = probe(base);
  const dur = info.duracao;
  const limiar = Number(op.limiar ?? -35), minimo = Number(op.pausa ?? 0.3), respiro = Number(op.respiro ?? 0.08);
  // trechos a jogar fora = silêncios (encolhidos pelo respiro) + o que a aluna pediu para tirar
  let fora = info.temAudio ? silencios(base, limiar, minimo).map(([a, b]) => [a === 0 ? 0 : a + respiro, b === Infinity ? dur : b - respiro]) : [];
  // --manter-inicio: o trecho mudo do começo fica (serve de palco para a abertura do modo viral)
  if (op["manter-inicio"]) { const fala = inicioDaFala(base); fora = fora.filter(([, b]) => b > fala + 0.2); }
  fora = fora.concat(intervalos(op.remover)).filter(([a, b]) => b - a > 0.05).sort((x, y) => x[0] - y[0]);
  const manter = [];
  let cur = 0;
  for (const [a, b] of fora) {
    if (a > cur) manter.push([cur, Math.min(a, dur)]);
    cur = Math.max(cur, b);
  }
  if (cur < dur) manter.push([cur, dur]);
  const trechos = manter.filter(([a, b]) => b - a >= 0.12).map(([a, b]) => [+a.toFixed(3), +b.toFixed(3)]);
  if (!trechos.length) throw new Error("não sobrou nada: o limiar de silêncio pode estar alto demais (tente --limiar -45)");
  const total = trechos.reduce((s, [a, b]) => s + b - a, 0);
  let f = "";
  trechos.forEach(([a, b], i) => {
    const d = b - a;
    f += `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[v${i}];`;
    if (info.temAudio) f += `[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=${Math.max(0, d - 0.015).toFixed(3)}:d=0.015[a${i}];`;
  });
  const n = trechos.length;
  f += trechos.map((_, i) => `[v${i}]` + (info.temAudio ? `[a${i}]` : "")).join("") + `concat=n=${n}:v=1:a=${info.temAudio ? 1 : 0}[v]` + (info.temAudio ? "[a]" : "");
  writeFileSync(join(pasta, "cortes.txt"), f);
  ffmpeg(["-i", base, "-/filter_complex", join(pasta, "cortes.txt"), "-map", "[v]", ...(info.temAudio ? ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"] : []), ...encoderRapido(), join(pasta, "cortado.mp4")]);
  writeFileSync(join(pasta, "cortes.json"), JSON.stringify({ limiar, pausa: minimo, trechos }, null, 1));
  saida({ ok: true, arquivo: join(pasta, "cortado.mp4"), antes: +dur.toFixed(2), depois: +total.toFixed(2), removido: +(dur - total).toFixed(2), trechos: n,
    aviso: total < dur * 0.4 ? "cortou mais da metade: confira se não comeu fala (tente --limiar -45)" : total > dur * 0.97 && dur > 8 ? "quase nada foi cortado: se havia pausas, tente --limiar -30" : undefined });
}

// ---------------------------------------------------------------- transcrever
function cmdTranscrever() {
  const pasta = pos[0];
  const arquivo = join(pasta, op.arquivo || (existsSync(join(pasta, "cortado.mp4")) ? "cortado.mp4" : "base.mp4"));
  if (!existsSync(MODELO)) throw new Error(`modelo de transcrição não encontrado em ${MODELO}`);
  const wav = join(pasta, "fala.wav");
  const fala = inicioDaFala(arquivo);
  const pulo = fala > 0.6 ? +(fala - 0.15).toFixed(2) : 0;
  ffmpeg([...(pulo ? ["-ss", String(pulo)] : []), "-i", arquivo, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
  const threads = String(Math.max(2, Math.min(8, cpus().length)));
  rodar(WHISPER, ["-m", MODELO, "-f", wav, "-l", op.idioma || "pt", "-ml", "1", "-sow", "-oj", "-of", join(pasta, "whisper"), "-t", threads, "-np"]);
  const j = JSON.parse(readFileSync(join(pasta, "whisper.json"), "utf8"));
  const palavras = [];
  for (const s of j.transcription || []) {
    const raw = s.text || "";
    const t = raw.trim();
    if (!t || /^\[.*\]$/.test(t)) continue;
    const ini = s.offsets.from / 1000 + pulo, fim = s.offsets.to / 1000 + pulo;
    if (palavras.length && !/^\s/.test(raw) && !/^[-—]/.test(t)) { // pedaço colado na palavra anterior
      const p = palavras[palavras.length - 1]; p.t += t; p.fim = fim; continue;
    }
    palavras.push({ t, ini: +ini.toFixed(2), fim: +fim.toFixed(2) });
  }
  writeFileSync(join(pasta, "palavras.json"), JSON.stringify({ arquivo: basename(arquivo), palavras }, null, 1));
  // texto em frases, com tempo, para a revisão
  const linhas = [];
  let frase = [];
  palavras.forEach((p, i) => {
    frase.push(p);
    const prox = palavras[i + 1];
    if (!prox || /[.?!]$/.test(p.t) || prox.ini - p.fim > 0.6 || frase.length >= 12) {
      linhas.push(`[${tempo(frase[0].ini)}] ${frase.map((x) => x.t).join(" ")}`);
      frase = [];
    }
  });
  writeFileSync(join(pasta, "texto.txt"), linhas.join("\n"));
  saida({ ok: true, arquivo: basename(arquivo), palavras: palavras.length, texto: linhas.join("\n") });
}

// ---------------------------------------------------------------- legendar
function cmdLegendar() {
  const pasta = pos[0];
  if (!existsSync(join(pasta, "palavras.json"))) throw new Error("rode transcrever antes");
  const { arquivo: transcrito, palavras: brutas } = lerJSON(join(pasta, "palavras.json"));
  const arquivo = join(pasta, op.arquivo || transcrito);
  const info = probe(arquivo);
  const { grupos, fonte, estilo } = montarLegenda(pasta, brutas, info.largura, info.altura, op);
  const final = join(pasta, "final.mp4");
  ffmpeg(["-i", arquivo, "-vf", "ass=legenda.ass:fontsdir=fontes", ...ENCODER_FINAL, ...(info.temAudio ? ["-c:a", "aac", "-b:a", "192k"] : []), final], { cwd: pasta });
  const orig = trabalho(pasta).original || arquivo;
  const nome = op.nome || `${basename(orig, extname(orig))}-legendado`;
  const entregue = op["sem-entregar"] ? null : entregar(final, nome);
  saida({ ok: true, final, entregue, legendas: grupos.length, estilo, fonte: fonte.nome, duracao: +info.duracao.toFixed(2) });
}

// ---------------------------------------------------------------- formato
function cmdFormato() {
  let entrada = pos[0], orig = pos[0];
  if (entrada && existsSync(join(entrada, "trabalho.json"))) orig = trabalho(entrada).original || entrada, entrada = ["final.mp4", "cortado.mp4", "base.mp4"].map((f) => join(pos[0], f)).find(existsSync);
  if (!entrada || !existsSync(entrada)) throw new Error("diga o vídeo ou a pasta de trabalho");
  const info = probe(entrada);
  const formato = op.formato || "reels";
  let [W, H] = FORMATOS[formato] || FORMATOS.reels;
  const leve = !!op.leve;
  if (leve) { W = Math.round(W * 2 / 3 / 2) * 2; H = Math.round(H * 2 / 3 / 2) * 2; }
  const vf = filtroHDR(info) + filtroFormato(info, W, H, !!op.encaixar);
  const saidaArq = join(pastaTrabalho(entrada), "formato.mp4");
  const enc = leve
    ? ["-c:v", "libx264", "-preset", "medium", "-b:v", `${Math.max(400, Math.min(2500, Math.floor((14 * 8192) / Math.max(1, info.duracao)) - 128))}k`, "-maxrate", "3M", "-bufsize", "6M", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
    : ENCODER_FINAL;
  ffmpeg(["-i", entrada, "-filter_complex", `[0:v]${vf}[v]`, "-map", "[v]", ...(info.temAudio ? ["-map", "0:a:0", "-c:a", "aac", "-b:a", leve ? "96k" : "192k"] : []), ...enc, saidaArq]);
  const nome = op.nome || `${basename(orig, extname(orig))}-${formato}${leve ? "-leve" : ""}`;
  const entregue = entregar(saidaArq, nome);
  saida({ ok: true, entregue, formato: `${W}x${H}`, mb: +(statSync(saidaArq).size / 1e6).toFixed(1) });
}

function cmdEntregar() {
  if (!pos[0] || !existsSync(pos[0])) throw new Error("diga o arquivo");
  saida({ ok: true, entregue: entregar(pos[0], op.nome || basename(pos[0])) });
}

// ---------------------------------------------------------------- animar (HTML → MP4)
async function cmdAnimar() {
  const html = pos[0];
  if (!html || !existsSync(html)) throw new Error("diga o arquivo .html da animação");
  const { gravar } = await import("./navegador.mjs");
  const [W, H] = op.formato ? FORMATOS[op.formato] : [Number(op.largura || 1080), Number(op.altura || 1920)];
  const pasta = pastaTrabalho(html);
  const arq = join(pasta, "animacao.mp4");
  const ini = Date.now();
  await gravar(resolve(html), arq, { largura: W, altura: H, segundos: Number(op.segundos || 15), fps: Number(op.fps || 30), audio: op.audio || null });
  const entregue = op["sem-entregar"] ? null : entregar(arq, op.nome || basename(html, extname(html)));
  saida({ ok: true, arquivo: arq, entregue, segundosGravando: Math.round((Date.now() - ini) / 1000) });
}

async function cmdFotos() {
  const html = pos[0];
  if (!html || !existsSync(html)) throw new Error("diga o arquivo .html da animação");
  const { fotos } = await import("./navegador.mjs");
  const [W, H] = op.formato ? FORMATOS[op.formato] : [Number(op.largura || 1080), Number(op.altura || 1920)];
  const instantes = String(op.em || "0.5,2,5,8").split(",").map(Number);
  const prefixo = join(pastaTrabalho(html), "foto");
  saida({ ok: true, fotos: await fotos(resolve(html), instantes, prefixo, { largura: W, altura: H }) });
}

// ---------------------------------------------------------------- viral
async function cmdViral() {
  const pasta = pos[0];
  if (!pasta || !existsSync(join(pasta, "palavras.json"))) throw new Error("rode preparar, cortar e transcrever antes");
  const { viral } = await import("./viral.mjs");
  const ini = Date.now();
  const r = await viral(pasta, op);
  const orig = trabalho(pasta).original || r.final;
  const entregue = op["sem-entregar"] ? null : entregar(r.final, op.nome || `${basename(orig, extname(orig))}-viral`);
  saida({ ok: true, ...r, entregue, segundosGravando: Math.round((Date.now() - ini) / 1000) });
}

// ---------------------------------------------------------------- acervo de prompts de referência
function cmdAcervo() {
  const arq = join(SKILL, "acervo", "data", "videos.json");
  if (!existsSync(arq)) throw new Error("acervo não encontrado na skill");
  const videos = lerJSON(arq);
  const link = (u) => (u || "").split("?")[0];
  if (op.ver) {
    const v = videos.find((x) => x.slug === op.ver);
    if (!v) throw new Error(`não achei ${op.ver}`);
    return saida({ ok: true, slug: v.slug, autor: v.author, categoria: v.category, tecnologias: v.tech_tags, incompleto: !!v.prompt_partial, video: v.has_remake ? link(v.skillry_url) : null, post: v.post_url, prompt: v.prompt || "(sem prompt publicado)" });
  }
  const termos = pos.map((t) => t.toLowerCase());
  const res = [];
  for (const v of videos) {
    if (op.categoria && v.category !== op.categoria) continue;
    if (op.tech && !(v.tech_tags || []).includes(op.tech)) continue;
    if (op.completos && (v.prompt_partial || !v.prompt)) continue;
    if (op["com-refacao"] && !v.has_remake) continue;
    const texto = [v.prompt || "", v.category, ...(v.tech_tags || [])].join(" ").toLowerCase();
    const pontos = termos.reduce((n, t) => n + texto.split(t).length - 1, 0);
    if (termos.length && !pontos) continue;
    res.push([pontos, v]);
  }
  res.sort((a, b) => b[0] - a[0] || (b[1].has_remake ? 1 : 0) - (a[1].has_remake ? 1 : 0));
  const limite = Number(op.limite || 8);
  saida({ ok: true, total: res.length, dica: res.length ? undefined : "nenhum resultado: os prompts estão em inglês, tente termos como explainer, launch, logo, product, kinetic, typography", itens: res.slice(0, limite).map(([, v]) => ({ slug: v.slug, categoria: v.category, tecnologias: v.tech_tags, video: v.has_remake ? link(v.skillry_url) : null, incompleto: !!v.prompt_partial, trecho: (v.prompt || "").replace(/\s+/g, " ").slice(0, 180) })) });
}

// ---------------------------------------------------------------- diagnostico
let navegadorOk = null;
function cmdDiagnostico() {
  if (navegadorOk === null) return cmdDiagnosticoCompleto();
  const r = { ok: !navegadorOk.startsWith("FALHOU"), itens: { navegador: navegadorOk } };
  const testa = (nome, fn) => { try { r.itens[nome] = fn() || "ok"; } catch (e) { r.ok = false; r.itens[nome] = `FALHOU: ${e.message.split("\n")[0]}`; } };
  testa("ffmpeg", () => { ffmpeg(["-f", "lavfi", "-i", "sine=d=0.3", "-f", "lavfi", "-i", "color=s=64x64:d=0.3", "-shortest", "-f", "null", "-"]); });
  testa("ffprobe", () => { probe(join(FONTES, "..", "scripts", "teste.wav")); });
  testa("whisper", () => { if (!existsSync(MODELO)) throw new Error("modelo ausente"); rodar(WHISPER, ["-m", MODELO, "-f", join(FONTES, "..", "scripts", "teste.wav"), "-l", "pt", "-np", "-nt"]); });
  testa("fontes", () => `${readdirSync(FONTES).filter((f) => /\.ttf$/i.test(f)).length} fontes`);
  testa("encoder", () => encoderRapido()[1]);
  testa("pasta de saída", () => join(areaDeTrabalho(), "Vídeos editados"));
  saida(r);
}
async function cmdDiagnosticoCompleto() {
  const html = join(SKILL, "scripts", "teste-navegador.html");
  try {
    const { abrir } = await import("./navegador.mjs");
    const p = await abrir(html, 320, 320);
    await p.quadro(0.5);
    await p.fechar();
    navegadorOk = "ok";
  } catch (e) { navegadorOk = `FALHOU: ${e.message.split("\n")[0]}`; }
  cmdDiagnostico();
}

const COMANDOS = { diagnostico: cmdDiagnostico, acervo: cmdAcervo, animar: cmdAnimar, viral: cmdViral, fotos: cmdFotos, achar: cmdAchar, preparar: cmdPreparar, cortar: cmdCortar, transcrever: cmdTranscrever, legendar: cmdLegendar, formato: cmdFormato, entregar: cmdEntregar };
try {
  if (!COMANDOS[cmd]) throw new Error(`comando desconhecido: ${cmd || "(nenhum)"}. Use: ${Object.keys(COMANDOS).join(", ")}`);
  await COMANDOS[cmd]();
} catch (e) {
  saida({ ok: false, erro: e.message });
  process.exit(1);
}
