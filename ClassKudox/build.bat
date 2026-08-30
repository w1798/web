@echo off
setlocal
echo ======================================
echo   ClassKudox - esbuild
echo ======================================

set ESBUILD=D:\portable\esbuild.exe
set JSX_FLAGS=--jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --loader:.js=jsx
set OPTS=--minify --charset=utf8

if not exist dist mkdir dist
if not exist dist\components mkdir dist\components

echo.
echo [1/11] context.js
%ESBUILD% context.js %JSX_FLAGS% %OPTS% --outfile=dist\context.js
if errorlevel 1 goto :error

echo [2/11] components\Header.js
%ESBUILD% components\Header.js %JSX_FLAGS% %OPTS% --outfile=dist\components\Header.js
if errorlevel 1 goto :error

echo [3/11] components\StudentGrid.js
%ESBUILD% components\StudentGrid.js %JSX_FLAGS% %OPTS% --outfile=dist\components\StudentGrid.js
if errorlevel 1 goto :error

echo [4/11] components\GroupGrid.js
%ESBUILD% components\GroupGrid.js %JSX_FLAGS% %OPTS% --outfile=dist\components\GroupGrid.js
if errorlevel 1 goto :error

echo [5/11] components\MultiSelectBar.js
%ESBUILD% components\MultiSelectBar.js %JSX_FLAGS% %OPTS% --outfile=dist\components\MultiSelectBar.js
if errorlevel 1 goto :error

echo [6/11] components\Modals.js
%ESBUILD% components\Modals.js %JSX_FLAGS% %OPTS% --outfile=dist\components\Modals.js
if errorlevel 1 goto :error

echo [7/11] components\Settings.js
%ESBUILD% components\Settings.js %JSX_FLAGS% %OPTS% --outfile=dist\components\Settings.js
if errorlevel 1 goto :error

echo [8/11] components\Reports.js
%ESBUILD% components\Reports.js %JSX_FLAGS% %OPTS% --outfile=dist\components\Reports.js
if errorlevel 1 goto :error

echo [9/11] script.js
%ESBUILD% script.js %JSX_FLAGS% %OPTS% --outfile=dist\script.js
if errorlevel 1 goto :error

echo [10/11] vanilla.js
copy /b utils.js+state.js+sync.js+actions.js+ui.js+init-ui.js+updater.js dist\vanilla_raw.js
%ESBUILD% dist\vanilla_raw.js %OPTS% --outfile=dist\vanilla.js
del dist\vanilla_raw.js
if errorlevel 1 goto :error

echo [11/11] style.css
%ESBUILD% style.css --minify --charset=utf8 --outfile=dist\style.css
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
