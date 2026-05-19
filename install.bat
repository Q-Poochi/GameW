@echo off
echo ========================================
echo   Noi Tu - Vietnamese Word Chain Game
echo   Installing dependencies...
echo ========================================
echo.

echo [1/2] Installing SERVER dependencies...
cd /d "%~dp0server"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Server install failed!
    pause
    exit /b 1
)
echo Server dependencies installed OK!
echo.

echo [2/2] Installing CLIENT dependencies...
cd /d "%~dp0client"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Client install failed!
    pause
    exit /b 1
)
echo Client dependencies installed OK!
echo.

echo ========================================
echo   All dependencies installed!
echo   Run start.bat to start the game.
echo ========================================
pause
