# ==============================================================================
# 🧹 EDCS (Every Day Carry Software) - Windows Cleanup & Wipe Tool
# Removes software installed during this session (Ephemeral Mode)
# ==============================================================================

$Host.UI.RawUI.WindowTitle = "EDCS - Session Cleanup in Progress"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host @"
==============================================================
   ____ _     _____    _    _   _ _   _ ____  
  / ___| |   | ____|  / \  | \ | | | | |  _ \ 
 | |   | |   |  _|   / _ \ |  \| | | | | |_) |
 | |___| |___| |___ / ___ \| |\  | |_| |  __/ 
  \____|_____|_____/_/   \_\_| \_|\___/|_|    
  EDCS Ephemeral Session Cleaner - https://edcs.dev
==============================================================
"@ -ForegroundColor Yellow

$packages = @(
{{PACKAGES_ARRAY}}
)

$total = $packages.Count
$current = 0

Write-Host "`n🧹 Removing $total session apps..." -ForegroundColor Cyan
Write-Host "--------------------------------------------------------------"

foreach ($pkg in $packages) {
    $current++
    $pkgName = $pkg.name
    $wingetId = $pkg.winget_id

    Write-Host "`n[$current/$total] 🗑️ Uninstalling $pkgName ($wingetId)..." -ForegroundColor Magenta

    $process = Start-Process -FilePath "winget" `
        -ArgumentList "uninstall", "--id", $wingetId, "-e", "--silent", "--accept-source-agreements" `
        -NoNewWindow -Wait -PassThru

    if ($process.ExitCode -eq 0) {
        Write-Host "✅ Successfully removed $pkgName" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Uninstall finished with code $($process.ExitCode) for $pkgName" -ForegroundColor Yellow
    }
}

Write-Host "`n==============================================================" -ForegroundColor Green
Write-Host "🎉 Cleanup Complete! All session software removed safely." -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
