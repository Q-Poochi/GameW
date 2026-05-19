@echo off
echo ========================================
echo   Noi Tu - Vietnamese Word Chain Game
echo   Starting servers...
echo ========================================
echo.

echo Starting Server on port 3001...
start "Game Server" cmd /k "cd /d %~dp0server && node index.js"

timeout /t 2 /nobreak > nul

echo Starting Client on port 5173...
start "Game Client" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ========================================
echo   Game is running!
echo   Open http://localhost:5173 in browser
echo ========================================
echo.
echo Press any key to close this window...
pause > nul
