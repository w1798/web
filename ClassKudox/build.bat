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
echo [1/18] utils.js
%ESBUILD% utils.js %OPTS% --outfile=dist\utils.js
if errorlevel 1 goto :error

echo [2/18] state.js
%ESBUILD% state.js %OPTS% --outfile=dist\state.js
if errorlevel 1 goto :error

echo [3/18] sync.js
%ESBUILD% sync.js %OPTS% --outfile=dist\sync.js
if errorlevel 1 goto :error

echo [4/18] actions.js
%ESBUILD% actions.js %OPTS% --outfile=dist\actions.js
if errorlevel 1 goto :error

echo [5/18] ui.js
%ESBUILD% ui.js %OPTS% --outfile=dist\ui.js
if errorlevel 1 goto :error

echo [6/18] init-ui.js
%ESBUILD% init-ui.js %OPTS% --outfile=dist\init-ui.js
if errorlevel 1 goto :error

echo [7/18] updater.js
%ESBUILD% updater.js %OPTS% --outfile=dist\updater.js
if errorlevel 1 goto :error

echo [8/18] context.js
%ESBUILD% context.js %JSX_FLAGS% %OPTS% --outfile=dist\context.js
if errorlevel 1 goto :error

echo [9/18] components\Header.js
%ESBUILD% components\Header.js %JSX_FLAGS% %OPTS% --outfile=dist\components\Header.js
if errorlevel 1 goto :error

echo [10/18] components\StudentGrid.js
%ESBUILD% components\StudentGrid.js %JSX_FLAGS% %OPTS% --outfile=dist\components\StudentGrid.js
if errorlevel 1 goto :error

echo [11/18] components\GroupGrid.js
%ESBUILD% components\GroupGrid.js %JSX_FLAGS% %OPTS% --outfile=dist\components\GroupGrid.js
if errorlevel 1 goto :error

echo [12/18] components\MultiSelectBar.js
%ESBUILD% components\MultiSelectBar.js %JSX_FLAGS% %OPTS% --outfile=dist\components\MultiSelectBar.js
if errorlevel 1 goto :error

echo [13/18] components\Modals.js
%ESBUILD% components\Modals.js %JSX_FLAGS% %OPTS% --outfile=dist\components\Modals.js
if errorlevel 1 goto :error

echo [14/18] components\Settings.js
%ESBUILD% components\Settings.js %JSX_FLAGS% %OPTS% --outfile=dist\components\Settings.js
if errorlevel 1 goto :error

echo [15/18] components\Reports.js
%ESBUILD% components\Reports.js %JSX_FLAGS% %OPTS% --outfile=dist\components\Reports.js
if errorlevel 1 goto :error

echo [16/18] script.js
%ESBUILD% script.js %JSX_FLAGS% %OPTS% --outfile=dist\script.js
if errorlevel 1 goto :error

echo [17/18] style.css
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
