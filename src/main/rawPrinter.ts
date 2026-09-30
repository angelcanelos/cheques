import { app } from 'electron'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Envía bytes "crudos" (RAW) a una impresora de Windows usando la cola de impresión
 * (winspool). Se hace con PowerShell + P/Invoke para no depender de módulos nativos.
 */
const PS_SCRIPT = `param([string]$PrinterName, [string]$DataFile)
$ErrorActionPreference = 'Stop'
$src = @"
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static void Send(string printer, byte[] data) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero))
      throw new Exception("No se pudo abrir la impresora '" + printer + "' (error " + Marshal.GetLastWin32Error() + ")");
    try {
      DOCINFO di = new DOCINFO();
      di.pDocName = "Cheques";
      di.pDataType = "RAW";
      if (StartDocPrinter(h, 1, ref di) == 0)
        throw new Exception("No se pudo iniciar el trabajo de impresion (error " + Marshal.GetLastWin32Error() + ")");
      try {
        StartPagePrinter(h);
        IntPtr p = Marshal.AllocCoTaskMem(data.Length);
        try {
          Marshal.Copy(data, 0, p, data.Length);
          int written;
          if (!WritePrinter(h, p, data.Length, out written) || written != data.Length)
            throw new Exception("No se pudieron enviar todos los datos a la impresora (error " + Marshal.GetLastWin32Error() + ")");
        } finally { Marshal.FreeCoTaskMem(p); }
        EndPagePrinter(h);
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
"@
Add-Type -TypeDefinition $src
$bytes = [System.IO.File]::ReadAllBytes($DataFile)
[RawPrinterHelper]::Send($PrinterName, $bytes)
Write-Output 'OK'
`

export async function sendRaw(printerName: string, data: Uint8Array): Promise<void> {
  const dir = join(app.getPath('temp'), 'cheques-app')
  mkdirSync(dir, { recursive: true })
  const scriptPath = join(dir, 'raw-print.ps1')
  const dataPath = join(dir, 'job.prn')
  // BOM UTF-8 para que Windows PowerShell 5.1 lea bien el script.
  writeFileSync(scriptPath, '﻿' + PS_SCRIPT, 'utf-8')
  writeFileSync(dataPath, data)

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        scriptPath,
        '-PrinterName',
        printerName,
        '-DataFile',
        dataPath
      ],
      { windowsHide: true }
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('error', (err) => reject(new Error(`No se pudo ejecutar PowerShell: ${err.message}`)))
    child.on('close', (code) => {
      if (code === 0 && stdout.includes('OK')) resolve()
      else reject(new Error((stderr || stdout || `Error al imprimir (código ${code})`).trim()))
    })
  })
}
