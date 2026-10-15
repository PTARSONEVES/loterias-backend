# loterias-backend
# Configuração local — [LOTERIAS]

## 1. Hosts
Adicionar em C:\Windows\System32\drivers\etc\hosts:
127.0.0.1  meudominio.test

## 2. Apache (httpd-vhosts.conf)
- Modelo: [ ] A (HTML puro)   [ ] B (Vite)
- ServerName: meudominio.test
- Porta do backend: 3000

## 3. Backend
cd backend
npm install
npm start

## 4. Frontend
- [ ] HTML puro → editar direto em frontend/
- [ ] Vite → npm run build antes de acessar via .test

## 5. Acessar
https://meudominio.test