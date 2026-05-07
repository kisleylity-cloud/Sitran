import 'dotenv/config'
import prisma from './src/prisma.js'
import bcrypt from 'bcryptjs'

const email = 'Sitran@2026Ceturb'

const password = await bcrypt.hash(
  'Sitran@2026@#',
  10,
)

await prisma.user.upsert({
  where: { email },

  update: {
    name: 'Administrador SITRAN',
    password,
    role: 'ADMIN',
  },

  create: {
    name: 'Administrador SITRAN',
    email,
    password,
    role: 'ADMIN',
  },
})

console.log('Usuário admin criado com sucesso!')

await prisma.$disconnect()