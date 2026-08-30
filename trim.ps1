$f = Join-Path $PSScriptRoot "src\components\AskBuilder.astro"
$lines = Get-Content $f
$lines[0..770] | Set-Content $f
Write-Host ("Done. Lines: " + (Get-Content $f).Count)
