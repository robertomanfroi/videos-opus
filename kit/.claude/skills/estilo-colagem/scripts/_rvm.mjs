// Modelo de recorte de pessoa (Robust Video Matting, licença GPL-3.0 do modelo; usado só como ferramenta local).
// Vem dentro da skill videos-opus (modelos/rvm_mobilenetv3_fp32.onnx). Placa de vídeo pelo DirectML quando existir, senão CPU.
import { existsSync } from "node:fs";
import { cpus } from "node:os";
import { createRequire } from "node:module";
import { join } from "node:path";
import { binarios } from "../../_motor/binarios.mjs";


function ort() {
  for (const base of [process.cwd(), join(process.cwd(), ".."), join(process.cwd(), "..", ".."), join(process.cwd(), "..", "..", "..")]) {
    try { return createRequire(join(base, "package.json"))("onnxruntime-node"); } catch {}
  }
  throw new Error("não achei o onnxruntime-node do kit (rode pela pasta do kit)");
}

export async function sessao() {
  const { rvm } = binarios();
  if (!rvm || !existsSync(rvm)) throw new Error(`modelo de recorte não encontrado (${rvm}). Reinstale a skill videos-opus.`);
  const o = ort();
  const threads = Math.max(1, cpus().length - 1);
  for (const prov of [["dml"], ["cpu"]]) {
    try {
      const s = await o.InferenceSession.create(rvm, { executionProviders: prov, intraOpNumThreads: threads });
      return { s, Tensor: o.Tensor, provedor: prov[0] === "dml" ? "placa de vídeo (DirectML)" : "processador" };
    } catch (e) { if (prov[0] === "cpu") throw e; }
  }
}

// rgb (Uint8Array W*H*3) → tensor [1,3,H,W] float32
export function paraTensor(Tensor, rgb, W, H) {
  const n = W * H, f = new Float32Array(3 * n);
  for (let i = 0, j = 0; i < n; i++, j += 3) { f[i] = rgb[j] / 255; f[n + i] = rgb[j + 1] / 255; f[2 * n + i] = rgb[j + 2] / 255; }
  return new Tensor("float32", f, [1, 3, H, W]);
}

export function estadoInicial(Tensor) {
  const z = () => new Tensor("float32", new Float32Array(1), [1, 1, 1, 1]);
  return [z(), z(), z(), z()];
}

export async function rodar(sess, Tensor, src, rec, ds) {
  const r = await sess.run({ src, r1i: rec[0], r2i: rec[1], r3i: rec[2], r4i: rec[3], downsample_ratio: new Tensor("float32", new Float32Array([ds]), [1]) });
  return { pha: r.pha.data, rec: [r.r1o, r.r2o, r.r3o, r.r4o] };
}
