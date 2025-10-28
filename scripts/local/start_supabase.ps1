param()
$supabasePath = "C:\Users\micha\scoop\shims\supabase.exe"
Write-Host "Starting local Supabase..." -ForegroundColor Cyan
& $supabasePath start
Write-Host "Local status:" -ForegroundColor Cyan
& $supabasePath status
