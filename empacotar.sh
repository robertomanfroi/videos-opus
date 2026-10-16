#!/usr/bin/env bash
# Gera dist/videos-opus.zip: pasta videos-opus/ completa (programas portáteis inclusos) + LEIA-PRIMEIRO.txt.
set -euo pipefail
cd "$(dirname "$0")"
V=vendor-cache
OUT=build/videos-opus
rm -rf build && mkdir -p "$OUT"/{bin/whisper,modelos,fontes,licencas} dist
cp -r skill/videos-opus/{SKILL.md,DIREITOS.txt,scripts,exemplos,roteiro} "$OUT/"
# versão das instruções para o Codex: o instalador do Codex grava esta na pasta de skills, apontando para o pacote
mkdir -p "$OUT/codex" && python3 gerar-skill-codex.py skill/videos-opus/SKILL.md "$OUT/codex/SKILL.md"
mkdir -p "$OUT/node_modules" && cp -r vendor-cache/pw/package "$OUT/node_modules/playwright-core"
rsync -a --exclude .git ~/.claude/skills/videos-opus/acervo/ "$OUT/acervo/"
unzip -qjo $V/ffmpeg.zip '*/bin/ffmpeg.exe' '*/bin/ffprobe.exe' -d "$OUT/bin"
unzip -qjo $V/ffmpeg.zip '*/LICENSE' -d build/tmp && mv build/tmp/LICENSE "$OUT/licencas/FFmpeg-GPLv3.txt"
unzip -qjo $V/node.zip '*/node.exe' -d "$OUT/bin"
unzip -qjo $V/node.zip 'node-v24.21.0-win-x64/LICENSE' -d build/tmp && mv build/tmp/LICENSE "$OUT/licencas/Node.js.txt"
unzip -qjo $V/whisper-bin-x64.zip 'Release/whisper-cli.exe' 'Release/whisper.dll' 'Release/ggml*.dll' -d "$OUT/bin/whisper"
cp $V/LICENSE-whisper.cpp.txt "$OUT/licencas/whisper.cpp-MIT.txt"
cp $V/ggml-small-q5_1.bin $V/ggml-silero-v5.1.2.bin $V/rvm_mobilenetv3_fp32.onnx "$OUT/modelos/"
# kit de estilos (motor da Edição Automática): node_modules já compilado para Windows + nossas adaptações por cima
cp -r $V/kit-win "$OUT/kit"
rm -rf "$OUT/kit/video-projects" "$OUT/kit/.claude/skills"
mkdir -p "$OUT/kit/.claude" && cp -r kit/.claude/skills "$OUT/kit/.claude/skills"
cp kit/scripts/*.mjs "$OUT/kit/scripts/"
find "$OUT/kit" -name "__pycache__" -prune -exec rm -rf {} + ; find "$OUT/kit" -name "*.py" -delete
cp $V/fontes/*.ttf "$OUT/fontes/"; for f in $V/fontes/OFL-*.txt; do cp "$f" "$OUT/licencas/fonte-$(basename "$f")"; done
cat > "$OUT/licencas/LEIA.txt" <<'TXT'
Vídeos Opus © 2026 Suellen Warmling, todos os direitos reservados (ver DIREITOS.txt, na pasta da skill).

Programas de terceiros incluídos, cada um com a sua licença (arquivos nesta pasta):
- FFmpeg 9.0.2 (build "essentials" de Gyan Doshi, https://www.gyan.dev/ffmpeg/builds/) — GPLv3.
  Código-fonte: https://ffmpeg.org/download.html e https://github.com/GyanD/codexffmpeg/releases/tag/9.0.2
- Node.js 24.21.0 — licença MIT e licenças de terceiros em Node.js.txt.
- whisper.cpp (build b5130, https://github.com/ggml-org/whisper.cpp) — MIT.
- Modelo Whisper small (OpenAI, MIT), quantizado por ggerganov (ggml-small-q5_1.bin).
- Fontes Bebas Neue, Anton, Montserrat, Poppins e EB Garamond — SIL Open Font License 1.1.
- playwright-core 1.63.0 (Microsoft) — Apache-2.0, licença em node_modules/playwright-core/LICENSE.
  Usa o Microsoft Edge já instalado no Windows; nenhum navegador é incluído.
- Acervo de prompts awesome-opus5-5-videos (yihui-dev) — MIT, licença em acervo/LICENSE.
- Detector de voz Silero VAD v5.1.2 (ggml-silero-v5.1.2.bin, convertido pelo projeto whisper.cpp) — MIT.
- Kit de estilos em kit/: HyperFrames Student Kit (Nate Herk) — MIT (kit/LICENSE); HyperFrames 0.7.109 — Apache-2.0;
  GSAP — licença "Standard no-charge" da GreenSock/Webflow; demais pacotes em kit/node_modules, cada um com a sua licença
  (kit/THIRD_PARTY_NOTICES.md). Skills dos 5 estilos: Edição Automática de Vídeo (Suellen Warmling).
- Recorte de pessoa: modelo Robust Video Matting (Peter Lin e colaboradores, rvm_mobilenetv3_fp32.onnx) — GPL-3.0,
  usado só como ferramenta local. Código-fonte: https://github.com/PeterL1n/RobustVideoMatting
- ONNX Runtime 1.21.1 (Microsoft) — MIT, em kit/node_modules/onnxruntime-node.
- Emojis do estilo celular/anúncio baixados na hora do Twemoji (jdecked/twemoji) — CC-BY 4.0.
- Fontes dos estilos (Archivo Black, Inter, Instrument Serif, Caveat e outras) — SIL Open Font License 1.1, com o texto
  da licença junto de cada fonte em kit/.claude/skills/estilo-*/template/fonts.
TXT
# finais de linha do Windows nos textos que a aluna pode abrir
cp LEIA-PRIMEIRO.txt build/LEIA-PRIMEIRO.txt
sed -i 's/$/\r/' build/LEIA-PRIMEIRO.txt "$OUT/licencas/LEIA.txt" "$OUT/DIREITOS.txt"
rm -rf build/tmp
for f in SKILL.md DIREITOS.txt codex/SKILL.md scripts/instalar-codex.mjs roteiro/roteiro-viral.md scripts/video.mjs scripts/ferramentas.mjs scripts/correcoes.mjs bin/ffmpeg.exe bin/ffprobe.exe bin/node.exe bin/whisper/whisper-cli.exe modelos/ggml-small-q5_1.bin fontes/BebasNeue-Regular.ttf acervo/data/videos.json node_modules/playwright-core/package.json scripts/viral.html scripts/viral.mjs scripts/som.mjs scripts/navegador.mjs scripts/legenda.mjs fontes/EBGaramond-Italic.ttf exemplos/oferta-animada.html scripts/kit.mjs modelos/ggml-silero-v5.1.2.bin modelos/rvm_mobilenetv3_fp32.onnx kit/node_modules/hyperframes/dist/cli.js kit/node_modules/onnxruntime-node/bin/napi-v3/win32/x64/onnxruntime_binding.node kit/scripts/new-video.mjs kit/.claude/skills/editar/SKILL.md kit/.claude/skills/_motor/transcrever.mjs kit/.claude/skills/estilo-colagem/scripts/matte-pessoa.mjs kit/examples/starter/index.html; do
  [ -f "$OUT/$f" ] || { echo "FALTA $f"; exit 1; }
done
rm -f dist/videos-opus.zip
python3 -c "import zipfile,os,sys
z=zipfile.ZipFile('dist/videos-opus.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9)
for raiz in ('videos-opus','LEIA-PRIMEIRO.txt'):
  p=os.path.join('build',raiz)
  arqs=[p] if os.path.isfile(p) else [os.path.join(d,f) for d,_,fs in os.walk(p) for f in fs]
  for a in sorted(arqs): z.write(a,os.path.relpath(a,'build'))
z.close()"
ls -la dist/videos-opus.zip; du -sh build/videos-opus
