const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDefaultClubClasses() {
  try {
    // First, check if there are any clubs
    const clubs = await prisma.club.findMany();
    
    if (clubs.length === 0) {
      console.log('⚠️  No clubs found. Please create clubs first.');
      return;
    }

    const defaultClasses = [
      {
        name: "Autocross",
        description: "Traditional autocross racing class",
        minWeight: null,
        maxWeight: null
      },
      {
        name: "Rallycross",
        description: "Rallycross racing on mixed surfaces",
        minWeight: null,
        maxWeight: null
      },
      {
        name: "Crosskart",
        description: "Cross kart racing class",
        minWeight: null,
        maxWeight: null
      }
    ];

    console.log(`🏁 Adding default classes to ${clubs.length} clubs...`);

    for (const club of clubs) {
      console.log(`\n📋 Processing club: ${club.name}`);
      
      for (const classData of defaultClasses) {
        // Check if class already exists for this club
        const existingClass = await prisma.clubClass.findUnique({
          where: {
            clubId_name: {
              clubId: club.id,
              name: classData.name
            }
          }
        });

        if (existingClass) {
          console.log(`   ⚠️  Class "${classData.name}" already exists for ${club.name}`);
          continue;
        }

        // Create the class for this club
        await prisma.clubClass.create({
          data: {
            ...classData,
            clubId: club.id,
            isActive: true
          }
        });

        console.log(`   ✅ Added class: ${classData.name}`);
      }
    }

    console.log('\n🎉 Default club classes seeded successfully!');
  } catch (error) {
    console.error('Error seeding default club classes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDefaultClubClasses();
