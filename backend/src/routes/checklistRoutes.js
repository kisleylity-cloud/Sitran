import { Router } from 'express'
import { v2 as cloudinary } from 'cloudinary'
import prisma from '../prisma.js'

const router = Router()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function saveBase64Image(base64, prefix = 'checklist') {
  if (!base64 || typeof base64 !== 'string') return null

  const value = base64.trim()

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }

  const matches = value.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/)
  if (!matches) return null

  const result = await cloudinary.uploader.upload(value, {
    folder: 'sitran/checklists',
    public_id: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    resource_type: 'image',
  })

  return result.secure_url
}

async function mapChecklistItem(item) {
  return {
    label: item.label,
    status: item.status || 'PENDENTE',
    notes: item.notes || null,
    photoUrl: await saveBase64Image(item.photoUrl),
  }
}

async function mapChecklistItems(items = []) {
  const result = []

  for (const item of items) {
    result.push(await mapChecklistItem(item))
  }

  return result
}

function includeChecklistRelations() {
  return {
    vehicle: true,
    driver: true,
    items: true,
  }
}

async function getNextChecklistNumber() {
  const lastChecklist = await prisma.checklist.findFirst({
    orderBy: { number: 'desc' },
    select: { number: true },
  })

  return Number(lastChecklist?.number || 0) + 1
}

router.get('/', async (req, res, next) => {
  try {
    const checklists = await prisma.checklist.findMany({
      orderBy: { createdAt: 'desc' },
      include: includeChecklistRelations(),
    })

    res.json(checklists)
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const checklist = await prisma.checklist.findUnique({
      where: { id: req.params.id },
      include: includeChecklistRelations(),
    })

    if (!checklist) {
      return res.status(404).json({ message: 'Checklist não encontrado.' })
    }

    res.json(checklist)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body
    const nextNumber = payload.number
      ? Number(payload.number)
      : await getNextChecklistNumber()

    const checklist = await prisma.checklist.create({
      data: {
        number: nextNumber,
        vehicleId: payload.vehicleId,
        driverId: payload.driverId,
        type: payload.type,
        status: payload.status || 'PENDENTE',
        odometer: payload.odometer ? Number(payload.odometer) : null,
        location: payload.location || null,
        notes: payload.notes || null,
        driverPhoto: await saveBase64Image(payload.driverPhoto, 'driver_selfie'),
        createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
        items: {
          create: await mapChecklistItems(payload.items || []),
        },
      },
      include: includeChecklistRelations(),
    })

    res.status(201).json(checklist)
  } catch (error) {
    next(error)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const payload = req.body

    await prisma.checklistItem.deleteMany({
      where: { checklistId: req.params.id },
    })

    const checklist = await prisma.checklist.update({
      where: { id: req.params.id },
      data: {
        vehicleId: payload.vehicleId,
        driverId: payload.driverId,
        type: payload.type,
        status: payload.status || 'PENDENTE',
        odometer: payload.odometer ? Number(payload.odometer) : null,
        location: payload.location || null,
        notes: payload.notes || null,
        driverPhoto:
          (await saveBase64Image(payload.driverPhoto, 'driver_selfie')) ||
          payload.driverPhoto ||
          null,
        items: {
          create: await mapChecklistItems(payload.items || []),
        },
      },
      include: includeChecklistRelations(),
    })

    res.json(checklist)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.checklist.delete({
      where: { id: req.params.id },
    })

    res.json({ message: 'Checklist removido com sucesso.' })
  } catch (error) {
    next(error)
  }
})

export default router