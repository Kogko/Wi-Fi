#requires -Version 5.1
<#
.SYNOPSIS
  Silent PDF printing using SumatraPDF or Ghostscript
  
.DESCRIPTION
  Prints PDF files silently in the background without showing any dialog.
  REQUIRES: SumatraPDF or Ghostscript to be installed for true silent printing.
  Uses multiple methods in order of preference:
  1. SumatraPDF (if available) - BEST - Truly silent, no dialog
  2. Ghostscript (if available) - Excellent - Silent printing
  3. Fallback (if neither available) - WARNING: May open Adobe dialog
  
.PARAMETER FilePath
  Path to the PDF file to print
  
.PARAMETER PrinterName
  Optional printer name. If not specified, uses default printer
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$FilePath,
    
    [Parameter(Mandatory=$false)]
    [string]$PrinterName = ""
)

# Check if file exists
if (-not (Test-Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

# IMPORTANT: For truly silent printing, SumatraPDF or Ghostscript is required
# Without these tools, Windows will use the default PDF handler (usually Adobe) which shows a dialog

# Method 1: Try SumatraPDF first (BEST - truly silent)
$sumatraPath = "C:\Program Files\SumatraPDF\SumatraPDF.exe"
if (Test-Path $sumatraPath) {
    Write-Host "Using SumatraPDF for silent printing"
    
    try {
        if ([string]::IsNullOrEmpty($PrinterName)) {
            $process = Start-Process -FilePath $sumatraPath -ArgumentList @("-print-to-default", "-silent", "`"$FilePath`"") -WindowStyle Hidden -PassThru -Wait
        } else {
            $process = Start-Process -FilePath $sumatraPath -ArgumentList @("-print-to", "`"$PrinterName`"", "-silent", "`"$FilePath`"") -WindowStyle Hidden -PassThru -Wait
        }
        
        if ($process.ExitCode -eq 0) {
            Write-Host "PDF printed successfully via SumatraPDF"
            exit 0
        } else {
            Write-Warning "SumatraPDF exited with code: $($process.ExitCode)"
        }
    } catch {
        Write-Warning "SumatraPDF failed: $_"
    }
}

# Method 2: Try Ghostscript (excellent for silent printing)
$ghostscriptPaths = @(
    "C:\Program Files\gs\gs10.03.0\bin\gswin64c.exe",
    "C:\Program Files\gs\gs10.02.1\bin\gswin64c.exe",
    "C:\Program Files\gs\gs10.02.0\bin\gswin64c.exe",
    "C:\Program Files\gs\gs10.01.2\bin\gswin64c.exe",
    "C:\Program Files (x86)\gs\gs10.03.0\bin\gswin64c.exe",
    "C:\Program Files (x86)\gs\gs10.02.1\bin\gswin64c.exe"
)

$gsPath = $null
foreach ($path in $ghostscriptPaths) {
    if (Test-Path $path) {
        $gsPath = $path
        break
    }
}

if ($gsPath) {
    Write-Host "Using Ghostscript for silent printing: $gsPath"
    
    if ([string]::IsNullOrEmpty($PrinterName)) {
        # Use default printer
        $printerTarget = "%printer%"
    } else {
        $printerTarget = "%printer%$PrinterName"
    }
    
    $arguments = @(
        "-dNOPAUSE",
        "-dBATCH",
        "-dQUIET",
        "-dNOSAFER",
        "-sDEVICE=mswinpr2",
        "-sOutputFile=$printerTarget",
        "`"$FilePath`""
    )
    
    try {
        $process = Start-Process -FilePath $gsPath -ArgumentList $arguments -WindowStyle Hidden -PassThru -Wait
        if ($process.ExitCode -eq 0) {
            Write-Host "PDF printed successfully via Ghostscript"
            exit 0
        } else {
            Write-Warning "Ghostscript exited with code: $($process.ExitCode)"
        }
    } catch {
        Write-Warning "Ghostscript failed: $_"
    }
}

# Method 2: Use .NET PrintDocument with PDF rendering
# This requires converting PDF to image first, which is complex
# Instead, we'll use a simpler approach with Windows Print Spooler API

# Method 3: Use Windows Print Spooler API directly
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class PrintSpooler {
    [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    
    [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    
    [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    
    [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    
    [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    
    [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    
    [DllImport("winspool.drv", CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
    
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDataType;
    }
}
"@

# Get printer name
if ([string]::IsNullOrEmpty($PrinterName)) {
    $defaultPrinter = Get-CimInstance -ClassName Win32_Printer -Filter "Default=$true"
    if ($defaultPrinter) {
        $PrinterName = $defaultPrinter.Name
    } else {
        Write-Error "No default printer found and no printer name specified"
        exit 1
    }
}

Write-Host "Printing to printer: $PrinterName"


# Method 3: Final fallback - ERROR: No silent printing tool available
# Without SumatraPDF or Ghostscript, Windows will use default PDF handler (Adobe) which shows dialog
Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "ERROR: No silent printing tool found!" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "To enable silent printing, please install one of these tools:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. SumatraPDF (Recommended - Free, lightweight):" -ForegroundColor Cyan
Write-Host "   Download: https://www.sumatrapdfreader.org/free-pdf-reader" -ForegroundColor White
Write-Host "   Install to: C:\Program Files\SumatraPDF\" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Ghostscript (Alternative):" -ForegroundColor Cyan
Write-Host "   Download: https://www.ghostscript.com/download/gsdnld.html" -ForegroundColor White
Write-Host ""
Write-Host "Without these tools, Windows will open Adobe Reader with print dialog." -ForegroundColor Yellow
Write-Host ""
Write-Host "Attempting fallback method (may show Adobe dialog)..." -ForegroundColor Yellow

try {
    # Get the full path
    $fullPath = (Resolve-Path $FilePath).Path
    
    # Get printer name
    if ([string]::IsNullOrEmpty($PrinterName)) {
        $defaultPrinter = Get-CimInstance -ClassName Win32_Printer -Filter "Default=$true"
        if ($defaultPrinter) {
            $PrinterName = $defaultPrinter.Name
        } else {
            Write-Error "No default printer found"
            exit 1
        }
    }
    
    # Last resort: This WILL open Adobe but we try to minimize it
    Write-Warning "Using Windows default print handler (Adobe may appear)"
    
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $fullPath
    $psi.Verb = "printto"
    $psi.Arguments = "`"$PrinterName`""
    $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized
    $psi.UseShellExecute = $true
    
    $process = [System.Diagnostics.Process]::Start($psi)
    
    # Try to hide window immediately
    Start-Sleep -Milliseconds 200
    if ($process -and -not $process.HasExited) {
        try {
            Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class Win32 {
                    [DllImport("user32.dll")]
                    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
                }
"@
            [Win32]::ShowWindow($process.MainWindowHandle, 0) | Out-Null
        } catch {
            # Ignore
        }
    }
    
    Write-Host "Print command sent (Adobe dialog may have appeared)" -ForegroundColor Yellow
    exit 0
    
} catch {
    Write-Error "Printing failed. Please install SumatraPDF for silent printing."
    Write-Error "Download: https://www.sumatrapdfreader.org/free-pdf-reader"
    exit 1
}

