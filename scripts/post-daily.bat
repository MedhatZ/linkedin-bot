@echo off
cd /d "%~dp0.."
call npm run post-now >> "%~dp0post-log.txt" 2>&1
echo [%date% %time%] Exit code: %ERRORLEVEL% >> "%~dp0post-log.txt"
