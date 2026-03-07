# print-windows.ps1
# Uso: powershell.exe -ExecutionPolicy Bypass -File print-windows.ps1 "NombreImpresora" "C:\ruta\archivo.bin"
param(
    [Parameter(Mandatory=$true)][string]$PrinterName,
    [Parameter(Mandatory=$true)][string]$FilePath
)

$ErrorActionPreference = 'Stop'

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
if (-not [RawPrint]::OpenPrinter($PrinterName, [ref]$hPrinter, [IntPtr]::Zero)) {
    throw "No se pudo abrir la impresora: $PrinterName"
}

$docInfo = New-Object DOCINFO
$docInfo.pDocName   = "ESC/POS Ticket"
$docInfo.pOutputFile = $null
$docInfo.pDataType  = "RAW"

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

Write-Output "OK:$written bytes enviados a $PrinterName"
