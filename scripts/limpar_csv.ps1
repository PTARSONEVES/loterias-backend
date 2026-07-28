# ============================================================
# limpar_csv.ps1
# Remove BOM e caracteres de controle de um arquivo CSV
# ============================================================

param (
    [string]$caminhoArquivo
)

# Lê o arquivo como array de bytes para remover o BOM
$bytes = [System.IO.File]::ReadAllBytes($caminhoArquivo)

# Remove BOM (UTF-8 BOM = 0xEF 0xBB 0xBF)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $bytes = $bytes[3..($bytes.Length - 1)]
    Write-Host "✅ BOM removido do início do arquivo."
}

# Converte os bytes de volta para string UTF-8
$conteudo = [System.Text.Encoding]::UTF8.GetString($bytes)

# Remove caracteres de controle (exceto quebras de linha e tabs)
$conteudoLimpo = $conteudo -replace "[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", ""

# Salva o arquivo sem BOM
[System.IO.File]::WriteAllText($caminhoArquivo, $conteudoLimpo, [System.Text.Encoding]::UTF8)

Write-Host "✅ Caracteres de controle removidos e arquivo salvo sem BOM: $caminhoArquivo"