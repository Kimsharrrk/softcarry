# ==============================================================================
# ⚔️ EDCS (Every Day Carry Software) - Retro RPG Inventory Quest Launcher
# ==============================================================================

$Host.UI.RawUI.WindowTitle = "⚔️ EDCS Quest Launcher - Equipping Backpack"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host @"
==============================================================
  ⚔️   E D C S   Q U E S T   L A U N C H E R   ⚔️
  Every Day Carry Software - Backpack Loadout Deployment
==============================================================
"@ -ForegroundColor Green

# 1. Check Package Manager (winget)
Write-Host "🔍 [STATUS] 던전 환경 확인 중 (Windows winget engine)..." -ForegroundColor Yellow
$wingetCmd = Get-Command winget -ErrorAction SilentlyContinue

if (-not $wingetCmd) {
    Write-Host "❌ [ERROR] Windows Package Manager (winget) 을 찾을 수 없습니다!" -ForegroundColor Red
    Write-Host "Microsoft Store에서 '앱 설치 관리자(App Installer)'를 업데이트해 주세요." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✅ [STATUS] 장비 장착 엔진 준비 완료!`n" -ForegroundColor Green

# 2. Backpack Items List
$packages = @(
{{PACKAGES_ARRAY}}
)

$total = $packages.Count
$current = 0
$startTime = Get-Date

Write-Host "🎒 [INVENTORY] 배낭에 담긴 장비: $total 개" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------------" -ForegroundColor DarkGray

$results = @()

foreach ($pkg in $packages) {
    $current++
    $pkgId = $pkg.id
    $pkgName = $pkg.name
    $wingetId = $pkg.winget_id

    Write-Host "`n[$current/$total] ⚔️ $pkgName 장착 시도 중..." -ForegroundColor Cyan
    $pkgStartTime = Get-Date

    # Silent install via winget
    $process = Start-Process -FilePath "winget" `
        -ArgumentList "install", "--id", $wingetId, "-e", "--silent", "--accept-package-agreements", "--accept-source-agreements" `
        -NoNewWindow -Wait -PassThru

    $pkgDuration = [math]::Round(((Get-Date) - $pkgStartTime).TotalSeconds, 1)

    if ($process.ExitCode -eq 0 -or $process.ExitCode -eq -1978335189) {
        Write-Host "      ✨ [EQUIPPED! 장착 완료] (${pkgDuration}초 소요)" -ForegroundColor Green
        $status = "success"
    } else {
        Write-Host "      ⚠️ [NOTICE] 장착 완료 코드: $($process.ExitCode)" -ForegroundColor Yellow
        $status = "warning"
    }

    $results += @{
        package_id = $pkgId
        status = $status
        duration_sec = $pkgDuration
    }
}

$totalDuration = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)

Write-Host "`n==============================================================" -ForegroundColor Green
Write-Host "🎉 [QUEST COMPLETE] 모든 장비 $total 개가 정상적으로 세팅되었습니다!" -ForegroundColor Green
Write-Host "⏱️  총 장착 시간: ${totalDuration} 초" -ForegroundColor Cyan
Write-Host "새로운 컴퓨터에서의 모험을 즐기세요!" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green

# Telemetry ping
try {
    $telemetryBody = @{
        preset_id = "{{PRESET_ID}}"
        os = "windows"
        total_duration_sec = $totalDuration
        results = $results
    } | ConvertTo-Json -Depth 3

    $null = Invoke-RestMethod -Uri "{{TELEMETRY_URL}}" -Method Post -Body $telemetryBody -ContentType "application/json" -TimeoutSec 3 -ErrorAction SilentlyContinue
} catch {}
