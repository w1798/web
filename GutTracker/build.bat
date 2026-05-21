@echo off
echo ======================================
echo   GutTracker - esbuild
echo ======================================

set ESBUILD=D:\portable\esbuild.exe
set F1=--jsx=transform
set F2=--jsx-factory=React.createElement
set F3=--jsx-fragment=React.Fragment
set F4=--loader:.js=jsx
set F5=--minify

if not exist dist mkdir dist
if not exist dist\pages mkdir dist\pages

echo.
echo [1/7] db.js
%ESBUILD% db.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\db.js
if errorlevel 1 goto :error

echo [2/7] context.js
%ESBUILD% context.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\context.js
if errorlevel 1 goto :error

echo [3/7] DietPage.js
%ESBUILD% pages\DietPage.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\pages\DietPage.js
if errorlevel 1 goto :error

echo [4/7] BowelPage.js
%ESBUILD% pages\BowelPage.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\pages\BowelPage.js
if errorlevel 1 goto :error

echo [5/7] AnalysisPage.js
%ESBUILD% pages\AnalysisPage.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\pages\AnalysisPage.js
if errorlevel 1 goto :error

echo [6/7] SettingsPage.js
%ESBUILD% pages\SettingsPage.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\pages\SettingsPage.js
if errorlevel 1 goto :error

echo [7/7] script.js
%ESBUILD% script.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\script.js
if errorlevel 1 goto :error

echo.
echo ======================================
echo   Done!
echo ======================================
pause
exit /b 0

:error
echo [ERROR] Build failed.
pause
exit /b 1
