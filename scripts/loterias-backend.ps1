# ============================================================
# converter.ps1
# Converte .xlsx da Caixa para .csv UTF-8 com separador |
# ============================================================

param (
    [string]$caminhoOrigem,
    [string]$caminhoDestino
)

# Cria um objeto Excel em segundo plano
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    # Abre a planilha
    $workbook = $excel.Workbooks.Open($caminhoOrigem)
    
    # Salva como CSV (formato 6 = CSV UTF-8)
    $workbook.SaveAs($caminhoDestino, 6)
    
    # Fecha o Excel
    $workbook.Close($false)
    $excel.Quit()
    
    Write-Host "✅ CSV gerado: $caminhoDestino"
} catch {
    Write-Host "❌ Erro: $_"
    $excel.Quit()
    exit 1
}