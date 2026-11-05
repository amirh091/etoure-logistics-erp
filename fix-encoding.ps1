$src = 'c:\Users\alhassan bamba\Desktop\tout les projet en vraque\E-TOUR' + [char]0x00C9 + ' ERP'
$dir = Join-Path $src 'etoure-logistics-erp\src\pages'
$utf8 = New-Object System.Text.UTF8Encoding $false
Get-ChildItem $dir -Filter '*.jsx' | ForEach-Object {
  $p = $_.FullName
  $c = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
  $fixed = $c -replace "أ‰", [char]0x00C9 -replace "أ ", [char]0x00E0 -replace "أ¢", [char]0x00E2 -replace "أ¨", [char]0x00E8 -replace "أ©", [char]0x00E9 -replace "أھ", [char]0x00EA -replace "أ«", [char]0x00EB -replace "أ®", [char]0x00EE -replace "أ¯", [char]0x00EF -replace "أ´", [char]0x00F4 -replace "أ¶", [char]0x00F6 -replace "أ¹", [char]0x00F9 -replace "أ»", [char]0x00FB -replace "أ¼", [char]0x00FC -replace "أ§", [char]0x00E7 -replace "آ°", [char]0x00B0 -replace "آ·", [char]0x00B7 -replace "آ«", [char]0x00AB -replace "آ»", [char]0x00BB -replace "أ‡", [char]0x00C7 -replace "آ", [char]0x00A0
  [System.IO.File]::WriteAllText($p, $fixed, $utf8)
  Write-Output ("fixed: " + $_.Name)
}
