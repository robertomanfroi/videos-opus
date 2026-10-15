// ÚNICA porta para o render final. Confere tudo antes, roda em segundo plano (não morre no limite de tempo do
// terminal), valida o vídeo e entrega em prontos/. Rodar na raiz da pasta EdicaoAutomatica:
//   node .claude/skills/_motor/renderizar.mjs <slug>            → confere, começa o render e acompanha (até ~9 min)
//   node .claude/skills/_motor/renderizar.mjs <slug> --esperar  → volta a acompanhar um render em andamento
//   node .claude/skills/_motor/renderizar.mjs <slug> --conferir → só as travas, sem renderizar
// Código de saída: 0 = entregue · 1 = travado/falhou (motivo na tela) · 3 = ainda renderizando (rode --esperar de novo).
//
// Travas (o render NÃO começa se alguma falhar):
//   1. transcrição mais nova que o clean.mp4 (legenda é desta versão do corte)
//   2. index.html montado depois do template, da transcrição, do reel.json e das correções
//   3. lint do HyperFrames sem erro
//   4. snapshots tirados DEPOIS da última montagem (alguém olhou os quadros)
//   5. estilo explicativo: assets/checkpoint.aprovado mais novo que assets/mapa.json (a aluna aprovou o mapa)
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { existsSync, statSync, readdirSync, readFileSync, writeFileSync, openSync, renameSync, rmSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lerProjeto, marcarEtapa } from "./projeto.mjs";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
if (!slug) { console.error("uso: renderizar.mjs <slug> [--esperar | --conferir]"); process.exit(1); }
const RAIZ = process.cwd();
const proj = resolve("video-projects", slug);
if (!existsSync(proj)) { console.error(`não achei o projeto video-projects/${slug} (rode na pasta EdicaoAutomatica)`); process.exit(1); }
const A = (f) => join(proj, "assets", f);
const P = (f) => join(proj, f);
const mt = (f) => (existsSync(f) ? statSync(f).mtimeMs : 0);
const progresso = P("renders/progresso.json");
const lerProg = () => { try { return JSON.parse(readFileSync(progresso, "utf8")); } catch { return null; } };
const gravaProg = (o) => { mkdirSync(P("renders"), { recursive: true }); writeFileSync(progresso, JSON.stringify({ ...o, em: new Date().toISOString() })); };
// HyperFrames pelo Node portátil (sem npx): node <kit>/node_modules/hyperframes/dist/cli.js
const HF = [join(RAIZ, "node_modules", "hyperframes", "dist", "cli.js")];
const duracao = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).trim());

// ---------- trabalho em segundo plano (chamado por este mesmo script) ----------
if (args.includes("--trabalho")) {
  const tmp = P(`renders/${slug}-final.parcial.mp4`), final = P(`renders/${slug}-final.mp4`);
  gravaProg({ fase: "renderizando", pct: 0, pid: process.pid });
  const r = spawn(process.execPath, [...HF, "render", "--output", join("renders", `${slug}-final.parcial.mp4`)], { cwd: proj });
  let ult = -1, cauda = "";
  const ler = (b) => {
    const s = b.toString(); cauda = (cauda + s).slice(-4000);
    const m = [...s.matchAll(/(\d{1,3})%/g)].pop();
    if (m && +m[1] !== ult) { ult = +m[1]; gravaProg({ fase: "renderizando", pct: ult, pid: process.pid }); }
  };
  r.stdout.on("data", ler); r.stderr.on("data", ler);
  r.on("close", (code) => {
    try {
      if (code !== 0 || !existsSync(tmp)) throw new Error("o render parou: " + (cauda.match(/Failed:.*|✗.*|Error.*/)?.[0] || `código ${code}`));
      gravaProg({ fase: "conferindo", pct: 100 });
      const d = duracao(tmp), dc = duracao(A("clean.mp4"));
      if (Math.abs(d - dc) > 0.4) throw new Error(`vídeo com ${d.toFixed(2)} s, mas o corte tem ${dc.toFixed(2)} s`);
      const bd = spawnSync("ffmpeg", ["-v", "info", "-i", tmp, "-vf", "blackdetect=d=0.1:pix_th=0.05", "-an", "-f", "null", "-"], { encoding: "utf8" });
      const pretos = (bd.stderr.match(/black_start/g) || []).length;
      if (pretos) throw new Error(`${pretos} trecho(s) de tela preta no vídeo`);
      renameSync(tmp, final);
      marcarEtapa(proj, "renderizado", { render: { arquivo: final, duracao: +d.toFixed(2), em: new Date().toISOString() } });
      const ent = execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "prontos.mjs"), slug, final], { cwd: RAIZ, encoding: "utf8" }).trim();
      writeFileSync(P("VERIFY.md"), (existsSync(P("VERIFY.md")) ? readFileSync(P("VERIFY.md"), "utf8") + "\n" : `# VERIFY — ${slug}\n`) +
        `- ${new Date().toLocaleString("pt-BR")}: render ${d.toFixed(2)} s (corte ${dc.toFixed(2)} s), 0 trechos pretos, travas ok → ${ent}\n`);
      gravaProg({ fase: "entregue", pct: 100, entregue: ent, duracao: +d.toFixed(2) });
    } catch (e) {
      rmSync(tmp, { force: true });
      gravaProg({ fase: "falhou", motivo: e.message });
    }
  });
  // evita duas cópias rodando
  process.on("SIGTERM", () => { r.kill(); gravaProg({ fase: "falhou", motivo: "render interrompido" }); process.exit(1); });
} else {
  // ---------- acompanhar ----------
  const vivo = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
  const esperar = () => {
    const fim = Date.now() + 9 * 60_000;
    let ultMsg = "";
    const passo = () => {
      const p = lerProg();
      if (p?.fase === "entregue") { console.log(`PRONTO: ${p.entregue} (${p.duracao} s)`); process.exit(0); }
      if (p?.fase === "falhou") { console.error(`FALHOU: ${p.motivo}`); process.exit(1); }
      if (p?.pid && !vivo(p.pid) && p.fase === "renderizando") { console.error("FALHOU: o render foi interrompido (o processo sumiu). Rode de novo."); process.exit(1); }
      const msg = p ? `${p.fase} ${p.pct ?? 0}%` : "começando";
      if (msg !== ultMsg) { console.log(`  ${new Date().toLocaleTimeString("pt-BR")} ${msg}`); ultMsg = msg; }
      if (Date.now() > fim) { console.log(`AINDA RENDERIZANDO (${msg}). Rode: node .claude/skills/_motor/renderizar.mjs ${slug} --esperar`); process.exit(3); }
      setTimeout(passo, 5000);
    };
    passo();
  };
  if (args.includes("--esperar")) esperar();
  else {
    // ---------- travas ----------
    const erros = [];
    const p = lerProjeto(proj);
    if (!existsSync(A("clean.mp4"))) erros.push("falta assets/clean.mp4 (faça o corte)");
    if (!existsSync(A("transcript.json"))) erros.push("falta assets/transcript.json (transcreva o clean.mp4)");
    else if (mt(A("transcript.json")) < mt(A("clean.mp4"))) erros.push("a transcrição é de um corte anterior: re-transcreva o clean.mp4");
    const idx = mt(P("index.html"));
    if (!idx) erros.push("falta index.html (rode o montar do estilo)");
    for (const f of ["src/index.template.html", "assets/transcript.json", "reel.json", "assets/caption-fixes.json", "assets/enfase.json", "assets/emphasis.json", "assets/sfx.json"])
      if (mt(P(f)) > idx + 1000) erros.push(`${f} mudou depois da montagem: rode o montar de novo`);
    const snaps = existsSync(P("snapshots")) ? readdirSync(P("snapshots")).filter((f) => f.endsWith(".png")).map((f) => mt(P(`snapshots/${f}`))) : [];
    if (!snaps.some((t) => t >= idx)) erros.push("nenhum snapshot depois da última montagem: tire os snapshots e OLHE antes de renderizar");
    if (p?.estilo === "estilo-explicativo" && !(mt(A("checkpoint.aprovado")) > mt(A("mapa.json")) && existsSync(A("mapa.json"))))
      erros.push("o mapa de edição ainda não foi aprovado pela aluna (assets/checkpoint.aprovado) — CHECKPOINT do explicativo");
    const lint = spawnSync(process.execPath, [...HF, "lint"], { cwd: proj, encoding: "utf8" });
    const nErros = Number(((lint.stdout || "") + (lint.stderr || "")).match(/(\d+) error/)?.[1] ?? (lint.status ? 1 : 0));
    if (nErros) erros.push(`o lint do HyperFrames achou ${nErros} erro(s): rode o lint do hyperframes no projeto`);
    if (erros.length) { console.error("NÃO RENDERIZEI:\n- " + erros.join("\n- ")); process.exit(1); }
    if (args.includes("--conferir")) { console.log("travas ok"); process.exit(0); }
    const atual = lerProg();
    if (atual?.fase === "renderizando" && atual.pid && vivo(atual.pid)) { console.log("já existe um render em andamento — acompanhando"); esperar(); }
    else {
      marcarEtapa(proj, "montado");
      mkdirSync(P("renders"), { recursive: true });
      const log = openSync(P("renders/render.log"), "w");
      const filho = spawn(process.execPath, [fileURLToPath(import.meta.url), slug, "--trabalho"], { cwd: RAIZ, detached: true, stdio: ["ignore", log, log], windowsHide: true });
      gravaProg({ fase: "renderizando", pct: 0, pid: filho.pid });
      filho.unref();
      console.log(`Renderizando "${slug}" em segundo plano — no seu computador pode levar vários minutos.`);
      esperar();
    }
  }
}
