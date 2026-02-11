@echo off
echo Installing dependencies...
call npx pnpm install
echo.
echo Building shared package...
call npx pnpm --filter @catan/shared build
echo.
echo Starting server and client...
start "Catan Server" cmd /k "npx pnpm --filter @catan/server dev"
timeout /t 3 /nobreak >nul
start "Catan Client" cmd /k "npx pnpm --filter @catan/client dev"
echo.
echo Server running on http://localhost:3001
echo Client running on http://localhost:5173
echo.
echo Open http://localhost:5173 in your browser to play!
pause
