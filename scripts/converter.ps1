# ============================================================
# converter.ps1 (versão com ImportExcel)
# Converte .xlsx para .csv preservando TODAS as colunas
# ============================================================

param (
    [string]$caminhoOrigem,
    [string]$caminhoDestino
)

# Garante que a pasta de destino exista
$pastaDestino = Split-Path $caminhoDestino -Parent
if (-not (Test-Path $pastaDestino)) {
    New-Item -ItemType Directory -Path $pastaDestino | Out-Null
}

try {
    # --- Lê o Excel usando ImportExcel (não precisa do Excel instalado) ---
    $dados = Import-Excel -Path $caminhoOrigem

    # --- Exporta como CSV com separador '|' e encoding UTF-8 ---
    $dados | Export-Csv -Path $caminhoDestino -Delimiter '|' -Encoding UTF8 -NoTypeInformation

    Write-Host "✅ CSV gerado com TODAS as colunas: $caminhoDestino"
    exit 0
}
catch {
    Write-Error "❌ Erro: $_"
    exit 1
}