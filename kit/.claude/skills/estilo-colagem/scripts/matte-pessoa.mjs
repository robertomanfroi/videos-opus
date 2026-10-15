// Recorta a pessoa do vídeo cortado para que títulos possam ficar ATRÁS dela (efeito "atrás de mim").
// Rodar dentro de <projeto>/assets:  node ../../../.claude/skills/estilo-colagem/scripts/matte-pessoa.mjs clean.mp4 fg.webm [reducao=0.25]
// Saída: fg.webm (VP9 com transparência — pessoa opaca, resto transparente, mesmos quadros do clean.mp4)
//        + fg-matte.mp4 (máscara em cinza, para conferir as bordas e medir a cabeça com topo-cabeca.mjs).
// É a etapa MAIS PESADA do estilo: roda quadro a quadro. Rode uma vez por versão FINAL do corte.
import { spawn, spawnSync } from "node:child_process";
import { binarios } from "../../_motor/binarios.mjs";
import { sessao, paraTensor, estadoInicial, rodar } from "./_rvm.mjs";

const [src, out, red] = process.argv.slice(2);
if (!src || !out) { console.error("uso: matte-pessoa.mjs clean.mp4 fg.webm [reducao=0.25]"); process.exit(1); }
const DOWN = Number(red || 0.25);
const { ffmpeg, ffprobe } = binarios();
const info = JSON.parse(spawnSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,nb_frames", "-of", "json", src], { encoding: "utf8" }).stdout).streams[0];
const W = info.width, H = info.height, fps = info.r_frame_rate, total = Number(info.nb_frames || 0);

const { s, Tensor, provedor } = await sessao();
console.log(`Recortando a pessoa quadro a quadro (${provedor})…`);
const dec = spawn(ffmpeg, ["-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
const enc = spawn(ffmpeg, ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", fps, "-i", "-",
  "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30", "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1",
  "-threads", "8", "-metadata:s:v:0", "alpha_mode=1", out], { stdio: ["pipe", "ignore", "inherit"] });
const mat = spawn(ffmpeg, ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", `${W}x${H}`, "-r", fps, "-i", "-",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", out.replace(/\.[^.]+$/, "") + "-matte.mp4"], { stdio: ["pipe", "ignore", "inherit"] });
const fimEnc = new Promise((r) => enc.on("close", r)), fimMat = new Promise((r) => mat.on("close", r));
const escreve = (p, b) => (p.stdin.write(b) ? null : new Promise((r) => p.stdin.once("drain", r)));

const QUADRO = W * H * 3;
let rec = estadoInicial(Tensor), n = 0;
const t0 = Date.now();
// junta os pedaços do pipe só quando um quadro inteiro chegou (concatenar a cada pedaço copia megabytes à toa)
let pedacos = [], tam = 0;
for await (const chunk of dec.stdout) {
  pedacos.push(chunk); tam += chunk.length;
  if (tam < QUADRO) continue;
  let pend = Buffer.concat(pedacos, tam);
  while (pend.length >= QUADRO) {
    const rgb = pend.subarray(0, QUADRO);
    const r = await rodar(s, Tensor, paraTensor(Tensor, rgb, W, H), rec, DOWN);
    rec = r.rec;
    const a = Buffer.alloc(W * H), rgba = Buffer.alloc(W * H * 4);
    for (let i = 0, j = 0, k = 0; i < W * H; i++, j += 3, k += 4) {
      const v = Math.round(Math.min(1, Math.max(0, r.pha[i])) * 255);
      a[i] = v; rgba[k] = rgb[j]; rgba[k + 1] = rgb[j + 1]; rgba[k + 2] = rgb[j + 2]; rgba[k + 3] = v;
    }
    await escreve(enc, rgba); await escreve(mat, a);
    pend = pend.subarray(QUADRO);
    n++;
    if (n % 300 === 0) {
      const vel = n / ((Date.now() - t0) / 1000);
      console.log(`  ${n}${total ? "/" + total : ""} quadros  ${vel.toFixed(1)} q/s${total ? `, faltam ~${Math.round((total - n) / vel / 60)} min` : ""}`);
    }
  }
  pedacos = pend.length ? [Buffer.from(pend)] : []; tam = pend.length;
}
enc.stdin.end(); mat.stdin.end();
const [ce, cm] = await Promise.all([fimEnc, fimMat]);
if (ce || cm || (total && n < total * 0.98)) { console.error(`FALHOU: o recorte parou em ${n}${total ? "/" + total : ""} quadros (ffmpeg ${ce}/${cm}). Rode de novo.`); process.exit(1); }
console.log(`PRONTO ${n} quadros em ${Math.round((Date.now() - t0) / 1000)}s -> ${out}`);
