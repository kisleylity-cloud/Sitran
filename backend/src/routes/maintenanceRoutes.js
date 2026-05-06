import { Router } from 'express'
import prisma from '../prisma.js'

const router = Router()

function maintenanceStatus(item) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = item.dueDate ? new Date(item.dueDate) : null
  const currentKm = Number(item.vehicle?.mileage || 0)
  const nextKm = item.nextMaintenanceKm == null ? null : Number(item.nextMaintenanceKm)

  if (item.status === 'CONCLUIDA') return item.status
  if ((dueDate && dueDate < today) || (nextKm != null && currentKm >= nextKm)) return 'VENCIDA'
  if (dueDate) {
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000)
    if (diffDays <= 15) return 'PROXIMA'
  }
  if (nextKm != null && nextKm - currentKm <= 500) return 'PROXIMA'
  return item.status || 'ABERTA'
}

function parseMaintenancePayload(payload) {
  return {
    vehicleId: payload.vehicleId,
    title: payload.title,
    description: payload.description || null,
    performedAt: payload.performedAt ? new Date(payload.performedAt) : null,
    dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    currentKm: payload.currentKm ? Number(payload.currentKm) : null,
    nextMaintenanceKm: payload.nextMaintenanceKm ? Number(payload.nextMaintenanceKm) : null,
    cost: payload.cost ? Number(payload.cost) : null,
    status: payload.status || 'ABERTA',
  }
}

router.get('/', async (req, res, next) => {
  try {
    const maintenances = await prisma.maintenance.findMany({
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: { vehicle: true },
    })
    res.json(maintenances.map((item) => ({ ...item, alertStatus: maintenanceStatus(item) })))
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body
    const maintenance = await prisma.maintenance.create({
      data: parseMaintenancePayload(payload),
      include: { vehicle: true },
    })

    if (payload.currentKm && payload.vehicleId) {
      await prisma.vehicle.update({
        where: { id: payload.vehicleId },
        data: { mileage: Number(payload.currentKm), lastReviewAt: payload.performedAt ? new Date(payload.performedAt) : undefined },
      })
    }

    res.status(201).json({ ...maintenance, alertStatus: maintenanceStatus(maintenance) })
  } catch (error) {
    next(error)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const payload = req.body
    const maintenance = await prisma.maintenance.update({
      where: { id: req.params.id },
      data: parseMaintenancePayload(payload),
      include: { vehicle: true },
    })

    if (payload.currentKm && payload.vehicleId) {
      await prisma.vehicle.update({
        where: { id: payload.vehicleId },
        data: { mileage: Number(payload.currentKm), lastReviewAt: payload.performedAt ? new Date(payload.performedAt) : undefined },
      })
    }

    res.json({ ...maintenance, alertStatus: maintenanceStatus(maintenance) })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.maintenance.delete({ where: { id: req.params.id } })
    res.json({ message: 'Manutenção removida com sucesso.' })
  } catch (error) {
    next(error)
  }
})

export default router
