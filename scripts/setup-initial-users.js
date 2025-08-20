const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setupInitialUsers() {
  try {
    console.log('🚀 Setting up initial users and club...\n');

    // 1. Create SUPERADMIN user
    const superAdminPassword = 'admin123';
    const hashedSuperAdminPassword = await bcrypt.hash(superAdminPassword, 12);

    const superAdmin = await prisma.user.upsert({
      where: { email: 'superadmin@scrutman.no' },
      update: {},
      create: {
        name: 'Super Administrator',
        email: 'superadmin@scrutman.no',
        password: hashedSuperAdminPassword,
        role: 'SUPERADMIN',
        phone: '+47 123 45 678'
      }
    });

    console.log('✅ Created SUPERADMIN user:');
    console.log(`   Email: superadmin@scrutman.no`);
    console.log(`   Password: ${superAdminPassword}`);
    console.log(`   Role: SUPERADMIN\n`);

    // 2. Create a sample club
    let club = await prisma.club.findFirst({
      where: { name: 'Demo Racing Club' }
    });

    if (!club) {
      club = await prisma.club.create({
        data: {
          name: 'Demo Racing Club',
          description: 'A demo club for testing the ScrutMan system',
          address: 'Raceway Street 1',
          city: 'Oslo',
          postalCode: '0123',
          country: 'Norway',
          phone: '+47 987 65 432',
          email: 'info@demoracing.no',
          website: 'https://demoracing.no'
        }
      });
    }

    console.log('✅ Created Demo Club:');
    console.log(`   Name: ${club.name}`);
    console.log(`   ID: ${club.id}\n`);

    // 3. Create CLUBADMIN user for the club
    const clubAdminPassword = 'clubadmin123';
    const hashedClubAdminPassword = await bcrypt.hash(clubAdminPassword, 12);

    const clubAdmin = await prisma.user.upsert({
      where: { email: 'admin@demoracing.no' },
      update: {},
      create: {
        name: 'Club Administrator',
        email: 'admin@demoracing.no',
        password: hashedClubAdminPassword,
        role: 'CLUBADMIN',
        phone: '+47 456 78 901',
        clubId: club.id
      }
    });

    console.log('✅ Created CLUBADMIN user:');
    console.log(`   Email: admin@demoracing.no`);
    console.log(`   Password: ${clubAdminPassword}`);
    console.log(`   Role: CLUBADMIN`);
    console.log(`   Club: ${club.name}\n`);

    // 4. Create default classes for the club
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

    console.log('📋 Creating default classes for the club...');
    
    for (const classData of defaultClasses) {
      const clubClass = await prisma.clubClass.upsert({
        where: {
          clubId_name: {
            clubId: club.id,
            name: classData.name
          }
        },
        update: {},
        create: {
          ...classData,
          clubId: club.id,
          isActive: true
        }
      });

      console.log(`   ✅ Created class: ${classData.name}`);
    }

    // 5. Create a sample athlete user
    const athletePassword = 'athlete123';
    const hashedAthletePassword = await bcrypt.hash(athletePassword, 12);

    const athlete = await prisma.user.upsert({
      where: { email: 'driver@example.no' },
      update: {},
      create: {
        name: 'Demo Driver',
        email: 'driver@example.no',
        password: hashedAthletePassword,
        role: 'ATHLETE',
        phone: '+47 789 01 234',
        licenseNumber: 'LIC123456',
        dateOfBirth: new Date('1990-01-01'),
        address: 'Driver Street 123',
        city: 'Bergen',
        postalCode: '5000',
        country: 'Norway'
      }
    });

    console.log('\n✅ Created ATHLETE user:');
    console.log(`   Email: driver@example.no`);
    console.log(`   Password: ${athletePassword}`);
    console.log(`   Role: ATHLETE\n`);

    // 6. Create a federation admin user
    const federationPassword = 'federation123';
    const hashedFederationPassword = await bcrypt.hash(federationPassword, 12);

    const federationAdmin = await prisma.user.upsert({
      where: { email: 'federation@nmkf.no' },
      update: {},
      create: {
        name: 'Federation Administrator',
        email: 'federation@nmkf.no',
        password: hashedFederationPassword,
        role: 'FEDERATION_ADMIN',
        phone: '+47 234 56 789',
        address: 'Forbundsveien 1',
        city: 'Oslo',
        postalCode: '0157',
        country: 'Norway'
      }
    });

    console.log('✅ Created FEDERATION_ADMIN user:');
    console.log(`   Email: federation@nmkf.no`);
    console.log(`   Password: ${federationPassword}`);
    console.log(`   Role: FEDERATION_ADMIN\n`);

    console.log('🎉 Initial setup completed successfully!');
    console.log('\n📋 Login credentials:');
    console.log('─'.repeat(50));
    console.log('SUPERADMIN:');
    console.log('  Email: superadmin@scrutman.no');
    console.log('  Password: admin123');
    console.log('\nCLUBADMIN:');
    console.log('  Email: admin@demoracing.no');
    console.log('  Password: clubadmin123');
    console.log('\nATHLETE:');
    console.log('  Email: driver@example.no');
    console.log('  Password: athlete123');
    console.log('\nFEDERATION_ADMIN:');
    console.log('  Email: federation@nmkf.no');
    console.log('  Password: federation123');
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('❌ Error setting up initial users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupInitialUsers();
