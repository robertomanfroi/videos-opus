// Recorta pessoas de FOTOS (adesivo com fundo transparente), com o mesmo modelo do matte-pessoa.mjs.
// Uso: node .claude/skills/estilo-colagem/scripts/recortar.mjs entrada.jpg saida-recorte.png
import { spawnSync } from "node:child_process";
import { binarios } from "../../_motor/binarios.mjs";
import { sessao, paraTensor, estadoInicial, rodar } from "./_rvm.mjs";

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error("uso: recortar.mjs entrada.jpg saida.png"); process.exit(1); }
const { ffmpeg, ffprobe } = binarios();
const i = JSON.parse(spawnSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", src], { encoding: "utf8" }).stdout).streams[0];
let W = i.width, H = i.height;
const rgb = spawnSync(ffmpeg, ["-v", "error", "-i", src, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 30 }).stdout;
const { s, Tensor } = await sessao();
let rec = estadoInicial(Tensor), pha;
const x = paraTensor(Tensor, rgb, W, H), ds = Math.min(1, 512 / Math.max(W, H));
for (let k = 0; k < 4; k++) { const r = await rodar(s, Tensor, x, rec, ds); rec = r.rec; pha = r.pha; } // estado recorrente assenta numa imagem parada
const a = new Uint8Array(W * H);
let y0 = H, y1 = 0, x0 = W, x1 = 0;
for (let p = 0; p < W * H; p++) {
  const v = Math.round(Math.min(1, Math.max(0, pha[p])) * 255); a[p] = v;
  if (v > 20) { const yy = Math.floor(p / W), xx = p % W; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; }
}
// corta a sobra transparente em volta (o adesivo fica do tamanho da pessoa)
if (y1 >= y0) { y0 = Math.max(0, y0 - 8); y1 = Math.min(H, y1 + 8); x0 = Math.max(0, x0 - 8); x1 = Math.min(W, x1 + 8); } else { y0 = 0; y1 = H; x0 = 0; x1 = W; }
const w = x1 - x0, h = y1 - y0, rgba = Buffer.alloc(w * h * 4);
for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
  const o = (yy + y0) * W + (xx + x0), d = (yy * w + xx) * 4;
  rgba[d] = rgb[o * 3]; rgba[d + 1] = rgb[o * 3 + 1]; rgba[d + 2] = rgb[o * 3 + 2]; rgba[d + 3] = a[o];
}
const r = spawnSync(ffmpeg, ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${w}x${h}`, "-i", "-", out], { input: rgba });
if (r.status !== 0) { console.error("FALHOU ao gravar o recorte"); process.exit(1); }
console.log("ok", out, `${w}x${h}`);
