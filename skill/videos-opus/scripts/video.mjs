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
  areaDeTrabalho, WHISPER, MODELO, FONTES, rodar, tempo,
} from "./ferramentas.mjs";
import { corrige } from "./correcoes.mjs";

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
  ffmpeg(["-i", arquivo, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
  const threads = String(Math.max(2, Math.min(8, cpus().length)));
  rodar(WHISPER, ["-m", MODELO, "-f", wav, "-l", op.idioma || "pt", "-ml", "1", "-sow", "-oj", "-of", join(pasta, "whisper"), "-t", threads, "-np"]);
  const j = JSON.parse(readFileSync(join(pasta, "whisper.json"), "utf8"));
  const palavras = [];
  for (const s of j.transcription || []) {
    const raw = s.text || "";
    const t = raw.trim();
    if (!t || /^\[.*\]$/.test(t)) continue;
    const ini = s.offsets.from / 1000, fim = s.offsets.to / 1000;
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
const CORES = { branco: "FFFFFF", preto: "000000", amarelo: "FFD400", laranja: "F74502", terracota: "C14B22", verde: "19C23A", rosa: "FF3EA5", azul: "2D9CFF", vermelho: "FF2D2D", areia: "F5EFE4", chocolate: "3B1F0E", roxo: "8B5CF6" };
const FONTES_MAP = {
  bebas: { arq: "BebasNeue-Regular.ttf", nome: "Bebas Neue", tam: 150, chars: 15 },
  anton: { arq: "Anton-Regular.ttf", nome: "Anton", tam: 124, chars: 15 },
  montserrat: { arq: "Montserrat-Black.ttf", nome: "Montserrat Black", tam: 98, chars: 14 },
  poppins: { arq: "Poppins-ExtraBold.ttf", nome: "Poppins ExtraBold", tam: 100, chars: 14 },
};
function corASS(c, alfa = "00") {
  const hex = (CORES[String(c).toLowerCase()] || String(c).replace(/^#/, "")).padStart(6, "0").slice(-6).toUpperCase();
  return `&H${alfa}${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}`;
}
const tASS = (t) => { const cs = Math.max(0, Math.round(t * 100)); const h = Math.floor(cs / 360000), m = Math.floor(cs / 6000) % 60, s = Math.floor(cs / 100) % 60, c = cs % 100; return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`; };
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/[{}]/g, "");

function agrupar(palavras, maxPalavras, maxChars) {
  const grupos = [];
  let g = [];
  palavras.forEach((p, i) => {
    g.push(p);
    const prox = palavras[i + 1];
    const chars = g.map((x) => x.t).join(" ").length;
    const proxChars = prox ? chars + 1 + prox.t.length : 0;
    if (!prox || g.length >= maxPalavras || proxChars > maxChars * 2 || /[.?!]$/.test(p.t) || (/,$/.test(p.t) && g.length >= 2) || prox.ini - p.fim > 0.45) {
      grupos.push(g); g = [];
    }
  });
  // não termina legenda em palavrinha solta ("de", "a", "um"): ela passa para a legenda seguinte
  const LIGA = /^(a|o|as|os|e|é|de|da|do|das|dos|em|no|na|nos|nas|um|uma|que|com|por|pra|para|se|ao|à|me|te|eu|tu|sua|seu|meu|minha|mais|mas|nem|ou)$/i;
  for (let i = 0; i < grupos.length - 1; i++) {
    const g = grupos[i], ult = g[g.length - 1];
    if (g.length > 1 && LIGA.test(ult.t.replace(/[^\p{L}]/gu, "")) && !/[.,?!:;]$/.test(ult.t) && grupos[i + 1][0].ini - ult.fim < 0.45) {
      grupos[i + 1].unshift(g.pop());
    }
  }
  return grupos.map((g, i) => ({ palavras: g, ini: g[0].ini, fim: Math.min(grupos[i + 1]?.[0]?.ini ?? Infinity, g[g.length - 1].fim + 0.5) }))
    .map((g, i, arr) => ({ ...g, fim: i + 1 < arr.length ? Math.min(g.fim, arr[i + 1].ini) : g.fim }));
}

function cmdLegendar() {
  const pasta = pos[0];
  if (!existsSync(join(pasta, "palavras.json"))) throw new Error("rode transcrever antes");
  const { arquivo: transcrito, palavras: brutas } = lerJSON(join(pasta, "palavras.json"));
  const arquivo = join(pasta, op.arquivo || transcrito);
  const info = probe(arquivo);
  const W = info.largura, H = info.altura, fator = Math.min(W, H) / 1080;
  const fix = existsSync(join(pasta, "correcoes.json")) ? lerJSON(join(pasta, "correcoes.json")) : null;
  const maius = String(op.maiusculas ?? "sim") !== "nao";
  const palavras = brutas.map((w) => ({ ...w, t: corrige({ text: w.t, start: w.ini }, fix) }))
    .filter((w) => w.t).map((w) => ({ ...w, t: maius ? w.t.toLocaleUpperCase("pt-BR") : w.t }));
  const limpa = (t) => (op.pontuacao === "sim" ? t : t.replace(/[.,;:]+$/u, "").replace(/\.{3}$/u, ""));
  const estilo = op.estilo || "classica";
  const fonte = FONTES_MAP[String(op.fonte || "bebas").toLowerCase()] || FONTES_MAP.bebas;
  const umaPalavra = estilo === "uma-palavra";
  const tam = Math.round(Number(op.tamanho || fonte.tam * (umaPalavra ? 1.35 : 1)) * fator);
  const cor = corASS(op.cor || (estilo === "caixa" ? "preto" : "branco"));
  const corDestaque = corASS(op.destaque || "amarelo");
  const posicao = op.posicao || "baixo";
  const alin = posicao === "meio" ? 5 : posicao === "cima" ? 8 : 2;
  const margemV = Math.round(posicao === "cima" ? H * 0.16 : posicao === "meio" ? 0 : H * (H > W ? 0.27 : 0.12));
  const caixa = estilo === "caixa";
  const borda = caixa ? 3 : 1;
  const contorno = caixa ? Math.round(14 * fator) : Math.round((fonte.nome === "Bebas Neue" ? 7 : 6) * fator);
  const sombra = caixa ? 0 : Math.round(3 * fator);
  const fundoCaixa = corASS(op.fundo || "branco");
  const ass = [
    "[Script Info]", "ScriptType: v4.00+", `PlayResX: ${W}`, `PlayResY: ${H}`, "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: L,${fonte.nome},${tam},${cor},${cor},${caixa ? fundoCaixa : "&H00000000"},${caixa ? fundoCaixa : "&H64000000"},0,0,0,0,100,100,${Math.round(fator)},0,${borda},${contorno},${sombra},${alin},${Math.round(70 * fator)},${Math.round(70 * fator)},${margemV},1`,
    "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const pop = "{\\fscx82\\fscy82\\t(0,90,\\fscx106\\fscy106)\\t(90,160,\\fscx100\\fscy100)}";
  const grupos = agrupar(palavras, umaPalavra ? 1 : Number(op["max-palavras"] || 3), fonte.chars);
  for (const g of grupos) {
    if (estilo === "destaque") {
      g.palavras.forEach((p, k) => {
        const ini = k === 0 ? g.ini : p.ini, fim = k + 1 < g.palavras.length ? g.palavras[k + 1].ini : g.fim;
        if (fim <= ini) return;
        const txt = g.palavras.map((x, j) => (j === k ? `{\\c${corDestaque}}${esc(limpa(x.t))}{\\c${cor}}` : esc(limpa(x.t)))).join(" ");
        ass.push(`Dialogue: 0,${tASS(ini)},${tASS(fim)},L,,0,0,0,,${k === 0 ? pop : ""}${txt}`);
      });
    } else {
      ass.push(`Dialogue: 0,${tASS(g.ini)},${tASS(g.fim)},L,,0,0,0,,${pop}${esc(g.palavras.map((x) => limpa(x.t)).join(" "))}`);
    }
  }
  writeFileSync(join(pasta, "legenda.ass"), ass.join("\n"), "utf8");
  mkdirSync(join(pasta, "fontes"), { recursive: true });
  copyFileSync(join(FONTES, fonte.arq), join(pasta, "fontes", fonte.arq));
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

// ---------------------------------------------------------------- diagnostico
function cmdDiagnostico() {
  const r = { ok: true, itens: {} };
  const testa = (nome, fn) => { try { r.itens[nome] = fn() || "ok"; } catch (e) { r.ok = false; r.itens[nome] = `FALHOU: ${e.message.split("\n")[0]}`; } };
  testa("ffmpeg", () => { ffmpeg(["-f", "lavfi", "-i", "sine=d=0.3", "-f", "lavfi", "-i", "color=s=64x64:d=0.3", "-shortest", "-f", "null", "-"]); });
  testa("ffprobe", () => { probe(join(FONTES, "..", "scripts", "teste.wav")); });
  testa("whisper", () => { if (!existsSync(MODELO)) throw new Error("modelo ausente"); rodar(WHISPER, ["-m", MODELO, "-f", join(FONTES, "..", "scripts", "teste.wav"), "-l", "pt", "-np", "-nt"]); });
  testa("fontes", () => `${readdirSync(FONTES).filter((f) => /\.ttf$/i.test(f)).length} fontes`);
  testa("encoder", () => encoderRapido()[1]);
  testa("pasta de saída", () => join(areaDeTrabalho(), "Vídeos editados"));
  saida(r);
}

const COMANDOS = { diagnostico: cmdDiagnostico, achar: cmdAchar, preparar: cmdPreparar, cortar: cmdCortar, transcrever: cmdTranscrever, legendar: cmdLegendar, formato: cmdFormato, entregar: cmdEntregar };
try {
  if (!COMANDOS[cmd]) throw new Error(`comando desconhecido: ${cmd || "(nenhum)"}. Use: ${Object.keys(COMANDOS).join(", ")}`);
  COMANDOS[cmd]();
} catch (e) {
  saida({ ok: false, erro: e.message });
  process.exit(1);
}
