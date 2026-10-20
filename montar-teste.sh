#!/usr/bin/env bash
# Monta a skill completa (com binários) numa pasta do Windows para testar com o node.exe portátil.
set -euo pipefail
cd "$(dirname "$0")"
DEST="${1:-/mnt/c/Users/Usuario/AppData/Local/Temp/vop-teste/videos-opus}"
mkdir -p "$DEST"/{bin/whisper,modelos,fontes}
rsync -a --delete skill/videos-opus/scripts/ "$DEST/scripts/"
mkdir -p "$DEST/node_modules" && rsync -a --delete vendor-cache/pw/package/ "$DEST/node_modules/playwright-core/"
cp skill/videos-opus/SKILL.md "$DEST/" 2>/dev/null || true
rsync -a --delete skill/videos-opus/exemplos/ "$DEST/exemplos/"
cp vendor-cache/fontes/*.ttf "$DEST/fontes/"
[ -f "$DEST/bin/ffmpeg.exe" ] || unzip -qjo vendor-cache/ffmpeg.zip '*/bin/ffmpeg.exe' '*/bin/ffprobe.exe' -d "$DEST/bin"
[ -f "$DEST/bin/node.exe" ] || unzip -qjo vendor-cache/node.zip '*/node.exe' -d "$DEST/bin"
cp -u vendor-cache/yt-dlp.exe "$DEST/bin/"
[ -f "$DEST/bin/whisper/whisper-cli.exe" ] || unzip -qjo vendor-cache/whisper-bin-x64.zip 'Release/whisper-cli.exe' 'Release/*.dll' -d "$DEST/bin/whisper" 2>/dev/null || unzip -qjo vendor-cache/whisper-bin-x64.zip '*whisper-cli.exe' '*.dll' -d "$DEST/bin/whisper"
[ -f "$DEST/modelos/ggml-small-q5_1.bin" ] || cp vendor-cache/ggml-small-q5_1.bin "$DEST/modelos/"
[ -f "$DEST/modelos/ggml-silero-v5.1.2.bin" ] || cp vendor-cache/ggml-silero-v5.1.2.bin "$DEST/modelos/"
[ -f "$DEST/modelos/rvm_mobilenetv3_fp32.onnx" ] || cp vendor-cache/rvm_mobilenetv3_fp32.onnx "$DEST/modelos/"
# kit de estilos: o pesado (node_modules etc.) copia uma vez; as skills do kit sincronizam sempre
[ -d "$DEST/kit/node_modules/hyperframes" ] || { mkdir -p "$DEST/kit"; cp -r vendor-cache/kit-win/. "$DEST/kit/"; }
mkdir -p "$DEST/kit/.claude" && rsync -a --delete kit/.claude/skills/ "$DEST/kit/.claude/skills/"
cp kit/scripts/*.mjs "$DEST/kit/scripts/"
echo "$DEST"
