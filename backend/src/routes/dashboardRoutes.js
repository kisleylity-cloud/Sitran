import { Router } from 'express'
import prisma from '../prisma.js'

const router = Router()

function daysUntil(date) {
  if (!date) return null
  const today = new Date()
  const target = new Date(date)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

router.get('/', async (req, res, next) => {
  try {
    const [vehicles, drivers, checklists, maintenances, recentChecklists] = await Promise.all([
      prisma.vehicle.findMany(),
      prisma.driver.findMany(),
      prisma.checklist.findMany({ include: { items: true } }),
      prisma.maintenance.findMany({ include: { vehicle: true } }),
      prisma.checklist.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: true,
          driver: true,
          items: true,
        },
      }),
    ])

    const cnhAlerts = drivers
      .map((driver) => ({ ...driver, expiresInDays: daysUntil(driver.expiresAt) }))
      .filter((driver) => driver.expiresInDays !== null && driver.expiresInDays <= 30)
      .sort((a, b) => a.expiresInDays - b.expiresInDays)
      .slice(0, 5)

    const maintenanceAlerts = maintenances
      .map((maintenance) => ({
        ...maintenance,
        dueInDays: daysUntil(maintenance.dueDate),
        kmRemaining: maintenance.nextMaintenanceKm == null ? null : Number(maintenance.nextMaintenanceKm) - Number(maintenance.vehicle?.mileage || 0),
      }))
      .filter((maintenance) => ['ABERTA', 'AGENDADA'].includes(maintenance.status) || (maintenance.dueInDays !== null && maintenance.dueInDays <= 15) || (maintenance.kmRemaining !== null && maintenance.kmRemaining <= 500))
      .sort((a, b) => (a.dueInDays ?? 9999) - (b.dueInDays ?? 9999))
      .slice(0, 5)

    const summary = {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter((item) => item.status === 'ATIVO').length,
      maintenanceVehicles: vehicles.filter((item) => item.status === 'MANUTENCAO').length,
      inactiveVehicles: vehicles.filter((item) => item.status === 'INATIVO').length,
      totalDrivers: drivers.length,
      activeDrivers: drivers.filter((item) => item.status === 'ATIVO').length,
      inactiveDrivers: drivers.filter((item) => item.status === 'INATIVO').length,
      totalChecklists: checklists.length,
      pendingChecklists: checklists.filter((item) => item.status === 'PENDENTE').length,
      problemChecklists: checklists.filter((item) => item.status === 'PROBLEMA').length,
      okChecklists: checklists.filter((item) => item.status === 'OK').length,
      checklistsWithPhotos: checklists.filter((item) => !!item.driverPhoto || item.items.some((checkItem) => !!checkItem.photoUrl)).length,
      openMaintenances: maintenances.filter((item) => ['ABERTA', 'AGENDADA'].includes(item.status)).length,
    }

    res.json({ summary, recentChecklists, cnhAlerts, maintenanceAlerts })
  } catch (error) {
    next(error)
  }
})

router.get('/summary', async (req, res, next) => {
  try {
    const [vehicles, drivers, checklists, maintenances] = await Promise.all([
      prisma.vehicle.count(),
      prisma.driver.count(),
      prisma.checklist.count(),
      prisma.maintenance.count(),
    ])

    res.json({ vehicles, drivers, checklists, maintenances })
  } catch (error) {
    next(error)
  }
})

export default router
