import { Router } from 'express'
import prisma from '../prisma.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(users)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: payload.password || '123456',
        role: payload.role || 'ADMIN',
      },
    })
    res.status(201).json(user)
  } catch (error) {
    next(error)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const payload = req.body
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        name: payload.name,
        email: payload.email,
        password: payload.password || undefined,
        role: payload.role || 'ADMIN',
      },
    })
    res.json(user)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ message: 'Usuário removido com sucesso.' })
  } catch (error) {
    next(error)
  }
})

export default router
