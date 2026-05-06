# SITRAN Frontend

## Variáveis de ambiente
Crie um `.env` com:

```env
VITE_API_BASE_URL="https://SEU-BACKEND.up.railway.app/api"
```

## Desenvolvimento local
```bash
npm install
npm run dev
```

## Build local
```bash
npm run build
npm start
```

## Deploy no Railway
Use estas configurações:

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
