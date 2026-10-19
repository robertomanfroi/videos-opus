@echo off
chcp 65001 >nul
setlocal
title Instalando a skill Vídeos Opus no Codex
rem Instalador da skill Vídeos Opus PARA O CODEX (app do ChatGPT para tarefas no computador)
rem Vídeos Opus (c) 2026 Suellen Warmling. Todos os direitos reservados. Proibido copiar, revender ou distribuir.
rem (https://github.com/robertomanfroi/videos-opus). O instalador do Claude é outro arquivo e não é afetado.
rem O que ele faz: baixa o pacote da página de Releases do GitHub, descompacta em
rem %LOCALAPPDATA%\videos-opus\pacote e grava só o SKILL.md em %USERPROFILE%\.codex\skills\videos-opus
rem (o Codex varre as subpastas das skills; o pacote tem milhares de arquivos). Depois testa.
rem Não pede senha de administrador e não mexe em nada fora dessa pasta.

if defined CODEX_HOME (set "DESTINO=%CODEX_HOME%\skills") else (set "DESTINO=%USERPROFILE%\.codex\skills")
if defined VIDEOS_OPUS_DESTINO set "DESTINO=%VIDEOS_OPUS_DESTINO%"
set "PACOTE=%LOCALAPPDATA%\videos-opus\pacote"
if defined VIDEOS_OPUS_PACOTE set "PACOTE=%VIDEOS_OPUS_PACOTE%"
set "ZIP=%USERPROFILE%\Downloads\videos-opus-codex-tmp.zip"
rem só para testes automáticos: VIDEOS_OPUS_SEM_PAUSA=1 pula o "pressione qualquer tecla"
set "PAUSA=pause"
set "AVISO="
set "PASTA=%PACOTE%\videos-opus"
if defined VIDEOS_OPUS_SEM_PAUSA set "PAUSA=rem"
set "URL=https://github.com/robertomanfroi/videos-opus/releases/latest/download/videos-opus.zip"
rem só para testes: VIDEOS_OPUS_URL=file:///C:/caminho/videos-opus.zip
if defined VIDEOS_OPUS_URL set "URL=%VIDEOS_OPUS_URL%"

echo.
echo  ==============================================
echo    VÍDEOS OPUS  -  edite seus vídeos com o Codex
echo    Propriedade de Suellen Warmling. Todos os direitos reservados.
echo    Proibido copiar, revender ou distribuir sem autorização.
echo  ==============================================
echo.
echo  1/3  Baixando o pacote (uns 390 MB). Pode levar alguns minutos...
echo.
if not exist "%USERPROFILE%\Downloads" mkdir "%USERPROFILE%\Downloads"
curl.exe -L --fail --progress-bar -o "%ZIP%" "%URL%"
if errorlevel 1 goto erro_download

echo.
echo  2/3  Instalando...
if not exist "%PACOTE%" mkdir "%PACOTE%"
if exist "%PACOTE%\videos-opus" rmdir /s /q "%PACOTE%\videos-opus"
tar -xf "%ZIP%" -C "%PACOTE%" videos-opus
if errorlevel 1 goto erro_instalar
del /q "%ZIP%" >nul 2>&1

echo  3/3  Testando...
"%PACOTE%\videos-opus\bin\node.exe" "%PACOTE%\videos-opus\scripts\video.mjs" diagnostico > "%PACOTE%\videos-opus\diagnostico.txt" 2>&1
findstr /c:"\"ok\": true" "%PACOTE%\videos-opus\diagnostico.txt" >nul
if not errorlevel 1 goto teste_ok
rem só o navegador falhou (antivírus): instala assim mesmo e avisa no fim
findstr /c:"\"so_navegador\": true" "%PACOTE%\videos-opus\diagnostico.txt" >nul
if errorlevel 1 goto erro_teste
set "AVISO=1"
:teste_ok
rem na pasta de skills do Codex vai só o SKILL.md, apontando para o pacote
if exist "%DESTINO%\videos-opus" rmdir /s /q "%DESTINO%\videos-opus"
"%PACOTE%\videos-opus\bin\node.exe" "%PACOTE%\videos-opus\scripts\instalar-codex.mjs" "%DESTINO%\videos-opus" >nul
if errorlevel 1 goto erro_instalar

echo.
echo  ==============================================
echo    PRONTO! A skill Vídeos Opus está instalada.
echo    Vídeos Opus é propriedade de Suellen Warmling.
echo  ==============================================
echo.
if defined AVISO call :aviso_navegador
echo  Agora FECHE e abra de novo o app do Codex, escolha uma pasta (por exemplo, Downloads)
echo  e peça, por exemplo: "corta as pausas e põe legenda no meu último vídeo".
echo.
%PAUSA%
exit /b 0

:aviso_navegador
echo  ----------------------------------------------
echo    ATENÇÃO: o Windows ou o antivírus não deixou o Vídeos Opus
echo    abrir o navegador (Edge ou Chrome).
echo.
echo    Já funciona: cortar as pausas, pôr legenda e mudar o formato.
echo    Ainda não funciona: os estilos, os modelos, a edição viral
echo    e os vídeos animados.
echo.
echo    Para liberar tudo:
echo    1. Reinicie o computador e rode este instalador de novo.
echo    2. Se continuar, abra o seu antivírus e coloque esta pasta
echo       nas exceções (também chamadas de exclusões ou lista de permissões):
echo       %PASTA%
echo       Depois rode este instalador de novo.
echo    3. Se ainda assim aparecer este aviso, mande uma foto desta tela
echo       para o suporte, dizendo qual antivírus você usa.
echo  ----------------------------------------------
echo.
goto :eof

:erro_download
echo.
echo  Não consegui baixar o pacote. Confira a internet e rode de novo.
echo.
%PAUSA%
exit /b 1

:erro_instalar
echo.
echo  Não consegui descompactar. Confira se há uns 3 GB livres no disco e rode de novo.
echo.
%PAUSA%
exit /b 1

:erro_teste
echo.
echo  O pacote foi baixado, mas o teste encontrou um problema:
type "%PACOTE%\videos-opus\diagnostico.txt"
echo.
echo  Mande uma foto desta tela para o suporte.
echo.
%PAUSA%
exit /b 1
