# ============================================================
# converter-python.ps1
# Chama o Python para converter .xlsx para .csv
# ============================================================

param (
    [string]$caminhoOrigem,
    [string]$caminhoDestino
)

$scriptPython = "D:\xampp\htdocs\loterias\loterias-backend\src\scripts\converter.py"
$comando = "python `"$scriptPython`" `"$caminhoOrigem`" `"$caminhoDestino`""

Write-Host "Executando conversao com Python..."
Invoke-Expression $comando

if ($LASTEXITCODE -eq 0) {
    Write-Host "Conversao concluida com sucesso!"
}
else {
    Write-Error "Erro na conversao"
    exit 1
}