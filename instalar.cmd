@echo off
chcp 65001 >nul
setlocal
title Instalando a skill Vídeos Opus
rem Instalador da skill Vídeos Opus (https://github.com/robertomanfroi/videos-opus)
rem O que ele faz: baixa o pacote da página de Releases do GitHub, descompacta em
rem %USERPROFILE%\.claude\skills\videos-opus (substituindo a versão antiga) e testa.
rem Não pede senha de administrador e não mexe em nada fora dessa pasta.

set "DESTINO=%USERPROFILE%\.claude\skills"
if defined VIDEOS_OPUS_DESTINO set "DESTINO=%VIDEOS_OPUS_DESTINO%"
set "ZIP=%USERPROFILE%\Downloads\videos-opus.zip"
rem só para testes automáticos: VIDEOS_OPUS_SEM_PAUSA=1 pula o "pressione qualquer tecla"
set "PAUSA=pause"
if defined VIDEOS_OPUS_SEM_PAUSA set "PAUSA=rem"
set "URL=https://github.com/robertomanfroi/videos-opus/releases/latest/download/videos-opus.zip"

echo.
echo  ==============================================
echo    VÍDEOS OPUS  -  edite seus vídeos com o Claude
echo  ==============================================
echo.
echo  1/3  Baixando o pacote (uns 390 MB). Pode levar alguns minutos...
echo.
if not exist "%USERPROFILE%\Downloads" mkdir "%USERPROFILE%\Downloads"
curl.exe -L --fail --progress-bar -o "%ZIP%" "%URL%"
if errorlevel 1 goto erro_download

echo.
echo  2/3  Instalando...
if not exist "%DESTINO%" mkdir "%DESTINO%"
if exist "%DESTINO%\videos-opus" rmdir /s /q "%DESTINO%\videos-opus"
tar -xf "%ZIP%" -C "%DESTINO%" videos-opus
if errorlevel 1 goto erro_instalar
del /q "%ZIP%" >nul 2>&1

echo  3/3  Testando...
"%DESTINO%\videos-opus\bin\node.exe" "%DESTINO%\videos-opus\scripts\video.mjs" diagnostico > "%DESTINO%\videos-opus\diagnostico.txt" 2>&1
findstr /c:"\"ok\": true" "%DESTINO%\videos-opus\diagnostico.txt" >nul
if errorlevel 1 goto erro_teste

echo.
echo  ==============================================
echo    PRONTO! A skill Vídeos Opus está instalada.
echo  ==============================================
echo.
echo  Agora abra o app do Claude, aba Code, com o ambiente Local,
echo  e peça, por exemplo: "corta as pausas e põe legenda no meu último vídeo".
echo.
%PAUSA%
exit /b 0

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
echo  A skill foi copiada, mas o teste encontrou um problema:
type "%DESTINO%\videos-opus\diagnostico.txt"
echo.
echo  Mande uma foto desta tela para o suporte.
echo.
%PAUSA%
exit /b 1
