#requires -Version 5.1
<#
.SYNOPSIS
  Lightweight HTTP print service that prints the most recent Wi-Fi ticket PDF.

.DESCRIPTION
  Exposes two endpoints:
    GET /health         -> returns service status (JSON)
    POST|GET /print/latest -> prints the latest PDF in the configured directory

  Designed to be run on Windows so that automation tools (e.g. n8n in Docker)
  can trigger printing without manual intervention.

.PARAMETER Port
  TCP port to listen on.

.PARAMETER PdfDirectory
  Path to the folder containing generated Wi-Fi ticket PDFs.

.PARAMETER PrinterName
  Target printer name. Required when using SumatraPDF.

.PARAMETER SumatraPath
  Optional path to SumatraPDF.exe for reliable silent printing. If not found,
  the script falls back to Start-Process -Verb Print, which may show dialogs.

.EXAMPLE
  .\print-service.ps1 -Port 5000 -PdfDirectory "C:\WiFi-GENER\Wi-Fi tricket" `
      -PrinterName "FujiFilm-10 ใน Fuji-P10" `
      -SumatraPath "C:\Program Files\SumatraPDF\SumatraPDF.exe"

  Then call: curl http://localhost:5000/print/latest -X POST
#>

param(
  [int]$Port = 5000,
  [string]$PdfDirectory = (Join-Path $PSScriptRoot "Wi-Fi tricket"),
  [string]$PrinterName = "",
  [string]$SumatraPath = "C:\Program Files\SumatraPDF\SumatraPDF.exe"
)

Add-Type -AssemblyName System.Net.HttpListener
Add-Type -AssemblyName System.Web

function Write-JsonResponse {
  param(
    [System.Net.HttpListenerResponse]$Response,
    [int]$StatusCode = 200,
    [object]$Body = $null
  )

  $Response.StatusCode = $StatusCode
  $Response.Headers["Content-Type"] = "application/json; charset=utf-8"
  $json = ($Body | ConvertTo-Json -Depth 5)
  $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
  $Response.ContentLength64 = $buffer.Length
  $Response.OutputStream.Write($buffer, 0, $buffer.Length)
  $Response.OutputStream.Close()
}

function Write-TextResponse {
  param(
    [System.Net.HttpListenerResponse]$Response,
    [int]$StatusCode = 200,
    [string]$Body = ""
  )

  $Response.StatusCode = $StatusCode
  $Response.Headers["Content-Type"] = "text/plain; charset=utf-8"
  $buffer = [System.Text.Encoding]::UTF8.GetBytes($Body)
  $Response.ContentLength64 = $buffer.Length
  $Response.OutputStream.Write($buffer, 0, $buffer.Length)
  $Response.OutputStream.Close()
}

function Get-LatestPdf {
  param([string]$Directory)

  if (-not (Test-Path $Directory)) {
    return $null
  }

  $files = Get-ChildItem -Path $Directory -Filter *.pdf -File |
           Sort-Object LastWriteTime -Descending
  return $files | Select-Object -First 1
}

function Invoke-Print {
  param(
    [string]$PdfPath
  )

  if (-not (Test-Path $PdfPath)) {
    throw "PDF path '$PdfPath' does not exist."
  }

  if ((Test-Path $SumatraPath) -and -not [string]::IsNullOrWhiteSpace($PrinterName)) {
    $args = @("-print-to", "`"$PrinterName`"", "`"$PdfPath`"")
    Start-Process -FilePath $SumatraPath -ArgumentList $args -WindowStyle Hidden -Wait
  } else {
    Start-Process -FilePath $PdfPath -Verb Print | Out-Null
  }
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://+:$Port/"
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
  Write-Host "Print service listening on $prefix"
  Write-Host "PDF directory: $PdfDirectory"
  if (Test-Path $SumatraPath) {
    Write-Host "Using SumatraPDF at: $SumatraPath"
  } else {
    Write-Host "SumatraPDF not found. Falling back to default print verb."
  }

  while ($listener.IsListening) {
    $context = $listener.GetContext()
    Start-Job -ArgumentList $context -ScriptBlock {
      param($ctx)
      try {
        $request = $ctx.Request
        $response = $ctx.Response
        $path = $request.Url.AbsolutePath.TrimEnd('/')

        switch ($path) {
          "/health" {
            Write-JsonResponse -Response $response -Body @{
              status = "ok"
              timestamp = (Get-Date).ToString("o")
              pdfDirectory = $using:PdfDirectory
              printer = $using:PrinterName
            }
          }
          "/print/latest" {
            $latest = Get-LatestPdf -Directory $using:PdfDirectory
            if (-not $latest) {
              Write-JsonResponse -Response $response -StatusCode 404 -Body @{
                status = "error"
                message = "No PDF found in $($using:PdfDirectory)"
              }
              return
            }

            Invoke-Print -PdfPath $latest.FullName

            Write-JsonResponse -Response $response -Body @{
              status = "ok"
              file = $latest.Name
              fullPath = $latest.FullName
              printedAt = (Get-Date).ToString("o")
            }
          }
          default {
            Write-TextResponse -Response $response -StatusCode 404 -Body "Endpoint not found."
          }
        }
      } catch {
        Write-TextResponse -Response $ctx.Response -StatusCode 500 -Body $_.Exception.Message
      }
    } | Out-Null
  }
} catch {
  Write-Error $_
} finally {
  if ($listener) {
    $listener.Stop()
    $listener.Close()
  }
}

