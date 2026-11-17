' SIUBA - menjalankan penjadwal Laravel (schedule:run) tanpa jendela hitam.
' Dipanggil Windows Task Scheduler setiap menit (dipasang oleh pasang-penjadwal-windows.bat).
Option Explicit
Dim fso, shell, folder, php, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
php = "C:\xampp\php\php.exe"
If Not fso.FileExists(php) Then php = "php"
shell.CurrentDirectory = folder
cmd = "cmd /c """"" & php & """ artisan schedule:run >nul 2>&1"""
shell.Run cmd, 0, True
