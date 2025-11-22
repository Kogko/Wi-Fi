#requires -Version 5.1

# สคริปต์สำหรับตรวจสอบสถานะ Wi-Fi Generator API

Write-Host "=== ตรวจสอบสถานะ Wi-Fi Generator API ===" -ForegroundColor Cyan

# ตรวจสอบว่า server รันอยู่หรือไม่
Write-Host "`n1. ตรวจสอบพอร์ต 3000..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "   ✓ Server กำลังรันอยู่ (PID: $($port3000.OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "   ✗ Server ไม่ได้รันอยู่" -ForegroundColor Red
}

# ตรวจสอบ Scheduled Task
Write-Host "`n2. ตรวจสอบ Scheduled Task..." -ForegroundColor Yellow
$task = Get-ScheduledTask -TaskName "WiFiGeneratorAPI" -ErrorAction SilentlyContinue
if ($task) {
    $taskInfo = Get-ScheduledTaskInfo -TaskName "WiFiGeneratorAPI"
    Write-Host "   ✓ Task: WiFiGeneratorAPI" -ForegroundColor Green
    Write-Host "     State: $($task.State)" -ForegroundColor Gray
    Write-Host "     Last Run: $($taskInfo.LastRunTime)" -ForegroundColor Gray
    Write-Host "     Next Run: $($taskInfo.NextRunTime)" -ForegroundColor Gray
} else {
    Write-Host "   ✗ ไม่พบ Scheduled Task (รัน setup-auto-start.ps1 เพื่อสร้าง)" -ForegroundColor Red
}

# ตรวจสอบ Firewall
Write-Host "`n3. ตรวจสอบ Firewall Rule..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "Allow Port 3000" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "   ✓ Firewall Rule: Allow Port 3000" -ForegroundColor Green
    Write-Host "     Enabled: $($firewallRule.Enabled)" -ForegroundColor Gray
} else {
    Write-Host "   ✗ ไม่พบ Firewall Rule (รัน setup-auto-start.ps1 เพื่อสร้าง)" -ForegroundColor Red
}

# ตรวจสอบ IP Address
Write-Host "`n4. IP Address ปัจจุบัน..." -ForegroundColor Yellow
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 3
foreach ($ip in $ipAddresses) {
    Write-Host "   - $($ip.IPAddress) (Interface: $($ip.InterfaceAlias))" -ForegroundColor Gray
}

# ทดสอบ Health Check
Write-Host "`n5. ทดสอบ Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✓ API ทำงานได้ปกติ" -ForegroundColor Green
    Write-Host "     Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ API ไม่สามารถเข้าถึงได้: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== สรุป ===" -ForegroundColor Cyan
if ($port3000) {
    Write-Host "✓ Server กำลังรันอยู่" -ForegroundColor Green
    Write-Host "  URL สำหรับ n8n: http://172.21.65.222:3000/api/generate" -ForegroundColor Yellow
    Write-Host "  (ตรวจสอบ IP address ใหม่หลังรีสตาร์ท: ipconfig | findstr IPv4)" -ForegroundColor Gray
} else {
    Write-Host "✗ Server ไม่ได้รันอยู่" -ForegroundColor Red
    Write-Host "  รัน: node server.js" -ForegroundColor Yellow
    Write-Host "  หรือตั้งค่า auto-start: .\setup-auto-start.ps1" -ForegroundColor Yellow
}

