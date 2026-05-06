# SITRAN Backend

## Variáveis de ambiente
Copie o `.env.example` para `.env` e preencha:

- `DATABASE_URL`: URL do PostgreSQL do Railway
- `PORT`: porta automática do Railway ou 3333 localmente
- `CORS_ORIGIN`: domínios liberados, separados por vírgula, ou `*`

## Desenvolvimento local
```bash
npm install
npm run prisma:push
npm run seed
npm run dev
```

## Deploy no Railway
Use estas configurações:

- Build Command: `npm install`
- Start Command: `npm start`

O script `npm start` já executa `prisma generate`, `prisma db push` e sobe a API.
