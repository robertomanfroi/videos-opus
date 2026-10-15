// Gera os efeitos sonoros do estilo com o ffmpeg (sem licença de terceiros) em <projeto>/assets/sfx/.
// Rodar na raiz do projeto:  node ../../.claude/skills/estilo-colagem/scripts/sons.mjs
// whoosh (troca de cena) · hit (carimbo, X) · pop (chip) · tick (item de lista) · rise (subida antes de revelação)
// e, se não existir, assets/fundo.wav: cama musical suave gerada (acorde lento), para ficar BEM baixa sob a voz.
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
mkdirSync("assets/sfx", { recursive: true });
const ff = (args, out) => { if (!existsSync(out)) execFileSync("ffmpeg", ["-v", "error", "-y", ...args, out]); };
ff(["-f", "lavfi", "-i", "anoisesrc=color=pink:d=0.55:a=0.6", "-af", "highpass=f=300,lowpass=f=5500,afade=t=in:d=0.28,afade=t=out:st=0.3:d=0.25"], "assets/sfx/whoosh.wav");
ff(["-f", "lavfi", "-i", "sine=f=52:d=0.6", "-af", "volume=2.5,afade=t=out:st=0.02:d=0.58"], "assets/sfx/hit.wav");
ff(["-f", "lavfi", "-i", "sine=f=1250:d=0.09", "-af", "afade=t=in:d=0.005,afade=t=out:st=0.03:d=0.06"], "assets/sfx/pop.wav");
ff(["-f", "lavfi", "-i", "anoisesrc=color=white:d=0.05:a=0.5", "-af", "highpass=f=2000,afade=t=out:st=0.01:d=0.04"], "assets/sfx/tick.wav");
ff(["-f", "lavfi", "-i", "anoisesrc=color=pink:d=0.8:a=0.5", "-af", "highpass=f=500,lowpass=f=7000,afade=t=in:d=0.75,afade=t=out:st=0.75:d=0.05"], "assets/sfx/rise.wav");
// cama musical: acorde lento (lá menor 9) com tremolo leve, 4 min; o build corta na duração do vídeo
ff(["-f", "lavfi", "-i", "sine=f=110:d=240", "-f", "lavfi", "-i", "sine=f=164.81:d=240", "-f", "lavfi", "-i", "sine=f=220:d=240", "-f", "lavfi", "-i", "sine=f=246.94:d=240",
  "-filter_complex", "[0][1][2][3]amix=inputs=4,tremolo=f=0.25:d=0.35,lowpass=f=900,volume=0.8,afade=t=in:d=2"], "assets/fundo.wav");
console.log("sons prontos em assets/sfx/ (whoosh, hit, pop, tick, rise) + assets/fundo.wav");
