@echo off
title Configurar Auto-Start do Bot no Windows
echo ========================================================
echo   CONFIGURANDO INICIALIZACAO AUTOMATICA COM O WINDOWS
echo ========================================================
echo.

set SCRIPT_PATH=%~dp0iniciar_segundo_plano.vbs
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\RikeozinhoBot.lnk

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%SCRIPT_PATH%\"'; $s.WorkingDirectory = '%~dp0'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [SUCESSO] O Bot rikeozinho agora vai ligar automaticamente sempre que voce ligar o computador!
    echo.
    echo Ele roda de forma 100%% invisivel consumindo apenas 23MB de memoria.
) else (
    echo [AVISO] Nao foi possivel criar o atalho automaticamente.
)

echo.
pause
