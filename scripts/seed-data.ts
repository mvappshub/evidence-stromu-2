/**
 * Data seeding script for performance testing.
 * Creates N tree records with random Czech locations and species.
 * 
 * Usage: bun run scripts/seed-data.ts [count] [email] [password]
 * Default: 1000 records, test@example.com / password123
 */

import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

// Czech cities with approximate lat/lng
const CZECH_LOCATIONS = [
  { name: 'Praha, Stromovka', lat: 50.098, lng: 14.418 },
  { name: 'Praha, Letná', lat: 50.097, lng: 14.427 },
  { name: 'Praha, Petřín', lat: 50.085, lng: 14.384 },
  { name: 'Brno, Lužánky', lat: 49.195, lng: 16.617 },
  { name: 'Brno, Lesní hřbitov', lat: 49.210, lng: 16.585 },
  { name: 'Ostrava, Komenského sady', lat: 49.834, lng: 18.282 },
  { name: 'Plzeň, Borský park', lat: 49.738, lng: 13.373 },
  { name: 'Liberec, zoologická zahrada', lat: 50.767, lng: 15.053 },
  { name: 'Olomouc, Smetanovy sady', lat: 49.594, lng: 17.252 },
  { name: 'České Budějovice, Dukelská', lat: 48.975, lng: 14.480 },
  { name: 'Hradec Králové, Jiráskovy sady', lat: 50.210, lng: 15.833 },
  { name: 'Pardubice, Pernerova', lat: 50.039, lng: 15.777 },
  { name: 'Zlín, Svatováclavská', lat: 49.227, lng: 17.665 },
  { name: 'Karlovy Vary, park u Vřídla', lat: 50.231, lng: 12.872 },
  { name: 'Ústí nad Labem, Zahrady', lat: 50.661, lng: 14.037 },
  { name: 'Jihlava, Masarykovo nám.', lat: 49.397, lng: 15.592 },
  { name: 'Teplice, lázeňský park', lat: 50.642, lng: 13.827 },
  { name: 'Decín, pod Zámkem', lat: 50.780, lng: 14.214 },
  { name: 'Příbram, Sázavská', lat: 49.690, lng: 14.004 },
  { name: 'Kladno, Sítná', lat: 50.143, lng: 14.099 },
]

const SPECIES = [
  'Picea abies',
  'Pinus sylvestris',
  'Quercus robur',
  'Quercus petraea',
  'Fagus sylvatica',
  'Betula pendula',
  'Carpinus betulus',
  'Tilia cordata',
  'Acer platanoides',
  'Acer pseudoplatanus',
  'Fraxinus excelsior',
  'Ulmus laevis',
  'Alnus glutinosa',
  'Populus tremula',
  'Salix caprea',
  'Sorbus aucuparia',
  'Prunus avium',
  'Malus sylvestris',
  'Pyrus communis',
  'Abies alba',
]

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

async function main() {
  const count = parseInt(process.argv[2] || '1000', 10)
  const email = process.argv[3] || 'test@example.com'
  const password = process.argv[4] || 'password123'

  console.log(`🌱 Seeding ${count} tree records for ${email}...`)

  // Ensure user exists
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    const passwordHash = await bcryptjs.hash(password, 10)
    user = await prisma.user.create({
      data: { email, passwordHash, name: 'Test User' },
    })
    console.log(`✅ Created user: ${email}`)
  }

  // Check existing record count
  const existingCount = await prisma.treeRecord.count({ where: { createdById: user.id } })
  console.log(`📊 Existing records: ${existingCount}`)

  // Create records in batches of 100
  const batchSize = 100
  const batches = Math.ceil(count / batchSize)

  for (let b = 0; b < batches; b++) {
    const batchCount = Math.min(batchSize, count - b * batchSize)
    const records: Array<{
      plantedAt: Date
      speciesLatin: string
      lat: number
      lng: number
      locality: string | null
      note: string | null
      createdById: string
    }> = []

    for (let i = 0; i < batchCount; i++) {
      const loc = randomChoice(CZECH_LOCATIONS)
      // Add some random offset to spread points around the city
      const lat = loc.lat + randomInRange(-0.05, 0.05)
      const lng = loc.lng + randomInRange(-0.05, 0.05)
      const species = randomChoice(SPECIES)
      const plantedAt = randomDate(new Date('2020-01-01'), new Date('2025-12-31'))
      const hasLocality = Math.random() > 0.15
      const hasNote = Math.random() > 0.7

      records.push({
        plantedAt,
        speciesLatin: species,
        lat,
        lng,
        locality: hasLocality ? loc.name : null,
        note: hasNote ? `Výsadba ${Math.random() > 0.5 ? 'jarní' : 'podzimní'} ${plantedAt.getFullYear()}` : null,
        createdById: user.id,
      })
    }

    await prisma.treeRecord.createMany({ data: records })
    console.log(`  ✅ Batch ${b + 1}/${batches} (${batchCount} records)`)
  }

  const finalCount = await prisma.treeRecord.count({ where: { createdById: user.id } })
  console.log(`\n🌳 Done! Total records: ${finalCount}`)

  // Show species breakdown
  const speciesBreakdown = await prisma.treeRecord.groupBy({
    by: ['speciesLatin'],
    where: { createdById: user.id },
    _count: { speciesLatin: true },
    orderBy: { _count: { speciesLatin: 'desc' } },
    take: 5,
  })
  console.log('\nTop 5 species:')
  speciesBreakdown.forEach((s) => {
    console.log(`  ${s.speciesLatin}: ${s._count.speciesLatin}`)
  })

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err)
  process.exit(1)
})
