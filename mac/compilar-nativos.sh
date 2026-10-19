#!/usr/bin/env bash
# Baixa e compila os programas do Mac para o chip da máquina em que roda (GitHub Actions: macos-15 = Apple Silicon,
# macos-15-intel = Intel). Precisa do Node 24 com npm no PATH. Usa o package.json/package-lock.json do kit que vem no zip do Windows.
# Uso: mac/compilar-nativos.sh <videos-opus.zip do Windows> <pasta de saída>
set -euo pipefail
BASE_ZIP="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; SAIDA="$2"
NODE_V=24.21.0
WHISPER_TAG=v1.9.4
case "$(uname -m)" in arm64) NA=arm64; FA=arm64 ;; x86_64) NA=x64; FA=amd64 ;; *) exit 1 ;; esac
mkdir -p "$SAIDA/bin/whisper"; SAIDA="$(cd "$SAIDA" && pwd)"
T="$(mktemp -d)"; cd "$T"

echo "== Node $NODE_V ($NA)"
curl -fsSL "https://nodejs.org/dist/v$NODE_V/node-v$NODE_V-darwin-$NA.tar.gz" | tar -xz
cp "node-v$NODE_V-darwin-$NA/bin/node" "$SAIDA/bin/node"

echo "== FFmpeg ($FA)"
for p in ffmpeg ffprobe; do
  curl -fsSL -o "$p.zip" "https://ffmpeg.martin-riedl.de/redirect/latest/macos/$FA/release/$p.zip"
  unzip -qo "$p.zip" "$p" -d "$SAIDA/bin"
done
chmod +x "$SAIDA/bin/ffmpeg" "$SAIDA/bin/ffprobe"
"$SAIDA/bin/ffmpeg" -hide_banner -version | head -1
# o que a skill usa: legenda (libass), texto, HDR (zscale), VP9 com transparência, x264 e a placa da Apple
for f in subtitles drawtext zscale tonemap; do "$SAIDA/bin/ffmpeg" -hide_banner -filters | grep -qw "$f" || { echo "ffmpeg sem filtro $f"; exit 1; }; done
for e in libx264 libvpx-vp9 h264_videotoolbox aac; do "$SAIDA/bin/ffmpeg" -hide_banner -encoders | grep -qw "$e" || { echo "ffmpeg sem encoder $e"; exit 1; }; done

echo "== whisper.cpp $WHISPER_TAG"
git clone -q --depth 1 --branch "$WHISPER_TAG" https://github.com/ggml-org/whisper.cpp
# estático (um arquivo só) e sem instruções da máquina de compilação; Metal embutido só no Apple Silicon
EXTRA=(-DGGML_NATIVE=OFF)
if [ "$NA" = arm64 ]; then EXTRA+=(-DGGML_METAL=ON -DGGML_METAL_EMBED_LIBRARY=ON); else EXTRA+=(-DGGML_METAL=OFF -DGGML_AVX=ON -DGGML_AVX2=ON -DGGML_FMA=ON -DGGML_F16C=ON); fi
cmake -S whisper.cpp -B wb -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DWHISPER_BUILD_TESTS=OFF \
  -DWHISPER_BUILD_SERVER=OFF -DCMAKE_OSX_DEPLOYMENT_TARGET=12.0 "${EXTRA[@]}" >/dev/null
cmake --build wb --config Release -j "$(sysctl -n hw.ncpu)" --target whisper-cli >/dev/null
cp wb/bin/whisper-cli "$SAIDA/bin/whisper/whisper-cli"
otool -L "$SAIDA/bin/whisper/whisper-cli" | grep -v -E "/usr/lib/|/System/Library/|:$" && { echo "whisper-cli depende de biblioteca fora do sistema"; exit 1; } || true

echo "== node_modules do kit"
mkdir kit && unzip -qo "$BASE_ZIP" "videos-opus/kit/package.json" "videos-opus/kit/package-lock.json" -d kit
cd kit/videos-opus/kit
npm ci --no-audit --no-fund   # npm do Node 24 que o workflow instala (mesmo Node do pacote)
mv node_modules "$SAIDA/kit-node_modules"
cd "$SAIDA" && rm -rf "$T"
file bin/node bin/ffmpeg bin/ffprobe bin/whisper/whisper-cli
