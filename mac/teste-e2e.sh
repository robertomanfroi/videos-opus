#!/usr/bin/env bash
# Teste de ponta a ponta do pacote do Mac, como a aluna usaria: instala pelo instalar-mac.sh e roda cada caminho
# da skill num vídeo com fala de verdade (voz do próprio Mac). Roda no GitHub Actions (macOS).
# Uso: mac/teste-e2e.sh <videos-opus-mac-<chip>.zip> <pasta de evidências>
set -euo pipefail
ZIP="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
EVID="$2"; mkdir -p "$EVID"; EVID="$(cd "$EVID" && pwd)"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
export VIDEOS_OPUS_URL="file://$ZIP"
VO="$HOME/.claude/skills/videos-opus"
N="$VO/bin/node"; V="$VO/scripts/video.mjs"
campo() { python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d$1)"; }
passo() { echo; echo "######## $*"; }
quadro() { "$VO/bin/ffmpeg" -v error -y -ss "$2" -i "$1" -frames:v 1 -vf scale=360:-2 "$EVID/$3.jpg"; }
dur() { "$VO/bin/ffprobe" -v error -show_entries format=duration -of csv=p=0 "$1"; }

passo "1. Instalar para o Claude (com o Chrome do Mac)"
bash "$REPO/instalar-mac.sh" | tee "$EVID/instalar-claude.txt"
cat "$VO/diagnostico.txt" | tee "$EVID/diagnostico-claude.json"
grep -q '"ok": true' "$VO/diagnostico.txt"
file "$N" "$VO/bin/ffmpeg" "$VO/bin/whisper/whisper-cli" | tee -a "$EVID/arquitetura.txt"

passo "2. Vídeo de teste com fala (voz do Mac) e uma pausa longa no meio"
VOZ=$(say -v '?' | awk '/pt_BR/ {print $1; exit}'); VOZ="${VOZ:-Luciana}"
echo "voz: $VOZ"
T="$(mktemp -d)"
say -v "$VOZ" -o "$T/a.aiff" "Oi, gente. Hoje eu vou mostrar como editar os seus vídeos com inteligência artificial."
say -v "$VOZ" -o "$T/b.aiff" "Você grava no celular, e o Claude corta as pausas e coloca a legenda para você. Clica aqui agora."
F="$VO/bin/ffmpeg"
"$F" -v error -y -i "$T/a.aiff" -f lavfi -t 2.5 -i anullsrc=r=44100:cl=mono -i "$T/b.aiff" \
  -filter_complex "[0:a]aresample=44100[a0];[2:a]aresample=44100[a2];[a0][1:a][a2]concat=n=3:v=0:a=1[a]" -map "[a]" "$T/fala.wav"
D=$(dur "$T/fala.wav")
mkdir -p "$HOME/Downloads"
"$F" -v error -y -f lavfi -i "testsrc2=size=1080x1920:rate=30:duration=$D" -i "$T/fala.wav" -shortest \
  -c:v libx264 -pix_fmt yuv420p -c:a aac "$HOME/Downloads/IMG_4321.MOV"
echo "vídeo de teste: $D s"

passo "3. Achar, preparar, cortar, transcrever, legendar"
R=$("$N" "$V" achar --ultimo); echo "$R"
VID=$(echo "$R" | campo "['video']")
R=$("$N" "$V" preparar "$VID"); echo "$R"
P=$(echo "$R" | campo "['pasta']")
"$N" "$V" cortar "$P" | tee "$EVID/cortar.json"
DB=$(dur "$P/base.mp4"); DC=$(dur "$P/cortado.mp4"); echo "base $DB s -> cortado $DC s"
python3 -c "import sys; b,c=float('$DB'),float('$DC'); sys.exit(0 if c < b-1.5 else 'o corte não tirou a pausa')"
"$N" "$V" transcrever "$P" | tee "$EVID/transcrever.json"
grep -qi "legenda" "$EVID/transcrever.json" || { echo "transcrição não reconheceu a fala"; exit 1; }
R=$("$N" "$V" legendar "$P"); echo "$R" | tee "$EVID/legendar.json"
FINAL=$(echo "$R" | campo ".get('entregue') or d.get('final') or d.get('arquivo')")
[ -f "$FINAL" ] && quadro "$FINAL" 3 legenda-3s && quadro "$FINAL" 8 legenda-8s

passo "4. Edição viral"
R=$("$N" "$V" viral "$P" --titulo "Edite|com|IA" --tag "TESTE NO MAC" --cta "clica aqui agora" --cor laranja); echo "$R" | tee "$EVID/viral.json"
VIRAL=$(echo "$R" | campo ".get('entregue') or d.get('final') or d.get('arquivo')")
[ -f "$VIRAL" ] && quadro "$VIRAL" 1 viral-1s && quadro "$VIRAL" 6 viral-6s

passo "5. Vídeo animado"
R=$("$N" "$V" animar "$VO/exemplos/oferta-animada.html" --segundos 4 --nome teste-animado); echo "$R" | tee "$EVID/animar.json"
ANIM=$(echo "$R" | campo ".get('entregue') or d.get('final') or d.get('arquivo')")
[ -f "$ANIM" ] && quadro "$ANIM" 2 animado-2s

passo "6. Kit de estilos: projeto novo (transcrição do kit), render do HyperFrames e recorte da pessoa (CoreML)"
K=("$N" "$V" kit)
W=$("${K[@]}" pasta | campo "['pasta']"); echo "pasta do kit: $W"
"${K[@]}" node .claude/skills/_motor/achar-video.mjs --ultimo | tee "$EVID/kit-achar.json"
"${K[@]}" node .claude/skills/_motor/novo-projeto.mjs "$VID" teste-mac .claude/skills/estilo-celular | tail -5
[ -s "$W/video-projects/teste-mac/assets/raw.json" ]
"${K[@]}" --em "$VO/kit/examples/starter" hyperframes render --output "$T/starter.mp4" 2>&1 | tail -5
[ -s "$T/starter.mp4" ] && quadro "$T/starter.mp4" 1 hyperframes-1s
# como o estilo colagem faz: dentro de video-projects/<slug>/assets
A="$W/video-projects/teste-mac/assets"
"$F" -v error -y -i "$P/cortado.mp4" -t 2 -vf scale=540:960 -an "$A/clip.mp4"
"${K[@]}" --em video-projects/teste-mac/assets node ../../../.claude/skills/estilo-colagem/scripts/matte-pessoa.mjs clip.mp4 fg.webm 0.25 | tee "$EVID/matte.txt"
[ -s "$A/fg.webm" ]

passo "7. Instalar para o Codex sem nenhum navegador (baixa o Chrome de gravação)"
for base in /Applications "$HOME/Applications"; do
  for app in "Google Chrome" "Google Chrome for Testing" "Microsoft Edge" "Brave Browser" "Chromium"; do
    [ -d "$base/$app.app" ] && sudo mv "$base/$app.app" "$base/.escondido-$app.app" || true
  done
done
# o que a skill ainda enxerga como navegador (o Chrome de gravação baixado ainda não existe)
"$N" --input-type=module -e "const m = await import(process.argv[1]); console.log('navegadores vistos:', JSON.stringify(m.navegadores()))" "$VO/scripts/navegador.mjs" | tee "$EVID/navegadores-escondidos.txt"
# com a senha do guia das alunas (segredo do repositório SENHA_ALUNAS), testa também a liberação para sempre
bash "$REPO/instalar-mac.sh" codex "${SENHA_ALUNAS:-}" | tee "$EVID/instalar-codex.txt"
cp "$HOME/.videos-opus/pacote/videos-opus/diagnostico.txt" "$EVID/diagnostico-codex-instalador.json"
cat "$EVID/diagnostico-codex-instalador.json"
find "$HOME/Library/Caches/ms-playwright" -maxdepth 3 | tee "$EVID/playwright-cache.txt"
grep -q '"ok": true' "$HOME/.videos-opus/pacote/videos-opus/diagnostico.txt"
grep -q "$HOME/.videos-opus/pacote/videos-opus" "$HOME/.codex/skills/videos-opus/SKILL.md"
if [ -n "${SENHA_ALUNAS:-}" ]; then
  grep -q "liberada para sempre" "$EVID/instalar-codex.txt"
  grep -q '"período de uso": "liberado (aluna)"' "$HOME/.videos-opus/pacote/videos-opus/diagnostico.txt"
fi
NC="$HOME/.videos-opus/pacote/videos-opus/bin/node"; VC="$HOME/.videos-opus/pacote/videos-opus/scripts/video.mjs"
"$NC" "$VC" diagnostico | tee "$EVID/diagnostico-codex.json" | grep -q '"navegador": "ok"'
R=$("$NC" "$VC" animar "$HOME/.videos-opus/pacote/videos-opus/exemplos/oferta-animada.html" --segundos 2 --nome teste-sem-chrome); echo "$R"
echo "$R" | grep -q '"ok": true'
cat "$HOME/.videos-opus/pacote/videos-opus/navegador.txt" | tee "$EVID/navegador-escolhido-codex.txt"

passo "8. Kit de estilos sem Chrome (HyperFrames com o Chrome de gravação)"
KC=("$NC" "$VC" kit)
"${KC[@]}" --em "$HOME/.videos-opus/pacote/videos-opus/kit/examples/starter" hyperframes render --output "$T/starter-sem-chrome.mp4" 2>&1 | tail -5
[ -s "$T/starter-sem-chrome.mp4" ] && quadro "$T/starter-sem-chrome.mp4" 1 hyperframes-sem-chrome-1s

passo "TUDO CERTO"
ls -la "$EVID"
