Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\guilh\OneDrive\Documentos\stepticket"
WshShell.Run "node src/index.js", 0, False
