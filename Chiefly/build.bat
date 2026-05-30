@echo off
SET ESBUILD=D:\portable\esbuild.exe
IF NOT EXIST dist mkdir dist

echo Building Chiefly...
%ESBUILD% logic.js --minify --outfile=dist/vanilla.js --platform=browser
if errorlevel 1 goto :error

%ESBUILD% script.js --minify --outfile=dist/script.js --platform=browser --loader:.js=jsx
if errorlevel 1 goto :error

echo.
echo ======================================
echo   Done!
echo ======================================

call index.html
exit /b 0

:error
echo [ERROR] Build failed.
pause
exit /b 1