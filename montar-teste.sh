#!/usr/bin/env bash
# Monta a skill completa (com binários) numa pasta do Windows para testar com o node.exe portátil.
set -euo pipefail
cd "$(dirname "$0")"
DEST="${1:-/mnt/c/Users/Usuario/AppData/Local/Temp/vop-teste/videos-opus}"
mkdir -p "$DEST"/{bin/whisper,modelos,fontes}
rsync -a --delete skill/videos-opus/scripts/ "$DEST/scripts/"
cp skill/videos-opus/SKILL.md "$DEST/" 2>/dev/null || true
cp vendor-cache/fontes/* "$DEST/fontes/"
[ -f "$DEST/bin/ffmpeg.exe" ] || unzip -qjo vendor-cache/ffmpeg.zip '*/bin/ffmpeg.exe' '*/bin/ffprobe.exe' -d "$DEST/bin"
[ -f "$DEST/bin/node.exe" ] || unzip -qjo vendor-cache/node.zip '*/node.exe' -d "$DEST/bin"
[ -f "$DEST/bin/whisper/whisper-cli.exe" ] || unzip -qjo vendor-cache/whisper-bin-x64.zip 'Release/whisper-cli.exe' 'Release/*.dll' -d "$DEST/bin/whisper" 2>/dev/null || unzip -qjo vendor-cache/whisper-bin-x64.zip '*whisper-cli.exe' '*.dll' -d "$DEST/bin/whisper"
[ -f "$DEST/modelos/ggml-small-q5_1.bin" ] || cp vendor-cache/ggml-small-q5_1.bin "$DEST/modelos/"
echo "$DEST"
