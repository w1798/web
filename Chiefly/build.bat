@echo off
SET ESBUILD=D:\portable\esbuild.exe
IF NOT EXIST dist mkdir dist

echo Building Chiefly...
%ESBUILD% script.js logic.js --bundle --minify --outfile=dist/bundle.js --platform=browser
echo Done.
pause
