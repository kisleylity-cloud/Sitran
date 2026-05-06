import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.checklistItem.deleteMany()
  await prisma.checklist.deleteMany()
  await prisma.maintenance.deleteMany()
  await prisma.driver.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.user.deleteMany()

  const vehicles = await prisma.vehicle.createMany({
    data: [
      {
        plate: 'ABC1D23',
        prefix: 'VTR-01',
        model: 'Strada Endurance',
        brand: 'Fiat',
        year: 2023,
        sector: 'Operação',
        unit: 'Vitória',
        status: 'ATIVO',
        mileage: 18320,
      },
      {
        plate: 'QWE4R56',
        prefix: 'VTR-02',
        model: 'Saveiro Robust',
        brand: 'Volkswagen',
        year: 2022,
        sector: 'Campo',
        unit: 'Serra',
        status: 'MANUTENCAO',
        mileage: 27450,
      },
      {
        plate: 'XYZ7K89',
        prefix: 'VTR-03',
        model: 'Ranger XLS',
        brand: 'Ford',
        year: 2024,
        sector: 'Sinalização',
        unit: 'Vila Velha',
        status: 'ATIVO',
        mileage: 9420,
      }
    ]
  })

  const vehicleList = await prisma.vehicle.findMany()

  await prisma.driver.createMany({
    data: [
      {
        name: 'Carlos Henrique Souza',
        cpf: '12345678900',
        cnh: '01234567890',
        category: 'AB',
        phone: '27999990001',
        email: 'carlos@sitranes.com.br',
        status: 'ATIVO',
        expiresAt: new Date('2027-08-15T00:00:00.000Z'),
        notes: 'Atua em inspeções urbanas.'
      },
      {
        name: 'Mariana Oliveira Lima',
        cpf: '98765432100',
        cnh: '09876543210',
        category: 'B',
        phone: '27999990002',
        email: 'mariana@sitranes.com.br',
        status: 'ATIVO',
        expiresAt: new Date('2026-11-30T00:00:00.000Z'),
        notes: 'Apoio administrativo e campo.'
      },
      {
        name: 'João Pedro Almeida',
        cpf: '45612378955',
        cnh: '12345098765',
        category: 'D',
        phone: '27999990003',
        email: 'joao@sitranes.com.br',
        status: 'INATIVO',
        expiresAt: new Date('2025-12-10T00:00:00.000Z'),
        notes: 'Afastado temporariamente.'
      }
    ]
  })

  const driverList = await prisma.driver.findMany()

  const checklist1 = await prisma.checklist.create({
    data: {
      vehicleId: vehicleList[0].id,
      driverId: driverList[0].id,
      type: 'Saída',
      status: 'OK',
      odometer: 18320,
      location: 'Vitória - ES',
      notes: 'Checklist sem ocorrências.',
      createdAt: new Date(),
      items: {
        create: [
          { label: 'Freios', status: 'OK' },
          { label: 'Pneus', status: 'OK' },
          { label: 'Iluminação', status: 'OK' }
        ]
      }
    }
  })

  await prisma.checklist.create({
    data: {
      vehicleId: vehicleList[1].id,
      driverId: driverList[1].id,
      type: 'Retorno',
      status: 'PROBLEMA',
      odometer: 27450,
      location: 'Serra - ES',
      notes: 'Luz traseira e desgaste no pneu dianteiro.',
      createdAt: new Date(Date.now() - 86400000),
      items: {
        create: [
          { label: 'Pneus', status: 'PROBLEMA', notes: 'Desgaste acentuado.' },
          { label: 'Iluminação', status: 'PROBLEMA', notes: 'Lanterna traseira falhando.' },
          { label: 'Documento', status: 'OK' }
        ]
      }
    }
  })

  await prisma.maintenance.createMany({
    data: [
      {
        vehicleId: vehicleList[1].id,
        title: 'Troca de pneus',
        description: 'Substituição dos pneus dianteiros.',
        dueDate: new Date(Date.now() + 5 * 86400000),
        cost: 1850.0,
        status: 'ABERTA'
      },
      {
        vehicleId: vehicleList[0].id,
        title: 'Revisão preventiva',
        description: 'Revisão programada de 20 mil km.',
        dueDate: new Date(Date.now() + 12 * 86400000),
        cost: 650.0,
        status: 'AGENDADA'
      }
    ]
  })

  await prisma.user.create({
    data: {
      name: 'Administrador SITRAN',
      email: 'admin@sitranes.com.br',
      password: '123456',
      role: 'ADMIN'
    }
  })

  console.log('Seed concluído com sucesso.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
