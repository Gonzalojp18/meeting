# print-windows.ps1
param(
    [Parameter(Mandatory=$true)][string]$PrinterName,
    [Parameter(Mandatory=$true)][string]$FilePath
)

$ErrorActionPreference = 'Stop'

# Resolver el nombre real en el spooler de Windows
# El nombre en "Dispositivos e Impresoras" puede incluir " en NOMBREPC" como sufijo de display
$actualName = $null

$allPrinters = Get-Printer | Select-Object -ExpandProperty Name

# 1. Intentar coincidencia exacta
foreach ($p in $allPrinters) {
    if ($p -eq $PrinterName) {
        $actualName = $p
        break
    }
}

# 2. Si no encontro exacto, buscar por la parte base (antes de " en ")
if (-not $actualName) {
    $baseName = ($PrinterName -split ' en ')[0].Trim()
    foreach ($p in $allPrinters) {
        if ($p -like "*$baseName*") {
            $actualName = $p
            break
        }
    }
}

if (-not $actualName) {
    $available = $allPrinters -join ' | '
    throw "Impresora no encontrada: '$PrinterName'. Disponibles: $available"
}

Write-Output "Usando impresora: $actualName"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrint {
    [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr hPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO pDocInfo);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
}

[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)]
public struct DOCINFO {
    public string pDocName;
    public string pOutputFile;
    public string pDataType;
}
"@

$bytes = [System.IO.File]::ReadAllBytes($FilePath)

$hPrinter = [IntPtr]::Zero
if (-not [RawPrint]::OpenPrinter($actualName, [ref]$hPrinter, [IntPtr]::Zero)) {
    $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
    throw "OpenPrinter fallo (Win32 error $err) para: $actualName"
}

$docInfo = New-Object DOCINFO
$docInfo.pDocName    = "ESC/POS Ticket"
$docInfo.pOutputFile = $null
$docInfo.pDataType   = "RAW"

[RawPrint]::StartDocPrinter($hPrinter, 1, [ref]$docInfo) | Out-Null
[RawPrint]::StartPagePrinter($hPrinter) | Out-Null

$ptr = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length)
$written = 0
[RawPrint]::WritePrinter($hPrinter, $ptr, $bytes.Length, [ref]$written) | Out-Null
[System.Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)

[RawPrint]::EndPagePrinter($hPrinter) | Out-Null
[RawPrint]::EndDocPrinter($hPrinter) | Out-Null
[RawPrint]::ClosePrinter($hPrinter) | Out-Null

Write-Output "OK: $written bytes enviados a $actualName"
