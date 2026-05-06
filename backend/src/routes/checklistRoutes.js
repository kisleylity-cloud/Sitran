import fs from 'fs'
import path from 'path'
import { Router } from 'express'
import prisma from '../prisma.js'

const router = Router()
const uploadsDir = path.resolve('uploads')

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
}

function saveBase64Image(base64, prefix = 'checklist') {
  if (!base64 || typeof base64 !== 'string') return null

  const value = base64.trim()
  if (value.startsWith('/uploads/')) return value

  const matches = value.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/)
  if (!matches) return null

  ensureUploadsDir()

  const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1].replace('jpg', 'jpg')
  const encoded = matches[2].replace(/\s/g, '')
  const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`
  const filePath = path.join(uploadsDir, fileName)

  fs.writeFileSync(filePath, Buffer.from(encoded, 'base64'))
  return `/uploads/${fileName}`
}

function deleteUploadByPath(uploadPath) {
  if (!uploadPath || !uploadPath.startsWith('/uploads/')) return
  const target = path.resolve(uploadPath.replace('/uploads/', 'uploads/'))
  if (fs.existsSync(target)) fs.unlinkSync(target)
}

function deleteExistingUploads(checklist) {
  deleteUploadByPath(checklist?.driverPhoto)
  for (const item of checklist?.items || []) {
    deleteUploadByPath(item?.photoUrl)
  }
}

function mapChecklistItem(item) {
  return {
    label: item.label,
    status: item.status || 'PENDENTE',
    notes: item.notes || null,
    photoUrl: saveBase64Image(item.photoUrl),
  }
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

    if (!checklist) return res.status(404).json({ message: 'Checklist não encontrado.' })
    res.json(checklist)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body
    const nextNumber = payload.number ? Number(payload.number) : await getNextChecklistNumber()
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
        driverPhoto: saveBase64Image(payload.driverPhoto, 'driver_selfie'),
        createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
        items: {
          create: (payload.items || []).map(mapChecklistItem),
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
    const previous = await prisma.checklist.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    })

    if (previous) deleteExistingUploads(previous)

    await prisma.checklistItem.deleteMany({ where: { checklistId: req.params.id } })
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
        driverPhoto: saveBase64Image(payload.driverPhoto, 'driver_selfie') || payload.driverPhoto || null,
        items: {
          create: (payload.items || []).map(mapChecklistItem),
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
    const previous = await prisma.checklist.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    })

    if (previous) deleteExistingUploads(previous)

    await prisma.checklist.delete({ where: { id: req.params.id } })
    res.json({ message: 'Checklist removido com sucesso.' })
  } catch (error) {
    next(error)
  }
})

export default router
