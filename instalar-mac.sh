#!/bin/bash
# Instalador da skill Vídeos Opus no Mac (https://github.com/robertomanfroi/videos-opus)
# Vídeos Opus (c) 2026 Suellen Warmling. Todos os direitos reservados. Proibido copiar, revender ou distribuir.
#
# Uso (cole no Terminal):
#   Claude: curl -fsSL https://github.com/robertomanfroi/videos-opus/releases/latest/download/instalar-mac.sh | bash
#   Codex:  curl -fsSL https://github.com/robertomanfroi/videos-opus/releases/latest/download/instalar-mac.sh | bash -s codex
#
# O que ele faz: baixa o pacote do seu tipo de Mac (Apple Silicon ou Intel) da página de Releases do GitHub,
# descompacta em ~/.claude/skills/videos-opus (Claude) ou ~/.videos-opus/pacote (Codex, com o SKILL.md em
# ~/.codex/skills/videos-opus) e testa. Não pede senha de administrador e não mexe em nada fora dessas pastas.
# Baixado pelo curl, o pacote não recebe a marca de quarentena, então o Mac não pede para liberar os programas.
set -u

# Tudo dentro de uma função: se o download do script cair no meio, o bash não executa um pedaço dele.
main() {

  ALVO="${1:-claude}"
  BASE="${VIDEOS_OPUS_BASE:-https://github.com/robertomanfroi/videos-opus/releases/latest/download}"

  case "$(uname -m)" in
    arm64) CHIP="arm64"; NOME_CHIP="Apple Silicon (M1, M2, M3, M4...)" ;;
    x86_64)
      # Terminal aberto pelo Rosetta num Mac com chip da Apple: usa o pacote nativo mesmo assim
      if [ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" = "1" ]; then CHIP="arm64"; NOME_CHIP="Apple Silicon"; else CHIP="x64"; NOME_CHIP="Intel"; fi ;;
    *) echo "Este Mac não é compatível ($(uname -m))."; exit 1 ;;
  esac
  URL="${VIDEOS_OPUS_URL:-$BASE/videos-opus-mac-$CHIP.zip}"   # VIDEOS_OPUS_URL: só para testes (file:///caminho/zip)

  if [ "$ALVO" = "codex" ]; then
    DESTINO="${VIDEOS_OPUS_DESTINO:-$HOME/.videos-opus/pacote}"
    APP="Codex"
  else
    DESTINO="${VIDEOS_OPUS_DESTINO:-$HOME/.claude/skills}"
    APP="Claude"
  fi
  PASTA="$DESTINO/videos-opus"
  TMP="$(mktemp -d "${TMPDIR:-/tmp}/videos-opus.XXXXXX")"
  trap 'rm -rf "$TMP"' EXIT

  falha() {
    echo
    echo " ----------------------------------------------"
    printf '   %s\n' "$@"
    echo
    echo "   Se não resolver, mande uma foto desta tela para o suporte."
    echo " ----------------------------------------------"
    echo
    exit 1
  }

  echo
  echo " =============================================="
  echo "   VÍDEOS OPUS  -  edite seus vídeos com o $APP"
  echo "   Propriedade de Suellen Warmling. Todos os direitos reservados."
  echo "   Proibido copiar, revender ou distribuir sem autorização."
  echo " =============================================="
  echo
  echo " Mac com chip $NOME_CHIP."

  maior=$(sw_vers -productVersion 2>/dev/null | cut -d. -f1)
  if [ -n "$maior" ] && [ "$maior" -lt 12 ] 2>/dev/null; then
    falha "Este Mac está no macOS $(sw_vers -productVersion). O Vídeos Opus precisa do macOS 12 (Monterey) ou mais novo." \
          "Atualize em Ajustes do Sistema > Geral > Atualização de Software e rode de novo."
  fi

  # precisa de uns 3 GB: o zip, o pacote aberto e a versão antiga até a nova entrar
  mkdir -p "$DESTINO"
  livre=$(df -Pk "$DESTINO" | awk 'NR==2 {print int($4/1048576)}')
  if [ -n "$livre" ] && [ "$livre" -lt 3 ]; then
    falha "Pouco espaço no disco: precisa de uns 3 GB livres." \
          "Esvazie o Lixo e apague vídeos grandes de Downloads, depois rode de novo."
  fi

  echo
  echo " 1/3  Baixando o pacote (uns 400 MB). Pode levar alguns minutos..."
  echo
  if ! curl -L --fail --retry 3 --retry-delay 5 --progress-bar -o "$TMP/videos-opus.zip" "$URL"; then
    falha "Não consegui baixar o pacote." \
          "Confira a internet e rode o mesmo comando de novo."
  fi

  echo
  echo " 2/3  Instalando..."
  if ! /usr/bin/ditto -x -k "$TMP/videos-opus.zip" "$TMP/aberto" || [ ! -d "$TMP/aberto/videos-opus" ]; then
    falha "O pacote baixado veio com defeito." "Rode o mesmo comando de novo."
  fi
  # a versão antiga sai do caminho primeiro (fora da pasta de skills, para o Claude não ver duas) e só é apagada depois
  rm -rf "$DESTINO"/../videos-opus-antigo-* 2>/dev/null
  ANTIGO=""
  if [ -e "$PASTA" ]; then
    ANTIGO="$DESTINO/../videos-opus-antigo-$$"
    mv "$PASTA" "$ANTIGO" || falha "Não consegui substituir a versão antiga." "Feche o app do $APP e rode o comando de novo."
  fi
  mv "$TMP/aberto/videos-opus" "$PASTA" || falha "Não consegui instalar em $PASTA."
  [ -n "$ANTIGO" ] && rm -rf "$ANTIGO"
  # por garantia: tira a quarentena e confere a permissão de execução dos programas
  xattr -dr com.apple.quarantine "$PASTA" 2>/dev/null
  chmod +x "$PASTA/bin/node" "$PASTA/bin/ffmpeg" "$PASTA/bin/ffprobe" "$PASTA/bin/whisper/whisper-cli" 2>/dev/null

  NODE="$PASTA/bin/node"
  if [ "$ALVO" = "codex" ]; then
    "$NODE" "$PASTA/scripts/instalar-codex.mjs" "$HOME/.codex/skills/videos-opus" >/dev/null \
      || falha "Não consegui registrar a skill no Codex."
  fi

  echo " 3/3  Testando..."
  diagnostico() { "$NODE" "$PASTA/scripts/video.mjs" diagnostico > "$PASTA/diagnostico.txt" 2>&1; }
  diagnostico
  AVISO=""
  if ! grep -q '"ok": true' "$PASTA/diagnostico.txt" && grep -q '"so_navegador": true' "$PASTA/diagnostico.txt"; then
    # Sem navegador, ou o Chrome/Edge do Mac não abriu: baixa o Chrome de gravação (só para fazer os vídeos,
    # não aparece no Mac) e testa de novo. O teste escolhe sozinho o que abrir e guarda a escolha.
    echo "      Baixando o navegador de gravação (uns 100 MB)..."
    "$NODE" "$PASTA/node_modules/playwright-core/cli.js" install chromium-headless-shell >/dev/null 2>&1
    rm -f "$PASTA/navegador.txt"
    diagnostico
  fi
  if ! grep -q '"ok": true' "$PASTA/diagnostico.txt"; then
    if grep -q '"so_navegador": true' "$PASTA/diagnostico.txt"; then
      AVISO=1
    else
      cat "$PASTA/diagnostico.txt"
      falha "A instalação terminou, mas o teste falhou (veja acima)."
    fi
  fi
  echo
  echo " =============================================="
  echo "   PRONTO! A skill Vídeos Opus está instalada."
  echo "   Vídeos Opus é propriedade de Suellen Warmling."
  echo " =============================================="
  echo
  if [ -n "$AVISO" ]; then
    echo " ----------------------------------------------"
    echo "   ATENÇÃO: o Mac não deixou o Vídeos Opus abrir o navegador."
    echo "   Já funciona: cortar as pausas, pôr legenda e mudar o formato."
    echo "   Para liberar o resto, instale o Google Chrome (google.com/chrome),"
    echo "   abra ele uma vez e rode este comando de novo."
    echo " ----------------------------------------------"
    echo
  fi
  if [ "$ALVO" = "codex" ]; then
    echo " Agora feche e abra de novo o Codex (o app do Codex ou o app do ChatGPT, modo Codex) e peça, por exemplo:"
  else
    echo " Agora abra o app do Claude, aba Code, com o ambiente Local, e peça, por exemplo:"
  fi
  echo " \"corta as pausas e põe legenda no meu último vídeo\"."
  echo
  exit 0
}

main "$@"
