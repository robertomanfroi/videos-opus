#!/usr/bin/env bash
# Gera o pacote do Mac a partir do pacote do Windows (que já tem acervo, modelos, fontes e o kit) trocando os
# programas pelos do Mac e pondo por cima os scripts e as skills deste repositório.
# Roda no GitHub Actions (macOS), depois de mac/compilar-nativos.sh.
# Uso: mac/empacotar-mac.sh <videos-opus.zip do Windows> <pasta dos nativos> <arm64|x64> <saida.zip>
set -euo pipefail
BASE_ZIP="$1"; NATIVOS="$(cd "$2" && pwd)"; CHIP="$3"; SAIDA="$(cd "$(dirname "$4")" && pwd)/$(basename "$4")"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
TRAB="$(mktemp -d)"
OUT="$TRAB/videos-opus"

ditto -x -k "$BASE_ZIP" "$TRAB"
[ -d "$OUT/scripts" ] || { echo "o zip base não tem a pasta videos-opus"; exit 1; }

# programas: fora os do Windows, dentro os do Mac
rm -rf "$OUT/bin" "$OUT/kit/node_modules"
mkdir -p "$OUT/bin/whisper"
cp "$NATIVOS/bin/node" "$NATIVOS/bin/ffmpeg" "$NATIVOS/bin/ffprobe" "$NATIVOS/bin/yt-dlp" "$OUT/bin/"
cp "$NATIVOS/bin/whisper/whisper-cli" "$OUT/bin/whisper/"
ditto "$NATIVOS/kit-node_modules" "$OUT/kit/node_modules"

# scripts e skills deste repositório por cima (mesma montagem do empacotar.sh)
for d in scripts exemplos roteiro; do rm -rf "$OUT/$d"; cp -R "$REPO/skill/videos-opus/$d" "$OUT/$d"; done
cp "$REPO/skill/videos-opus/SKILL.md" "$REPO/skill/videos-opus/DIREITOS.txt" "$OUT/"
python3 "$REPO/gerar-skill-codex.py" "$REPO/skill/videos-opus/SKILL.md" "$OUT/codex/SKILL.md"
rm -rf "$OUT/kit/.claude/skills" && cp -R "$REPO/kit/.claude/skills" "$OUT/kit/.claude/skills"
cp "$REPO"/kit/scripts/*.mjs "$OUT/kit/scripts/"
find "$OUT/kit" -name "*.py" -delete

# textos com fim de linha do Mac; licenças: troca a linha do FFmpeg e do navegador
for f in "$OUT/DIREITOS.txt" "$OUT/licencas/LEIA.txt"; do python3 -c "import sys; p=sys.argv[1]; d=open(p,'rb').read(); open(p,'wb').write(d.replace(b'\r\n', b'\n'))" "$f"; done
FFV="$("$OUT/bin/ffmpeg" -version | head -1 | awk '{print $3}')"
FFV="$FFV" python3 - "$OUT/licencas/LEIA.txt" <<'PY'
import os, re, sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
s = re.sub(r'- FFmpeg 9\.0\.2 \(build "essentials".*\n.*\n',
           f'- FFmpeg {os.environ["FFV"]} (build estático para macOS de Martin Riedl, https://ffmpeg.martin-riedl.de) — GPLv3.\n'
           '  Código-fonte: https://ffmpeg.org/download.html\n', s, count=1)
s = s.replace("Usa o Microsoft Edge já instalado no Windows; nenhum navegador é incluído.",
              "Usa o Google Chrome já instalado no Mac; sem ele, o instalador baixa o Chrome headless do Playwright.")
s = s.replace("o .exe traz o Python", "o binário traz o Python")
s = s.replace("whisper.cpp (build b5130", "whisper.cpp (compilado para macOS a partir do código-fonte")
open(p, "w", encoding="utf-8").write(s)
PY

chmod +x "$OUT/bin/node" "$OUT/bin/ffmpeg" "$OUT/bin/ffprobe" "$OUT/bin/yt-dlp" "$OUT/bin/whisper/whisper-cli"
for f in SKILL.md DIREITOS.txt codex/SKILL.md scripts/video.mjs scripts/navegador.mjs scripts/kit.mjs scripts/referencia.mjs bin/node bin/ffmpeg bin/yt-dlp \
         bin/ffprobe bin/whisper/whisper-cli modelos/ggml-small-q5_1.bin modelos/ggml-silero-v5.1.2.bin \
         modelos/rvm_mobilenetv3_fp32.onnx acervo/data/videos.json node_modules/playwright-core/package.json \
         kit/node_modules/hyperframes/dist/cli.js kit/.claude/skills/editar/SKILL.md kit/examples/starter/index.html; do
  [ -e "$OUT/$f" ] || { echo "FALTA $f"; exit 1; }
done
ls "$OUT"/kit/node_modules/onnxruntime-node/bin/napi-v3/darwin/*/onnxruntime_binding.node >/dev/null || { echo "FALTA onnxruntime do Mac"; exit 1; }
if find "$OUT" -name "*.exe" -o -name "*.dll" | grep -q .; then echo "sobrou programa do Windows:"; find "$OUT" -name "*.exe" -o -name "*.dll" | head; exit 1; fi

rm -f "$SAIDA"
(cd "$TRAB" && ditto -c -k --sequesterRsrc --keepParent videos-opus "$SAIDA")
ls -la "$SAIDA"; du -sh "$OUT"
rm -rf "$TRAB"
