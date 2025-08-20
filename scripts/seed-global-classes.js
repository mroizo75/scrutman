const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedGlobalClasses() {
  const globalClasses = [
    {
      name: "Rookie",
      description: "Beginner class for new drivers",
      minWeight: null,
      maxWeight: null
    },
    {
      name: "Sport",
      description: "Intermediate class for experienced drivers",
      minWeight: null,
      maxWeight: null
    },
    {
      name: "Pro",
      description: "Advanced class for professional drivers",
      minWeight: null,
      maxWeight: null
    },
    {
      name: "Lightweight",
      description: "For cars under 1200kg",
      minWeight: null,
      maxWeight: 1200
    },
    {
      name: "Middleweight",
      description: "For cars 1200-1500kg",
      minWeight: 1200,
      maxWeight: 1500
    },
    {
      name: "Heavyweight",
      description: "For cars over 1500kg",
      minWeight: 1500,
      maxWeight: null
    },
    {
      name: "FWD",
      description: "Front-wheel drive vehicles",
      minWeight: null,
      maxWeight: null
    },
    {
      name: "RWD",
      description: "Rear-wheel drive vehicles",
      minWeight: null,
      maxWeight: null
    },
    {
      name: "AWD",
      description: "All-wheel drive vehicles",
      minWeight: null,
      maxWeight: null
    },
    {
      name: "Electric",
      description: "Electric vehicles only",
      minWeight: null,
      maxWeight: null
    }
  ];

  for (const classData of globalClasses) {
    await prisma.globalClass.upsert({
      where: { name: classData.name },
      update: {},
      create: classData
    });
    console.log(`✅ Created/updated global class: ${classData.name}`);
  }

  console.log('🎉 Global classes seeded successfully!');
}

seedGlobalClasses()
  .catch((e) => {
    console.error('❌ Error seeding global classes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
