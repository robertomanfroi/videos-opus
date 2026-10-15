// Onde estão os programas portáteis. O lançador da skill videos-opus (video.mjs kit) define VIDEOS_OPUS_SKILL;
// sem ele (desenvolvimento), usa o que estiver no PATH.
import { existsSync } from "node:fs";
import { join } from "node:path";

export function binarios() {
  const s = process.env.VIDEOS_OPUS_SKILL;
  const win = process.platform === "win32";
  const p = (sub, nome) => { if (!s) return nome; const c = join(s, sub, win ? `${nome}.exe` : nome); return existsSync(c) ? c : nome; };
  return {
    ffmpeg: p("bin", "ffmpeg"),
    ffprobe: p("bin", "ffprobe"),
    whisper: p(join("bin", "whisper"), "whisper-cli"),
    modelo: process.env.VIDEOS_OPUS_MODELO || (s ? join(s, "modelos", "ggml-small-q5_1.bin") : ""),
    vad: s ? join(s, "modelos", "ggml-silero-v5.1.2.bin") : "",
    rvm: process.env.EDICAO_MODELOS ? join(process.env.EDICAO_MODELOS, "rvm_mobilenetv3_fp32.onnx") : (s ? join(s, "modelos", "rvm_mobilenetv3_fp32.onnx") : ""),
  };
}
