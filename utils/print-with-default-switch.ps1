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

    # 3. Print the file using silent printing script
    Write-Host "Printing file using silent printing method..."
    
    # Get the directory of this script
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $silentPrintScript = Join-Path $scriptDir "print-silent.ps1"
    
    if (Test-Path $silentPrintScript) {
        # Use the silent printing script
        $printerArg = if ([string]::IsNullOrEmpty($PrinterName)) { "" } else { "-PrinterName `"$PrinterName`"" }
        $command = "& `"$silentPrintScript`" -FilePath `"$FilePath`" $printerArg"
        
        Write-Host "Executing silent print script..."
        Invoke-Expression $command
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Print command sent successfully via silent printing."
        } else {
            Write-Error "Silent printing failed with exit code: $LASTEXITCODE"
            exit 1
        }
    } else {
        Write-Error "Silent printing script not found: $silentPrintScript"
        exit 1
    }

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
