// Escolhe o encoder H.264 mais rápido que esta máquina realmente tem, para arquivos intermediários
// (raw.mp4, clean.mp4). Tenta a placa de vídeo primeiro (NVIDIA, Intel, AMD, Apple) e cai para
// libx264 ultrafast. Cada candidato é testado com um encode minúsculo, porque o ffmpeg lista
// encoders que o hardware pode não ter. Forçar CPU: EDICAO_ENCODER=cpu.
import { spawnSync } from "node:child_process";

// -pix_fmt yuv420p em TODO encode: vídeo de 10 bits (iPhone com HDR) viraria H.264 High 10, que o Chrome não toca.
const CPU = ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", "-pix_fmt", "yuv420p"];
const CANDIDATOS = [
  ["h264_nvenc", ["-preset", "p4", "-rc", "vbr", "-cq", "20", "-b:v", "0"]],
  ["h264_qsv", ["-global_quality", "22"]],
  ["h264_amf", ["-quality", "balanced", "-rc", "cqp", "-qp_i", "20", "-qp_p", "22"]],
  ["h264_videotoolbox", ["-b:v", "14M"]],
];
let cache;

export function videoEncoder() {
  if (cache) return cache;
  if (process.env.EDICAO_ENCODER === "cpu") return (cache = CPU);
  for (const [nome, args] of CANDIDATOS) {
    const teste = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=black:s=320x320:d=0.2",
      "-pix_fmt", "yuv420p", "-c:v", nome, ...args, "-f", "null", "-"]);
    if (teste.status === 0) return (cache = ["-c:v", nome, ...args, "-pix_fmt", "yuv420p"]);
  }
  return (cache = CPU);
}

// Vídeo HDR de celular (HLG do iPhone, PQ/HDR10 do Android) vira SDR com tonemap; sem isso a cor sai lavada.
// Devolve o trecho para pôr no começo do -vf ("" se o vídeo já for SDR).
export function filtroHDR(src) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=color_transfer", "-of", "csv=p=0", src], { encoding: "utf8" });
  const tr = (r.stdout || "").trim();
  if (!/arib-std-b67|smpte2084/.test(tr)) return "";
  const z = spawnSync("ffmpeg", ["-hide_banner", "-filters"], { encoding: "utf8" });
  if (!/ zscale /.test(z.stdout || "")) { console.warn("aviso: vídeo HDR e este ffmpeg não tem zscale — as cores podem sair lavadas"); return "format=yuv420p,"; }
  return "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,";
}

// Decodificação acelerada quando existe (HEVC/4K de celular decodifica bem mais rápido); o ffmpeg cai para CPU sozinho.
export const HWDEC = ["-hwaccel", "auto"];
