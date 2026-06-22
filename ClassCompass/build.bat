@echo off
chcp 65001 >nul
setlocal

:: Detect esbuild path
set ESBUILD_BIN=esbuild
where %ESBUILD_BIN% >nul 2>nul
if %errorlevel% neq 0 (
    set ESBUILD_BIN=D:\portable\esbuild.exe
)

:: Create dist directory
if not exist "dist" mkdir "dist"

echo [+] [ClassCompass] Building...

:: Build script.js (React JSX)
%ESBUILD_BIN% "script.js" --outfile="dist/script.js" --minify --charset=utf8 --jsx=transform --loader:.js=jsx

:: AVOID USING > IN ECHO AS IT REDIRECTS OUTPUT
echo [+] [ClassCompass] script.js build completed: dist/script.js

:: Copy and minify style.css to dist
%ESBUILD_BIN% "style.css" --outfile="dist/style.css" --minify
echo [+] [ClassCompass] style.css minified and copied to dist/

echo.
echo [OK] ClassCompass Build Success.
start index.html
