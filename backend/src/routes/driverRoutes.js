import { Router } from 'express'
import prisma from '../prisma.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(drivers)
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: { checklists: true },
    })

    if (!driver) return res.status(404).json({ message: 'Condutor não encontrado.' })
    res.json(driver)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body
    const driver = await prisma.driver.create({
      data: {
        name: payload.name,
        cpf: payload.cpf,
        cnh: payload.cnh,
        category: payload.category,
        phone: payload.phone || null,
        email: payload.email || null,
        status: payload.status || 'ATIVO',
        expiresAt: new Date(payload.expiresAt),
        notes: payload.notes || null,
      },
    })
    res.status(201).json(driver)
  } catch (error) {
    next(error)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const payload = req.body
    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        name: payload.name,
        cpf: payload.cpf,
        cnh: payload.cnh,
        category: payload.category,
        phone: payload.phone || null,
        email: payload.email || null,
        status: payload.status || 'ATIVO',
        expiresAt: new Date(payload.expiresAt),
        notes: payload.notes || null,
      },
    })
    res.json(driver)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.checklistItem.deleteMany({ where: { checklist: { driverId: req.params.id } } })
    await prisma.checklist.deleteMany({ where: { driverId: req.params.id } })
    await prisma.driver.delete({ where: { id: req.params.id } })
    res.json({ message: 'Condutor removido com sucesso.' })
  } catch (error) {
    next(error)
  }
})

export default router
