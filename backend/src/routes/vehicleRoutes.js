import { Router } from 'express'
import prisma from '../prisma.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(vehicles)
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: { checklists: true, maintenances: true },
    })

    if (!vehicle) return res.status(404).json({ message: 'Veículo não encontrado.' })
    res.json(vehicle)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body
    const vehicle = await prisma.vehicle.create({
      data: {
        plate: payload.plate,
        prefix: payload.prefix || null,
        model: payload.model,
        brand: payload.brand,
        year: Number(payload.year),
        sector: payload.sector || null,
        unit: payload.unit || null,
        status: payload.status || 'ATIVO',
        mileage: Number(payload.mileage || 0),
        lastReviewAt: payload.lastReviewAt ? new Date(payload.lastReviewAt) : null,
      },
    })
    res.status(201).json(vehicle)
  } catch (error) {
    next(error)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const payload = req.body
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        plate: payload.plate,
        prefix: payload.prefix || null,
        model: payload.model,
        brand: payload.brand,
        year: Number(payload.year),
        sector: payload.sector || null,
        unit: payload.unit || null,
        status: payload.status || 'ATIVO',
        mileage: Number(payload.mileage || 0),
        lastReviewAt: payload.lastReviewAt ? new Date(payload.lastReviewAt) : null,
      },
    })
    res.json(vehicle)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.maintenance.deleteMany({ where: { vehicleId: req.params.id } })
    await prisma.checklistItem.deleteMany({ where: { checklist: { vehicleId: req.params.id } } })
    await prisma.checklist.deleteMany({ where: { vehicleId: req.params.id } })
    await prisma.vehicle.delete({ where: { id: req.params.id } })
    res.json({ message: 'Veículo removido com sucesso.' })
  } catch (error) {
    next(error)
  }
})

export default router
