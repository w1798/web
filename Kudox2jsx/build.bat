@echo off
echo ======================================
echo   ClassKudox2 - esbuild
echo ======================================

set ESBUILD=D:\portable\esbuild.exe
set F1=--jsx=transform
set F2=--jsx-factory=React.createElement
set F3=--jsx-fragment=React.Fragment
set F4=--loader:.js=jsx
set F5=--minify

if not exist dist mkdir dist
if not exist dist\components mkdir dist\components

echo.
echo [1/10] context.js
%ESBUILD% context.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\context.js
if errorlevel 1 goto :error

echo [2/10] components\Header.js
%ESBUILD% components\Header.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\components\Header.js
if errorlevel 1 goto :error

echo [3/10] components\StudentGrid.js
%ESBUILD% components\StudentGrid.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\components\StudentGrid.js
if errorlevel 1 goto :error

echo [4/10] components\GroupGrid.js
%ESBUILD% components\GroupGrid.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\components\GroupGrid.js
if errorlevel 1 goto :error

echo [5/10] components\MultiSelectBar.js
%ESBUILD% components\MultiSelectBar.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\components\MultiSelectBar.js
if errorlevel 1 goto :error

echo [6/10] components\Modals.js
%ESBUILD% components\Modals.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\components\Modals.js
if errorlevel 1 goto :error

echo [7/10] components\Settings.js
%ESBUILD% components\Settings.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\components\Settings.js
if errorlevel 1 goto :error

echo [8/10] components\Reports.js
%ESBUILD% components\Reports.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\components\Reports.js
if errorlevel 1 goto :error

echo [9/10] script.js
%ESBUILD% script.js %F1% %F2% %F3% %F4% %F5% --outfile=dist\script.js
if errorlevel 1 goto :error

echo [10/10] vanilla.js
copy /b utils.js+state.js+sync.js+actions.js+ui.js+init-ui.js+updater.js dist\vanilla_raw.js
%ESBUILD% dist\vanilla_raw.js --minify --outfile=dist\vanilla.js
del dist\vanilla_raw.js
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
