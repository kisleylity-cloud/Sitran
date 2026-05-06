import app from './app.js'

const port = Number(process.env.PORT || 3333)

app.listen(port, '0.0.0.0', () => {
  console.log(`SITRAN API rodando na porta ${port}`)
})
