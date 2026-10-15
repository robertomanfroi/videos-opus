# Vídeos Opus — edite seus vídeos com o Claude

Uma skill para o Claude que edita os vídeos que você grava no celular: corta as pausas, põe legenda, faz edição viral, edita em 5 estilos completos (celular, editorial, explicativo, colagem e anúncio), cria vídeos animados, muda o formato e deixa o vídeo leve para o WhatsApp.

Tudo roda no seu computador. Você instala uma vez e não precisa instalar mais nada: os programas de vídeo já vêm dentro do pacote.

## O que você precisa

- Computador com **Windows 10 ou 11** e uns 3 GB livres
- O **app do Claude** instalado ([claude.ai/download](https://claude.ai/download)), com plano **Pro ou acima** (a aba **Code** não existe no plano gratuito)

## Como instalar (uma vez só, uns 2 minutos)

1. Aperte as teclas **Windows + R** ao mesmo tempo. Abre a janelinha **Executar**.
2. Copie a linha abaixo, cole nessa janela e aperte **Enter**:

   ```
   cmd /c "cd /d %USERPROFILE%\Downloads && curl -sLO https://github.com/robertomanfroi/videos-opus/releases/latest/download/instalar.cmd && instalar.cmd"
   ```

3. Abre uma janela preta que baixa e instala tudo sozinha. Espere aparecer **PRONTO** e aperte qualquer tecla.

Para atualizar no futuro, é só repetir a mesma linha.

**O que o instalador faz** ([instalar.cmd](instalar.cmd), texto simples, dá para ler antes): baixa o pacote `videos-opus.zip` da página de [Releases](https://github.com/robertomanfroi/videos-opus/releases) deste repositório, descompacta em `%USERPROFILE%\.claude\skills\videos-opus` (substituindo a versão anterior), apaga o zip e roda um teste. Não pede senha de administrador e não mexe em mais nada do computador.

## Como usar

Abra o app do Claude, aba **Code**, com o seletor **Environment** em **Local**, e peça do seu jeito:

- *Corta as pausas e põe legenda no meu último vídeo*
- *Faz uma edição viral do vídeo que está nos Downloads*
- *Edita meu último vídeo no estilo celular* (ou editorial, explicativo, colagem, anúncio)
- *Cria um vídeo animado de 15 segundos da minha oferta*
- *Diminui o vídeo para eu mandar no WhatsApp*

O vídeo pronto aparece na pasta **Vídeos editados**, na sua Área de Trabalho.

---

## Para quem mantém o projeto

- `skill/videos-opus/` — a skill (SKILL.md e scripts). `kit/` — motor dos 5 estilos (adaptado da Edição Automática de Vídeo).
- `./empacotar.sh` gera `dist/videos-opus.zip` com os programas portáteis (FFmpeg, Node, whisper.cpp, modelos e o kit compilado para Windows), que ficam fora do git em `vendor-cache/`.
- Cada versão é publicada como **Release** com os arquivos `videos-opus.zip` e `instalar.cmd` (`gh release create vX.Y.Z dist/videos-opus.zip instalar.cmd`); os links `releases/latest/download/...` sempre apontam para a mais nova.
- Licenças dos programas incluídos: pasta `licencas/` dentro do pacote.
