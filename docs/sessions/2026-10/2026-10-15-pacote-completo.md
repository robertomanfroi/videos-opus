# Handoff — 15/10/2026 — pacote videos-opus completo

## Estado
- Stories 1.1 a 1.4 em InReview, commits 2bcef22 → 072ff1d.
- `dist/videos-opus-v1.zip` (387 MB) copiado para `C:\Users\Usuario\Downloads\`.
- Guia: `docs/guia/guia-videos-opus.pdf` (8 págs), cópia na Área de Trabalho como "Guia - Edite seus vídeos com o Claude.pdf".

## Para retomar
1. Roberto sobe o zip no Google Drive e manda o link → trocar `[LINK DO GOOGLE DRIVE]` em `docs/guia/guia-videos-opus.html`
   e regerar com `node docs/guia/gerar-pdf.mjs` (pelo node.exe da skill de teste).
2. Teste real como aluna: app do Claude → aba Code → Downloads → mensagem do LEIA-PRIMEIRO.
3. Teste num PC sem placa de vídeo e num Windows limpo (sem Edge customizado, sem chrome-headless-shell em ~/.cache).

## Como testar daqui
- `./montar-teste.sh` monta a skill em `C:\Users\Usuario\AppData\Local\Temp\vop-teste\videos-opus` (binários + kit).
- Rodar: `"<skill>/bin/node.exe" "$(wslpath -w <skill>/scripts/video.mjs)" <comando>`.
- Pasta de trabalho do kit: `C:\Users\Usuario\AppData\Local\videos-opus\kit` (projetos teste-celular, teste-colagem,
  teste-explicativo, teste-editorial, teste-anuncio).
- Vídeos de teste gerados em `Desktop\Vídeos editados` (podem ser apagados).
