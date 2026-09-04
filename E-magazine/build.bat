@echo off
setlocal
echo ======================================
echo   E-magazine - Build System
echo ======================================

set ESBUILD=D:\portable\esbuild.exe
set JSX_FLAGS=--jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --loader:.js=jsx
set OPTS=--minify --charset=utf8

if not exist dist mkdir dist

echo.
echo [1/3] Compiling Logic (pure JS)...
%ESBUILD% logic.js %OPTS% --outfile=dist\logic.js
if errorlevel 1 goto :error

echo [2/3] Compiling UI (script.js)...
%ESBUILD% script.js %JSX_FLAGS% %OPTS% --outfile=dist\script.js
if errorlevel 1 goto :error

echo [3/3] Minifying Styles...
%ESBUILD% style.css --minify --outfile=dist\style.css
if errorlevel 1 goto :error

echo.
echo ======================================
echo   Build Successful! (Saved to /dist)
echo ======================================

call index.html
exit /b 0

:error
echo.
echo [ERROR] Build failed.
pause
exit /b 1
