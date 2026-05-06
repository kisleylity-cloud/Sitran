import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'path'

import dashboardRoutes from './routes/dashboardRoutes.js'
import vehicleRoutes from './routes/vehicleRoutes.js'
import driverRoutes from './routes/driverRoutes.js'
import checklistRoutes from './routes/checklistRoutes.js'
import maintenanceRoutes from './routes/maintenanceRoutes.js'
import userRoutes from './routes/userRoutes.js'

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Origem não permitida pelo CORS.'))
  },
}))

app.use(express.json({ limit: '150mb' }))
app.use(express.urlencoded({ extended: true, limit: '150mb' }))
app.use(morgan('dev'))
app.use('/uploads', express.static(path.resolve('uploads')))

app.get('/', (req, res) => {
  res.json({
    name: 'SITRAN Manager API',
    status: 'online',
    healthcheck: '/health',
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sitran-manager-api',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/dashboard', dashboardRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/checklists', checklistRoutes)
app.use('/api/maintenances', maintenanceRoutes)
app.use('/api/users', userRoutes)

app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' })
})

app.use((error, req, res, next) => {
  console.error(error)

  if (error?.code === 'P2002') {
    return res.status(409).json({
      message: 'Já existe um registro com um campo único duplicado.',
      detail: error.meta?.target?.join(', ') || error.message,
    })
  }

  if (error?.code === 'P2025') {
    return res.status(404).json({
      message: 'Registro não encontrado.',
      detail: error.message,
    })
  }

  if (error.message === 'Origem não permitida pelo CORS.') {
    return res.status(403).json({
      message: error.message,
    })
  }

  return res.status(500).json({
    message: 'Erro interno no servidor.',
    detail: error.message,
  })
})

export default app
