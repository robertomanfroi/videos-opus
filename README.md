# Vídeos Opus — edite seus vídeos com o Claude

Uma skill para o Claude que edita os vídeos que você grava no celular: corta as pausas, põe legenda, faz edição viral, edita em 5 estilos completos (celular, editorial, explicativo, colagem e anúncio), cria vídeos animados, muda o formato e deixa o vídeo leve para o WhatsApp.

Tudo roda no seu computador. Você instala uma vez e não precisa instalar mais nada: os programas de vídeo já vêm dentro do pacote.

## O que você precisa

- Computador com **Windows 10 ou 11** e uns 3 GB livres
- O **app do Claude** instalado ([claude.ai/download](https://claude.ai/download)), com plano **Pro ou acima** (a aba **Code** não existe no plano gratuito)

## Como instalar (uma vez só)

1. Abra o app do Claude e clique na aba **Code**.
2. Na caixa de mensagem, no seletor **Environment**, escolha **Local** (e não Cloud). Se ele pedir uma pasta, escolha **Downloads**.
3. Copie esta mensagem, cole no Claude e envie:

   ```
   Instala a skill videos-opus seguindo as instruções de https://github.com/robertomanfroi/videos-opus
   ```

4. Quando o Claude pedir permissão, clique em **Permitir**.
5. Quando ele disser que deu certo, abra uma **conversa nova**. Pronto.

## Como usar

Na aba Code (ambiente **Local**), peça do seu jeito:

- *Corta as pausas e põe legenda no meu último vídeo*
- *Faz uma edição viral do vídeo que está nos Downloads*
- *Edita meu último vídeo no estilo celular* (ou editorial, explicativo, colagem, anúncio)
- *Cria um vídeo animado de 15 segundos da minha oferta*
- *Diminui o vídeo para eu mandar no WhatsApp*

O vídeo pronto aparece na pasta **Vídeos editados**, na sua Área de Trabalho.

---

## Para o Claude: como instalar esta skill

Se a pessoa pediu para instalar esta skill, faça exatamente isto, sem pedir que ela faça nada além de clicar em Permitir:

1. **Confira o ambiente.** A skill só funciona numa sessão **Local** no Windows (ela edita arquivos do computador da pessoa). Se você estiver num container na nuvem (sem `C:\`, sem Windows, rede restrita), pare e diga, em português simples: "Esta conversa está rodando na nuvem. Abra uma conversa nova na aba Code com o seletor Environment em **Local** e mande a mesma mensagem."
2. **Baixe o pacote** (uns 390 MB) com o curl do Windows:
   ```
   curl.exe -L -o "%USERPROFILE%\Downloads\videos-opus.zip" https://github.com/robertomanfroi/videos-opus/releases/latest/download/videos-opus.zip
   ```
   (PowerShell: troque `%USERPROFILE%` por `$env:USERPROFILE`.)
3. **Instale** em `%USERPROFILE%\.claude\skills\videos-opus`:
   - crie `%USERPROFILE%\.claude\skills` se não existir;
   - se já existir uma pasta `videos-opus` ali (versão antiga), apague-a;
   - descompacte com o **tar** do Windows, que leva segundos (não use Expand-Archive nem "Extrair tudo": com os 7.500 arquivos do pacote eles levam mais de meia hora):
     ```
     tar -xf "%USERPROFILE%\Downloads\videos-opus.zip" -C "%USERPROFILE%\.claude\skills" videos-opus
     ```
4. **Teste:**
   ```
   "%USERPROFILE%\.claude\skills\videos-opus\bin\node.exe" "%USERPROFILE%\.claude\skills\videos-opus\scripts\video.mjs" diagnostico
   ```
   Todos os itens devem dizer `ok`. Se algum falhar, mostre à pessoa qual foi.
5. **Termine** dizendo que deu certo e que ela deve abrir uma conversa nova para usar. Pode apagar o zip de Downloads se ela concordar.

Não altere nenhum arquivo do pacote.

---

## Para quem mantém o projeto

- `skill/videos-opus/` — a skill (SKILL.md e scripts). `kit/` — motor dos 5 estilos (adaptado da Edição Automática de Vídeo).
- `./empacotar.sh` gera `dist/videos-opus.zip` com os programas portáteis (FFmpeg, Node, whisper.cpp, modelos e o kit compilado para Windows), que ficam fora do git em `vendor-cache/`.
- Cada versão é publicada como **Release** com o arquivo `videos-opus.zip`; o link `releases/latest/download/videos-opus.zip` sempre aponta para a mais nova.
- Licenças dos programas incluídos: pasta `licencas/` dentro do pacote.
