@echo off
chcp 65001 >nul
setlocal
title Instalando a skill Vídeos Opus
rem Instalador da skill Vídeos Opus (https://github.com/robertomanfroi/videos-opus)
rem Vídeos Opus (c) 2026 Suellen Warmling. Todos os direitos reservados. Proibido copiar, revender ou distribuir.
rem O que ele faz: baixa o pacote da página de Releases do GitHub, descompacta em
rem %USERPROFILE%\.claude\skills\videos-opus (substituindo a versão antiga) e testa.
rem Não pede senha de administrador e não mexe em nada fora dessa pasta.

set "DESTINO=%USERPROFILE%\.claude\skills"
if defined VIDEOS_OPUS_DESTINO set "DESTINO=%VIDEOS_OPUS_DESTINO%"
set "ZIP=%USERPROFILE%\Downloads\videos-opus.zip"
rem só para testes automáticos: VIDEOS_OPUS_SEM_PAUSA=1 pula o "pressione qualquer tecla"
set "PAUSA=pause"
set "AVISO="
set "PASTA=%DESTINO%\videos-opus"
if defined VIDEOS_OPUS_SEM_PAUSA set "PAUSA=rem"
set "URL=https://github.com/robertomanfroi/videos-opus/releases/latest/download/videos-opus.zip"
rem só para testes: VIDEOS_OPUS_URL=file:///C:/caminho/videos-opus.zip
if defined VIDEOS_OPUS_URL set "URL=%VIDEOS_OPUS_URL%"

echo.
echo  ==============================================
echo    VÍDEOS OPUS  -  edite seus vídeos com o Claude
echo    Propriedade de Suellen Warmling. Todos os direitos reservados.
echo    Proibido copiar, revender ou distribuir sem autorização.
echo  ==============================================
echo.
echo  1/3  Baixando o pacote (uns 390 MB). Pode levar alguns minutos...
echo.
if not exist "%USERPROFILE%\Downloads" mkdir "%USERPROFILE%\Downloads"
rem precisa de uns 3 GB: o zip (390 MB), o pacote aberto (750 MB) e a versão antiga até a nova entrar
set "LIVRE="
for /f %%G in ('powershell -NoProfile -Command "[math]::Floor((Get-PSDrive -Name $env:USERPROFILE.Substring(0,1)).Free/1GB)" 2^>nul') do set "LIVRE=%%G"
if defined LIVRE if %LIVRE% LSS 3 goto erro_espaco
set "CODIGO="
where curl.exe >nul 2>&1
if errorlevel 1 goto baixar_powershell
curl.exe -L --fail --retry 3 --retry-delay 5 --progress-bar -o "%ZIP%" "%URL%"
set "CODIGO=%errorlevel%"
if "%CODIGO%"=="0" goto baixado
if "%CODIGO%"=="23" goto erro_espaco
rem 35: antivírus que inspeciona a conexão segura quebra a checagem do certificado; tenta sem a checagem de revogação
if not "%CODIGO%"=="35" goto erro_download
curl.exe -L --fail --retry 3 --retry-delay 5 --ssl-no-revoke --progress-bar -o "%ZIP%" "%URL%"
set "CODIGO=%errorlevel%"
if "%CODIGO%"=="0" goto baixado
if "%CODIGO%"=="23" goto erro_espaco
goto erro_download
:baixar_powershell
rem Windows 10 antigo, sem o curl
set "CODIGO=sem curl"
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol='Tls12'; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -OutFile '%ZIP%'"
if errorlevel 1 goto erro_download
:baixado

echo.
echo  2/3  Instalando...
if not exist "%DESTINO%" mkdir "%DESTINO%"
rem a versão antiga sai do caminho primeiro (fora da pasta de skills, para o Claude não ver duas) e só é apagada depois que a nova entrou;
rem se não der para mover, algum programa está usando os arquivos dela
for /d %%D in ("%DESTINO%\..\videos-opus-antigo-*") do rmdir /s /q "%%D" >nul 2>&1
set "ANTIGO="
if not exist "%DESTINO%\videos-opus" goto extrair
set "ANTIGO=%DESTINO%\..\videos-opus-antigo-%RANDOM%"
move "%DESTINO%\videos-opus" "%ANTIGO%" >nul 2>&1
if not errorlevel 1 goto extrair
timeout /t 5 /nobreak >nul
move "%DESTINO%\videos-opus" "%ANTIGO%" >nul 2>&1
if errorlevel 1 goto erro_em_uso
:extrair
tar -xf "%ZIP%" -C "%DESTINO%" videos-opus
if errorlevel 1 goto erro_extrair
if defined ANTIGO rmdir /s /q "%ANTIGO%" >nul 2>&1
del /q "%ZIP%" >nul 2>&1

echo  3/3  Testando...
"%DESTINO%\videos-opus\bin\node.exe" "%DESTINO%\videos-opus\scripts\video.mjs" diagnostico > "%DESTINO%\videos-opus\diagnostico.txt" 2>&1
findstr /c:"\"ok\": true" "%DESTINO%\videos-opus\diagnostico.txt" >nul
if not errorlevel 1 goto teste_ok
rem só o navegador falhou (antivírus): instala assim mesmo e avisa no fim
findstr /c:"\"so_navegador\": true" "%DESTINO%\videos-opus\diagnostico.txt" >nul
if errorlevel 1 goto erro_teste
set "AVISO=1"
:teste_ok

echo.
echo  ==============================================
echo    PRONTO! A skill Vídeos Opus está instalada.
echo    Vídeos Opus é propriedade de Suellen Warmling.
echo  ==============================================
echo.
if defined AVISO call :aviso_navegador
echo  Agora abra o app do Claude, aba Code, com o ambiente Local,
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

:erro_espaco
echo.
del /q "%ZIP%" >nul 2>&1
echo  Pouco espaço no disco: precisa de uns 3 GB livres.
echo  Esvazie a Lixeira e apague vídeos grandes de Downloads, depois rode de novo.
echo.
%PAUSA%
exit /b 1

:erro_em_uso
echo.
echo  A versão anterior do Vídeos Opus está aberta em algum programa.
echo  Feche o app do Claude (e o do Codex, se usar), espere uns segundos e rode este instalador de novo.
echo  Se continuar, reinicie o computador e rode de novo.
echo.
%PAUSA%
exit /b 1

:erro_extrair
if exist "%DESTINO%\videos-opus" rmdir /s /q "%DESTINO%\videos-opus" >nul 2>&1
if defined ANTIGO move "%ANTIGO%" "%DESTINO%\videos-opus" >nul 2>&1
echo.
echo  Não consegui descompactar o pacote. Confira se há uns 3 GB livres no disco e rode de novo.
if defined ANTIGO echo  A versão que você já tinha continua instalada.
echo.
%PAUSA%
exit /b 1

:erro_download
echo.
del /q "%ZIP%" >nul 2>&1
echo  Não consegui baixar o pacote (código %CODIGO%). Confira a internet e rode de novo.
echo  Se a internet estiver funcionando, mande uma foto desta tela para o suporte.
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
