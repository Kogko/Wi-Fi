#requires -Version 5.1
#requires -RunAsAdministrator

# สคริปต์สำหรับตั้งค่าให้ Wi-Fi Generator API รันอัตโนมัติเมื่อรีสตาร์ทเครื่อง

param (
    [string]$ProjectPath = "C:\Users\apisit_p\Holycrab\WIFI-GENER",
    [string]$TaskName = "WiFiGeneratorAPI"
)

Write-Host "=== ตั้งค่า Auto-Start สำหรับ Wi-Fi Generator API ===" -ForegroundColor Cyan

# ตรวจสอบว่า path ถูกต้อง
if (-not (Test-Path $ProjectPath)) {
    Write-Error "ไม่พบโฟลเดอร์: $ProjectPath"
    exit 1
}

# ตรวจสอบว่า node.js ติดตั้งอยู่
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Error "ไม่พบ Node.js กรุณาติดตั้ง Node.js ก่อน"
    exit 1
}

$nodeExe = $nodePath.Source
Write-Host "พบ Node.js: $nodeExe" -ForegroundColor Green

# ลบ task เดิม (ถ้ามี)
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "ลบ task เดิม: $TaskName" -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# สร้าง Scheduled Task ใหม่
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument "server.js" -WorkingDirectory $ProjectPath
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

try {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Wi-Fi Generator API - Auto start on boot" | Out-Null
    Write-Host "✓ สร้าง Scheduled Task สำเร็จ: $TaskName" -ForegroundColor Green
    Write-Host "  - รันอัตโนมัติเมื่อรีสตาร์ทเครื่อง" -ForegroundColor Gray
    Write-Host "  - Restart อัตโนมัติถ้า crash (สูงสุด 3 ครั้ง)" -ForegroundColor Gray
} catch {
    Write-Error "ไม่สามารถสร้าง Scheduled Task: $($_.Exception.Message)"
    exit 1
}

# ตรวจสอบ Firewall rule
Write-Host "`n=== ตรวจสอบ Firewall Rule ===" -ForegroundColor Cyan
$firewallRule = Get-NetFirewallRule -DisplayName "Allow Port 3000" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    Write-Host "สร้าง Firewall Rule สำหรับพอร์ต 3000..." -ForegroundColor Yellow
    New-NetFirewallRule -DisplayName "Allow Port 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow | Out-Null
    Write-Host "✓ สร้าง Firewall Rule สำเร็จ" -ForegroundColor Green
} else {
    Write-Host "✓ Firewall Rule มีอยู่แล้ว" -ForegroundColor Green
}

Write-Host "`n=== สรุป ===" -ForegroundColor Cyan
Write-Host "✓ Scheduled Task: $TaskName" -ForegroundColor Green
Write-Host "✓ Firewall Rule: Allow Port 3000" -ForegroundColor Green
Write-Host "`nหลังจากรีสตาร์ทเครื่อง API จะรันอัตโนมัติที่: http://localhost:3000" -ForegroundColor Yellow
Write-Host "`nหมายเหตุ: IP address อาจเปลี่ยนหลังรีสตาร์ท (ถ้าใช้ DHCP)" -ForegroundColor Yellow
Write-Host "  ตรวจสอบ IP ใหม่ด้วย: ipconfig | findstr IPv4" -ForegroundColor Gray

