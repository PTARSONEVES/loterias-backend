import pandas as pd
import sys
import re

caminho_origem = sys.argv[1]
caminho_destino = sys.argv[2]

df = pd.read_excel(caminho_origem, engine='openpyxl')

# Garante que as colunas existam
for col in ['Observação', 'local']:
    if col not in df.columns:
        df[col] = ''
    else:
        df[col] = df[col].fillna('').astype(str)

# Remove TODOS os caracteres de controle e quebras de linha


def limpar_texto(texto):
    # Remove quebras de linha, retornos de carro, tabs
    texto = texto.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
    # Remove caracteres de controle (0x00 a 0x1F)
    texto = re.sub(r'[\x00-\x1f]', '', texto)
    # Remove espaços múltiplos
    texto = re.sub(r' +', ' ', texto)
    return texto.strip()


df['Observação'] = df['Observação'].apply(limpar_texto)
df['local'] = df['local'].apply(limpar_texto)

# Remove linhas totalmente vazias
df = df.dropna(how='all')

# Salva o CSV
df.to_csv(caminho_destino, sep='|', index=False, encoding='utf-8')
print("CSV gerado com", len(df), "linhas.")
