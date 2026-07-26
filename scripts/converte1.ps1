# --- CONFIGURAÇÕES DE CAMINHO E NOMES ---
$pastaOrigem = "D:\downloads\Chrome"
$pastaDestino = "D:\temp"
$nomeArquivoXlsx = "Mega-Sena.xlsx"
$nomeArquivoCsv = "Mega-Sena.csv"

# Cria os caminhos completos
$caminhoXlsx = Join-Path $pastaOrigem $nomeArquivoXlsx
$caminhoCsv = Join-Path $pastaDestino $nomeArquivoCsv

# --- VERIFICAÇÃO ---
if (-not (Test-Path $caminhoXlsx)) {
    Write-Error "O arquivo de origem não foi encontrado em: $caminhoXlsx"
    exit
}

# Garante que a pasta de destino exista
if (-not (Test-Path $pastaDestino)) {
    New-Item -ItemType Directory -Path $pastaDestino | Out-Null
}

try {
    # --- INICIALIZA O EXCEL EM SEGUNDO PLANO ---
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    # Abre o arquivo Excel
    $workbook = $excel.Workbooks.Open($caminhoXlsx)
    $worksheet = $workbook.Worksheets.Item(1) # Captura a primeira aba

    # --- CAMINHO TEMPORÁRIO PARA EXPORTAÇÃO ---
    # O Excel não permite definir o delimitador pipe diretamente no SaveAs.
    # Por isso, salvamos primeiro como CSV padrão (separado por vírgula) em UTF-8.
    $caminhoTempCsv = [System.IO.Path]::GetTempFileName()
    
    # 62 corresponde ao formato xlCSVUTF8 no Excel moderno
    $workbook.SaveAs($caminhoTempCsv, 62)
    $workbook.Close($false)
    $excel.Quit()

    # --- ALTERAÇÃO DO DELIMITADOR E SALVAMENTO FINAL ---
    # Importa o CSV temporário (gerado por vírgulas) e exporta com o delimitador pipe
    Import-Csv -Path $caminhoTempCsv -Delimiter ',' | 
    Export-Csv -Path $caminhoCsv -Delimiter '|' -Encoding utf8 -NoTypeInformation

    # Remove o arquivo temporário criado
    Remove-Item $caminhoTempCsv -Force

    Write-Host "Conversão concluída com sucesso!" -ForegroundColor Green
    Write-Host "Arquivo salvo em: $caminhoCsv" -ForegroundColor Cyan

}
catch {
    Write-Error "Ocorreu um erro durante a conversão: $_"
}
finally {
    # --- LIMPEZA DE PROCESSOS ---
    # Garante que o Excel seja fechado mesmo se ocorrer um erro
    if ($excel) {
        $excel.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
