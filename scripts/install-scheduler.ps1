# Creates a Windows scheduled task to post daily at 1:00 PM (local time).
# Run once in PowerShell:  .\scripts\install-scheduler.ps1

$TaskName = "LinkedIn Daily Post"
$ProjectDir = Split-Path $PSScriptRoot -Parent
$BatchFile = Join-Path $PSScriptRoot "post-daily.bat"

$Action = New-ScheduledTaskAction -Execute $BatchFile -WorkingDirectory $ProjectDir
$Trigger = New-ScheduledTaskTrigger -Daily -At "13:00"
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force

Write-Host ""
Write-Host "Done! Task '$TaskName' will run daily at 1:00 PM."
Write-Host "Project: $ProjectDir"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  Test now:     npm run post-now"
Write-Host "  View task:    Get-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Run now:      Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Remove task:  Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
Write-Host "  Logs:         scripts\post-log.txt"
