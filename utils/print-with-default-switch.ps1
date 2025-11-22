param (
    [string]$FilePath,
    [string]$PrinterName
)

# 1. Get current default printer
$originalDefault = Get-CimInstance -ClassName Win32_Printer -Filter "Default=$true"
$originalPrinterName = $originalDefault.Name

Write-Host "Original Default Printer: $originalPrinterName"

$didSwitch = $false

try {
    # 2. Set new default printer (only if PrinterName is provided and different)
    if (![string]::IsNullOrEmpty($PrinterName) -and $originalPrinterName -ne $PrinterName) {
        Write-Host "Switching default printer to: $PrinterName"
        $printer = Get-WmiObject -Class Win32_Printer -Filter "Name='$PrinterName'"
        if ($printer) {
            $printer.SetDefaultPrinter()
            $didSwitch = $true
            # Give Windows a moment to register the change
            Start-Sleep -Seconds 2
        }
        else {
            Write-Warning "Printer '$PrinterName' not found. Using default: $originalPrinterName"
        }
    }

    # 3. Print the file using Chrome or Edge (Headless)
    Write-Host "Printing file via Browser..."
    
    $browserPath = ""
    $browserName = ""
    
    $possiblePaths = @(
        # Chrome (User preferred)
        "C:\Program Files\Google\Chrome\Application\chrome.exe",
        "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        # Edge (Fallback)
        "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $browserPath = $path
            if ($path -like "*chrome.exe") { $browserName = "Chrome" } else { $browserName = "Edge" }
            break
        }
    }
    
    if ([string]::IsNullOrEmpty($browserPath)) {
        Write-Error "No suitable browser (Chrome or Edge) found for printing."
        exit 1
    }
    
    Write-Host "Using $browserName at: $browserPath"

    # วิธีที่ถูกต้อง: ใช้ Start-Process -Verb Print แทน browser headless
    # เพราะ browser headless ไม่รองรับ --print-to-printer สำหรับ PDF
    Write-Host "Using Start-Process -Verb Print method..."
    
    Start-Process -FilePath $FilePath -Verb Print -PassThru
    
    Write-Host "Print command sent successfully."

}
catch {
    Write-Error "Error during printing: $_"
}
finally {
    # 4. Restore original default printer if we switched
    if ($didSwitch) {
        Write-Host "Restoring default printer to: $originalPrinterName"
        (Get-WmiObject -Class Win32_Printer -Filter "Name='$originalPrinterName'").SetDefaultPrinter()
    }
}
