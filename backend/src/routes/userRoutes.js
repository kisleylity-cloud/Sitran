import { Router } from 'express'
import prisma from '../prisma.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = Router()

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return res.status(401).json({
        message: 'Email ou senha inválidos.',
      })
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password,
    )

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Email ou senha inválidos.',
      })
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'sitran_secret_key',
      {
        expiresIn: '7d',
      },
    )

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    })

    res.json(users)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body

    const hashedPassword = await bcrypt.hash(
      payload.password || '123456',
      10,
    )

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: hashedPassword,
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

    let password

    if (payload.password) {
      password = await bcrypt.hash(payload.password, 10)
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        name: payload.name,
        email: payload.email,
        password,
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
    await prisma.user.delete({
      where: { id: req.params.id },
    })

    res.json({
      message: 'Usuário removido com sucesso.',
    })
  } catch (error) {
    next(error)
  }
})

export default router