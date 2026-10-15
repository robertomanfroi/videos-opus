// Edição viral: abertura com título explodindo, zoom e tremor nas frases-chave, legenda que acompanha a fala,
// botão de chamada, efeitos sonoros e batida. Tudo num encode só: vídeo + legenda (libass) + camada HTML (Edge) + som.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { FFMPEG, FONTES, SKILL, probe, ENCODER_FINAL } from "./ferramentas.mjs";
import { montarLegenda, CORES } from "./legenda.mjs";
import { abrir } from "./navegador.mjs";
import { mixar, salvarWav, TAXA } from "./som.mjs";
import { corrige } from "./correcoes.mjs";

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
const hex = (c, padrao) => "#" + (CORES[String(c || "").toLowerCase()] || String(c || padrao).replace(/^#/, "")).toUpperCase();

// Acha a frase na transcrição (sem ligar para acento, maiúscula e pontuação). Devolve {ini, fim} ou null.
function acharFrase(palavras, frase, depoisDe = -1) {
  const alvo = frase.split(/\s+/).map(norm).filter(Boolean);
  if (!alvo.length) return null;
  for (let i = 0; i + alvo.length <= palavras.length; i++) {
    if (palavras[i].ini <= depoisDe) continue;
    if (alvo.every((w, j) => norm(palavras[i + j].t) === w)) return { ini: palavras[i].ini, fim: palavras[i + alvo.length - 1].fim };
  }
  return null;
}

// Expressão do FFmpeg para o zoom: degraus com transição de 0,12 s + impulsos que decaem.
function exprZoom(degraus, impulsos) {
  // monta de trás para frente: if(t<a1, z0, if(t<a2, seg1, ... segN))
  let expr = "";
  for (let k = degraus.length - 1; k >= 0; k--) {
    const [a, z] = degraus[k];
    const seg = k === 0 ? String(z) : `${degraus[k - 1][1]}+(${(z - degraus[k - 1][1]).toFixed(3)})*min(1,(t-${a.toFixed(3)})/0.12)`;
    expr = k === degraus.length - 1 ? seg : `if(lt(t,${degraus[k + 1][0].toFixed(3)}),${seg},${expr})`;
  }
  const imp = impulsos.map(([t0, amp, d]) => `${amp}*if(between(t,${t0.toFixed(3)},${(t0 + d).toFixed(3)}),pow(1-(t-${t0.toFixed(3)})/${d},2),0)`).join("+");
  return imp ? `(${expr})+${imp}` : expr;
}
function exprTremor(tremores, eixo) {
  if (!tremores.length) return "0";
  const amp = tremores.map(([t0, a, d]) => `${a}*if(between(t,${t0.toFixed(3)},${(t0 + d).toFixed(3)}),pow(1-(t-${t0.toFixed(3)})/${d},2),0)`).join("+");
  return `(${amp})*${eixo === "x" ? "sin(t*91)" : "cos(t*77)"}`;
}

export async function viral(pasta, op) {
  const { arquivo: transcrito, palavras: brutas } = JSON.parse(readFileSync(join(pasta, "palavras.json"), "utf8"));
  // as correções da aluna valem também para achar as frases-chave
  const fix = existsSync(join(pasta, "correcoes.json")) ? JSON.parse(readFileSync(join(pasta, "correcoes.json"), "utf8")) : null;
  const palavras = brutas.map((w) => ({ ...w, t: corrige({ text: w.t, start: w.ini }, fix) })).filter((w) => w.t);
  const arquivo = join(pasta, op.arquivo || transcrito);
  const info = probe(arquivo);
  const W = info.largura, H = info.altura, dur = info.duracao, fps = 30;
  const avisos = [];
  const cor = hex(op.cor, "F74502"), corCta = hex(op["cor-cta"], "19C23A");
  const primeira = palavras[0]?.ini ?? 0;

  // ---- abertura
  let abertura = null;
  if (op.titulo) {
    const linhas = String(op.titulo).split("|").map((s) => s.trim()).filter(Boolean);
    const fim = op.abertura ? Number(op.abertura) : primeira >= 1.5 ? Math.min(primeira, 6) - 0.05 : 2.2;
    abertura = { fim, linhas, tag: op.tag || "" };
    if (primeira < 1.5 && !op.abertura) avisos.push("o vídeo começa falando: a abertura ficou por cima dos primeiros 2,2 s de fala (para usar um trecho mudo do começo, rode cortar com --manter-inicio)");
  }
  const fimA = abertura ? abertura.fim : 0;
  const nLinhas = abertura ? abertura.linhas.length : 0;
  const slams = abertura ? abertura.linhas.map((_, i) => 0.16 + i * Math.min(0.34, (fimA * 0.35) / nLinhas)) : [];

  // ---- frases-chave e chamada
  const chaves = [];
  let depois = fimA - 0.05;
  for (const frase of String(op.chaves || "").split(";").map((s) => s.trim()).filter(Boolean)) {
    const r = acharFrase(palavras, frase, depois);
    if (!r) { avisos.push(`não achei "${frase}" na fala`); continue; }
    chaves.push({ ini: r.ini, fim: Math.max(r.fim + 0.35, r.ini + 1.2), texto: frase.toLocaleUpperCase("pt-BR") });
  }
  let cta = null;
  if (op.cta) {
    const r = acharFrase(palavras, op.cta, fimA - 0.05);
    if (r) cta = { ini: r.ini, fim: Math.max(r.fim + 0.6, r.ini + 1.3), texto: String(op["cta-texto"] || op.cta).toLocaleUpperCase("pt-BR") };
    else avisos.push(`não achei a chamada "${op.cta}" na fala`);
  }
  // uma frase-chave não invade a seguinte
  const blocos = [...chaves, ...(cta ? [cta] : [])].sort((a, b) => a.ini - b.ini);
  blocos.forEach((b, i) => { if (blocos[i + 1]) b.fim = Math.min(b.fim, blocos[i + 1].ini); });

  // ---- legenda comum (fora da abertura, das frases-chave e da chamada)
  const excluir = [...(abertura ? [[0, fimA]] : []), ...blocos.map((b) => [b.ini, b.fim])];
  const legOp = { estilo: op.estilo || "destaque", fonte: op.fonte || "bebas", destaque: op.destaque || cor, cor: op["cor-legenda"], posicao: op.posicao, tamanho: op.tamanho, "max-palavras": op["max-palavras"] };
  const { fonte } = montarLegenda(pasta, brutas, W, H, legOp, excluir);

  // ---- camada HTML
  const cfg = { W, H, cor, corCta, abertura, selo: op.selo || null, chaves, cta };
  const fontes = `<style>@font-face{font-family:"Display";src:url("${pathToFileURL(join(FONTES, fonte.arq)).href}")}` +
    `@font-face{font-family:"Serif";src:url("${pathToFileURL(join(FONTES, "EBGaramond-Italic.ttf")).href}");font-style:italic;font-weight:400 800}</style>`;
  const modelo = readFileSync(join(SKILL, "scripts", "viral.html"), "utf8");
  const html = join(pasta, "viral.html");
  writeFileSync(html, modelo.replace("<!--CFG-->", `${fontes}<script>window.CFG=${JSON.stringify(cfg)};</script>`));

  // ---- zoom e tremor
  const rosto = op.rosto === "meio" ? 0.45 : op.rosto === "baixo" ? 0.6 : 0.29;
  const degraus = [[0, 1.0]];
  if (abertura) degraus.push([fimA, 1.0]);
  // alterna perto/longe a cada frase da fala, como cortes de câmera
  let perto = true, ultimo = -9;
  palavras.forEach((p, i) => {
    const anterior = palavras[i - 1];
    if (p.ini < fimA || (anterior && !/[.?!,]$/.test(anterior.t) && p.ini - anterior.fim < 0.35)) return;
    if (p.ini - ultimo < 1.6 || blocos.some((b) => p.ini >= b.ini - 0.05 && p.ini < b.fim)) return;
    degraus.push([p.ini, perto ? 1.12 : 1.0]); perto = !perto; ultimo = p.ini;
  });
  for (const k of chaves) { degraus.push([k.ini, 1.24]); degraus.push([k.fim, perto ? 1.12 : 1.0]); }
  if (cta) { degraus.push([cta.ini, 1.0]); degraus.push([cta.fim, 1.1]); }
  degraus.sort((a, b) => a[0] - b[0]);
  const limpos = [];
  for (const d of degraus) { if (limpos.length && d[0] - limpos.at(-1)[0] < 0.05) limpos[limpos.length - 1] = [limpos.at(-1)[0], d[1]]; else limpos.push(d); }
  const impulsos = [...slams.map((t, i) => [t, i === slams.length - 1 ? 0.1 : 0.06, 0.4]), ...(abertura ? [[fimA - 0.2, 0.15, 0.4]] : [])];
  const tremores = [...slams.map((t, i) => [t, i === slams.length - 1 ? 40 : 24, 0.4]), ...(abertura ? [[fimA - 0.2, 46, 0.45]] : []),
    ...chaves.map((k) => [k.ini, 22, 0.3]), ...(cta ? [[cta.ini, 18, 0.3]] : [])];
  const Z = exprZoom(limpos, impulsos);
  const fz = (W / 1080).toFixed(3);
  const vf = `scale=w='trunc(${W}*(${Z})/2)*2':h='trunc(${H}*(${Z})/2)*2':eval=frame:flags=bicubic,` +
    `crop=${W}:${H}:x='clip((iw-${W})*0.5+${fz}*${exprTremor(tremores, "x")},0,iw-${W})':y='clip((ih-${H})*${rosto}+${fz}*${exprTremor(tremores, "y")},0,ih-${H})',` +
    `ass=legenda.ass:fontsdir=fontes`;
  writeFileSync(join(pasta, "viral-filtro.txt"), `[0:v]${vf}[b];[1:v]format=rgba[o];[b][o]overlay=0:0:format=auto,format=yuv420p[v]`);

  // ---- som
  let voz = new Float32Array(0);
  if (info.temAudio) {
    const r = spawnSync(FFMPEG, ["-v", "error", "-i", arquivo, "-vn", "-ac", "1", "-ar", String(TAXA), "-f", "s16le", "-"], { maxBuffer: 1 << 30 });
    const b = r.stdout;
    voz = new Float32Array(b.length >> 1);
    for (let i = 0; i < voz.length; i++) voz[i] = b.readInt16LE(i * 2) / 32768;
  }
  const pops = [];
  palavras.forEach((p, i) => { const a = palavras[i - 1]; if (p.ini >= fimA && (!a || /[.?!,]$/.test(a.t) || p.ini - a.fim > 0.35) && !blocos.some((b) => Math.abs(b.ini - p.ini) < 0.3)) pops.push(p.ini); });
  const pcm = mixar(voz, dur, { slams, saidaAbertura: abertura ? fimA - 0.2 : null, chaves: chaves.map((k) => k.ini), cta: cta?.ini ?? null, pops },
    { batida: op.batida !== "nao", efeitos: op.efeitos !== "nao", inicioFala: abertura ? fimA : 0, silenciarAte: abertura && primeira >= fimA - 0.1 ? fimA : 0 });
  salvarWav(join(pasta, "viral-som.wav"), pcm);

  // ---- encode único: camada HTML entra pelo pipe, quadro a quadro
  const final = join(pasta, "viral.mp4");
  const ff = spawn(FFMPEG, ["-hide_banner", "-y", "-loglevel", "error", "-i", arquivo, "-f", "image2pipe", "-c:v", "png", "-framerate", String(fps), "-i", "-",
    "-i", join(pasta, "viral-som.wav"), "-/filter_complex", join(pasta, "viral-filtro.txt"), "-map", "[v]", "-map", "2:a",
    ...ENCODER_FINAL, "-c:a", "aac", "-b:a", "192k", "-shortest", final], { cwd: pasta, stdio: ["pipe", "ignore", "pipe"] });
  let erro = "";
  ff.stderr.on("data", (d) => (erro += d));
  const fimFF = new Promise((r) => ff.on("close", r));
  const pagina = await abrir(html, W, H);
  const total = Math.ceil(dur * fps);
  for (let i = 0; i < total; i++) {
    const png = await pagina.quadro(i / fps, true);
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await pagina.fechar();
  if ((await fimFF) !== 0) throw new Error(`ffmpeg falhou na montagem viral: ${erro.trim().split("\n").slice(-3).join(" | ")}`);
  return { final, abertura: abertura ? +fimA.toFixed(2) : null, chaves: chaves.map((k) => `${k.texto} @ ${k.ini}s`), cta: cta ? `${cta.texto} @ ${cta.ini}s` : null, avisos };
}
