#!/usr/bin/env bash
# Gera dist/videos-opus-v1.zip: pasta videos-opus/ completa (programas portáteis inclusos) + LEIA-PRIMEIRO.txt.
set -euo pipefail
cd "$(dirname "$0")"
V=vendor-cache
OUT=build/videos-opus
rm -rf build && mkdir -p "$OUT"/{bin/whisper,modelos,fontes,licencas} dist
cp -r skill/videos-opus/{SKILL.md,scripts,exemplos} "$OUT/"
rsync -a --exclude .git ~/.claude/skills/videos-opus/acervo/ "$OUT/acervo/"
unzip -qjo $V/ffmpeg.zip '*/bin/ffmpeg.exe' '*/bin/ffprobe.exe' -d "$OUT/bin"
unzip -qjo $V/ffmpeg.zip '*/LICENSE' -d build/tmp && mv build/tmp/LICENSE "$OUT/licencas/FFmpeg-GPLv3.txt"
unzip -qjo $V/node.zip '*/node.exe' -d "$OUT/bin"
unzip -qjo $V/node.zip 'node-v24.21.0-win-x64/LICENSE' -d build/tmp && mv build/tmp/LICENSE "$OUT/licencas/Node.js.txt"
unzip -qjo $V/whisper-bin-x64.zip 'Release/whisper-cli.exe' 'Release/whisper.dll' 'Release/ggml*.dll' -d "$OUT/bin/whisper"
cp $V/LICENSE-whisper.cpp.txt "$OUT/licencas/whisper.cpp-MIT.txt"
cp $V/ggml-small-q5_1.bin "$OUT/modelos/"
cp $V/fontes/*.ttf "$OUT/fontes/"; for f in $V/fontes/OFL-*.txt; do cp "$f" "$OUT/licencas/fonte-$(basename "$f")"; done
cat > "$OUT/licencas/LEIA.txt" <<'TXT'
Programas de terceiros incluídos, cada um com a sua licença (arquivos nesta pasta):
- FFmpeg 9.0.2 (build "essentials" de Gyan Doshi, https://www.gyan.dev/ffmpeg/builds/) — GPLv3.
  Código-fonte: https://ffmpeg.org/download.html e https://github.com/GyanD/codexffmpeg/releases/tag/9.0.2
- Node.js 24.21.0 — licença MIT e licenças de terceiros em Node.js.txt.
- whisper.cpp (build b5130, https://github.com/ggml-org/whisper.cpp) — MIT.
- Modelo Whisper small (OpenAI, MIT), quantizado por ggerganov (ggml-small-q5_1.bin).
- Fontes Bebas Neue, Anton, Montserrat e Poppins — SIL Open Font License 1.1.
- Acervo de prompts awesome-opus5-5-videos (yihui-dev) — MIT, licença em acervo/LICENSE.
TXT
# finais de linha do Windows nos textos que a aluna pode abrir
cp LEIA-PRIMEIRO.txt build/LEIA-PRIMEIRO.txt
sed -i 's/$/\r/' build/LEIA-PRIMEIRO.txt "$OUT/licencas/LEIA.txt"
rm -rf build/tmp
for f in SKILL.md scripts/video.mjs scripts/ferramentas.mjs scripts/correcoes.mjs bin/ffmpeg.exe bin/ffprobe.exe bin/node.exe bin/whisper/whisper-cli.exe modelos/ggml-small-q5_1.bin fontes/BebasNeue-Regular.ttf acervo/data/videos.json; do
  [ -f "$OUT/$f" ] || { echo "FALTA $f"; exit 1; }
done
rm -f dist/videos-opus-v1.zip
python3 -c "import zipfile,os,sys
z=zipfile.ZipFile('dist/videos-opus-v1.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9)
for raiz in ('videos-opus','LEIA-PRIMEIRO.txt'):
  p=os.path.join('build',raiz)
  arqs=[p] if os.path.isfile(p) else [os.path.join(d,f) for d,_,fs in os.walk(p) for f in fs]
  for a in sorted(arqs): z.write(a,os.path.relpath(a,'build'))
z.close()"
ls -la dist/videos-opus-v1.zip; du -sh build/videos-opus
