/**
 * ScrutMan — Demo seed
 * Kjør: node scripts/seed.js
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const p = new PrismaClient();

async function hash(pw) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("🌱 Seeding demo data...\n");

  // ─── 1. Brukere ───────────────────────────────────────────────────────────
  const [superadmin, fedAdmin, clubAdmin, inspector, athlete1, athlete2, athlete3, athlete4] =
    await Promise.all([
      p.user.upsert({
        where: { email: "superadmin@scrutman.no" },
        update: {},
        create: {
          email: "superadmin@scrutman.no",
          name: "System Admin",
          password: await hash("Admin123!"),
          role: "SUPERADMIN",
        },
      }),
      p.user.upsert({
        where: { email: "fed@scrutman.no" },
        update: {},
        create: {
          email: "fed@scrutman.no",
          name: "Federation Admin",
          password: await hash("Admin123!"),
          role: "FEDERATION_ADMIN",
        },
      }),
      p.user.upsert({
        where: { email: "klubb@scrutman.no" },
        update: {},
        create: {
          email: "klubb@scrutman.no",
          name: "Club Admin",
          password: await hash("Admin123!"),
          role: "CLUBADMIN",
        },
      }),
      p.user.upsert({
        where: { email: "inspektor@scrutman.no" },
        update: {},
        create: {
          email: "inspektor@scrutman.no",
          name: "Technical Inspector",
          password: await hash("Admin123!"),
          role: "TECHNICAL_INSPECTOR",
        },
      }),
      p.user.upsert({
        where: { email: "forer1@scrutman.no" },
        update: {},
        create: {
          email: "forer1@scrutman.no",
          name: "James Wilson",
          password: await hash("Forer123!"),
          role: "ATHLETE",
          phone: "+47 900 00 001",
          licenseNumber: "NMF-2024-001",
          dateOfBirth: new Date("1990-05-15"),
          address: "1 Motorsport Road",
          city: "Oslo",
          postalCode: "0001",
          country: "Norway",
          emergencyContact: "Sarah Wilson",
          emergencyPhone: "+47 900 00 002",
        },
      }),
      p.user.upsert({
        where: { email: "forer2@scrutman.no" },
        update: {},
        create: {
          email: "forer2@scrutman.no",
          name: "Mark Thompson",
          password: await hash("Forer123!"),
          role: "ATHLETE",
          phone: "+47 900 00 003",
          licenseNumber: "NMF-2024-002",
          dateOfBirth: new Date("1985-08-22"),
          city: "Bergen",
          country: "Norway",
        },
      }),
      p.user.upsert({
        where: { email: "forer3@scrutman.no" },
        update: {},
        create: {
          email: "forer3@scrutman.no",
          name: "Emma Larsen",
          password: await hash("Forer123!"),
          role: "ATHLETE",
          phone: "+47 900 00 004",
          licenseNumber: "NMF-2024-003",
          dateOfBirth: new Date("1995-03-10"),
          city: "Trondheim",
          country: "Norway",
        },
      }),
      p.user.upsert({
        where: { email: "forer4@scrutman.no" },
        update: {},
        create: {
          email: "forer4@scrutman.no",
          name: "Lucas Berger",
          password: await hash("Forer123!"),
          role: "ATHLETE",
          phone: "+47 900 00 005",
          licenseNumber: "NMF-2024-004",
          dateOfBirth: new Date("1993-11-28"),
          city: "Stavanger",
          country: "Norway",
        },
      }),
    ]);
  console.log("✅ Users created");

  // ─── 2. Klubb ─────────────────────────────────────────────────────────────
  const club = await p.club.upsert({
    where: { id: "demo-club-1" },
    update: {},
    create: {
      id: "demo-club-1",
      name: "Oslo Motorsport Club",
      description: "Norway's leading autocross and rallycross club",
      address: "10 Motorsport Road",
      city: "Oslo",
      postalCode: "0666",
      country: "Norway",
      phone: "+47 22 00 00 01",
      email: "info@oslomotorsport.no",
      website: "https://oslomotorsport.no",
    },
  });

  // Knytt brukere til klubb
  await p.user.updateMany({
    where: { id: { in: [clubAdmin.id, inspector.id, athlete1.id, athlete2.id, athlete3.id, athlete4.id] } },
    data: { clubId: club.id },
  });
  console.log("✅ Club created and users linked");

  // ─── 3. Sub-disciplines (Autocross — per INFO TYRES 2026/2025) ───────────
  //  Must be created before approved tires so we can link them
  const [subSB, subB1600, subJB, subCC, subCCJ] = await Promise.all([
    p.subDiscipline.upsert({
      where: { parentCategory_shortCode_season: { parentCategory: "AUTOCROSS", shortCode: "SB", season: 2026 } },
      update: { name: "SuperBuggy", maxTotal: 10, maxNew: 6, isActive: true },
      create: { parentCategory: "AUTOCROSS", name: "SuperBuggy", shortCode: "SB", season: 2026, maxTotal: 10, maxNew: 6, isActive: true },
    }),
    p.subDiscipline.upsert({
      where: { parentCategory_shortCode_season: { parentCategory: "AUTOCROSS", shortCode: "B1600", season: 2026 } },
      update: { name: "Buggy 1600", maxTotal: 8, maxNew: 4, isActive: true },
      create: { parentCategory: "AUTOCROSS", name: "Buggy 1600", shortCode: "B1600", season: 2026, maxTotal: 8, maxNew: 4, isActive: true },
    }),
    p.subDiscipline.upsert({
      where: { parentCategory_shortCode_season: { parentCategory: "AUTOCROSS", shortCode: "JB", season: 2026 } },
      update: { name: "Junior Buggy (Junior 1600)", maxTotal: 8, maxNew: 4, isActive: true },
      create: { parentCategory: "AUTOCROSS", name: "Junior Buggy (Junior 1600)", shortCode: "JB", season: 2026, maxTotal: 8, maxNew: 4, isActive: true },
    }),
    p.subDiscipline.upsert({
      where: { parentCategory_shortCode_season: { parentCategory: "AUTOCROSS", shortCode: "CC", season: 2026 } },
      update: { name: "CrossCar", maxTotal: 6, maxNew: 4, isActive: true },
      create: { parentCategory: "AUTOCROSS", name: "CrossCar", shortCode: "CC", season: 2026, maxTotal: 6, maxNew: 4, isActive: true },
    }),
    p.subDiscipline.upsert({
      where: { parentCategory_shortCode_season: { parentCategory: "AUTOCROSS", shortCode: "CCJ", season: 2026 } },
      update: { name: "CrossCar Junior", maxTotal: 6, maxNew: 4, isActive: true },
      create: { parentCategory: "AUTOCROSS", name: "CrossCar Junior", shortCode: "CCJ", season: 2026, maxTotal: 6, maxNew: 4, isActive: true },
    }),
  ]);
  console.log("✅ Sub-disciplines (Autocross 2026) created");

  // ─── 4. Approved tyres (FIA LT54 — actual models per regulation) ──────────
  //
  //  SuperBuggy:          Michelin R800K71   (rear/all)
  //  Buggy 1600 + JB:     Michelin R800K33   (rear/all)
  //  CrossCar + CCJ:      Michelin C9205     (front, 3 per set)
  //                       Michelin C9203     (rear,  3 per set)
  //
  const [tireR800K71, tireR800K33, tireC9205, tireC9203] = await Promise.all([
    p.approvedTire.upsert({
      where: { id: "at-michelin-r800k71" },
      update: {},
      create: {
        id: "at-michelin-r800k71",
        manufacturer: "Michelin",
        model: "R800K71",
        size: "Buggy (rear)",
        compound: "Off-road",
        euRegRef: "FIA LT54 / INFO TYRES 2026",
        disciplines: JSON.stringify(["AUTOCROSS"]),
        subDisciplineId: subSB.id,
        fiaManufacturerCode: 1,
        rfidChipModel: "Impinj Monza R6P",
        barcodeSupplier: "Seriplastica",
        isActive: true,
        approvedById: fedAdmin.id,
      },
    }),
    p.approvedTire.upsert({
      where: { id: "at-michelin-r800k33" },
      update: {},
      create: {
        id: "at-michelin-r800k33",
        manufacturer: "Michelin",
        model: "R800K33",
        size: "Buggy 1600 / Junior",
        compound: "Off-road",
        euRegRef: "FIA LT54 / INFO TYRES 2026",
        disciplines: JSON.stringify(["AUTOCROSS"]),
        subDisciplineId: subB1600.id,
        fiaManufacturerCode: 1,
        rfidChipModel: "Impinj Monza R6P",
        barcodeSupplier: "Seriplastica",
        isActive: true,
        approvedById: fedAdmin.id,
      },
    }),
    p.approvedTire.upsert({
      where: { id: "at-michelin-c9205" },
      update: {},
      create: {
        id: "at-michelin-c9205",
        manufacturer: "Michelin",
        model: "C9205",
        size: "CrossCar (front)",
        compound: "Off-road front",
        euRegRef: "FIA LT54 / INFO TYRES 2026",
        disciplines: JSON.stringify(["AUTOCROSS"]),
        subDisciplineId: subCC.id,
        fiaManufacturerCode: 1,
        rfidChipModel: "Impinj Monza R6P",
        barcodeSupplier: "Seriplastica",
        isActive: true,
        approvedById: fedAdmin.id,
      },
    }),
    p.approvedTire.upsert({
      where: { id: "at-michelin-c9203" },
      update: {},
      create: {
        id: "at-michelin-c9203",
        manufacturer: "Michelin",
        model: "C9203",
        size: "CrossCar (rear)",
        compound: "Off-road rear",
        euRegRef: "FIA LT54 / INFO TYRES 2026",
        disciplines: JSON.stringify(["AUTOCROSS"]),
        subDisciplineId: subCC.id,
        fiaManufacturerCode: 1,
        rfidChipModel: "Impinj Monza R6P",
        barcodeSupplier: "Seriplastica",
        isActive: true,
        approvedById: fedAdmin.id,
      },
    }),
  ]);
  console.log("✅ Approved tyres (FIA regulation models) created");

  // ─── 5. Tyre limits per discipline + sub-discipline ───────────────────────
  //  General fallback limits (no sub-discipline)
  const generalLimits = [
    { discipline: "AUTOCROSS",   maxTires: 10 },
    { discipline: "BILCROSS",    maxTires: 8 },
    { discipline: "RALLYCROSS",  maxTires: 10 },
    { discipline: "CIRCUIT",     maxTires: 12 },
    { discipline: "TIME_ATTACK", maxTires: 6 },
  ];
  for (const ld of generalLimits) {
    const existing = await p.disciplineTireLimit.findFirst({
      where: { discipline: ld.discipline, subDisciplineId: null },
    });
    if (!existing) {
      await p.disciplineTireLimit.create({
        data: { discipline: ld.discipline, maxTires: ld.maxTires, setById: fedAdmin.id },
      });
    }
  }
  // Sub-discipline specific limits (mirror the SubDiscipline.maxTotal/maxNew)
  const subLimits = [
    { discipline: "AUTOCROSS", subId: subSB.id,    maxTires: 10, maxNew: 6 },
    { discipline: "AUTOCROSS", subId: subB1600.id, maxTires: 8,  maxNew: 4 },
    { discipline: "AUTOCROSS", subId: subJB.id,    maxTires: 8,  maxNew: 4 },
    { discipline: "AUTOCROSS", subId: subCC.id,    maxTires: 6,  maxNew: 4 },
    { discipline: "AUTOCROSS", subId: subCCJ.id,   maxTires: 6,  maxNew: 4 },
  ];
  for (const sl of subLimits) {
    const existing = await p.disciplineTireLimit.findFirst({
      where: { discipline: sl.discipline, subDisciplineId: sl.subId },
    });
    if (!existing) {
      await p.disciplineTireLimit.create({
        data: { discipline: sl.discipline, subDisciplineId: sl.subId, maxTires: sl.maxTires, maxNewTires: sl.maxNew, setById: fedAdmin.id },
      });
    }
  }
  console.log("✅ Tyre limits created (general + per sub-discipline)");

  // ─── 6. Vehicles ─────────────────────────────────────────────────────────
  //  Realistic buggy/crosscar vehicles matching the sub-disciplines
  const [car1, car2, car3, car4] = await Promise.all([
    p.userVehicle.upsert({
      where: { userId_startNumber: { userId: athlete1.id, startNumber: "11" } },
      update: {},
      create: {
        userId: athlete1.id,
        startNumber: "11",
        make: "Speedcar",
        model: "SuperBuggy XTREM",
        year: 2023,
        color: "Red/White",
        licensePlate: "SB-011",
        category: "AUTOCROSS",
        transponderNumber: "TRX-001",
      },
    }),
    p.userVehicle.upsert({
      where: { userId_startNumber: { userId: athlete2.id, startNumber: "22" } },
      update: {},
      create: {
        userId: athlete2.id,
        startNumber: "22",
        make: "PH Motorsport",
        model: "Buggy 1600 RS",
        year: 2022,
        color: "Blue",
        licensePlate: "B1600-022",
        category: "AUTOCROSS",
        transponderNumber: "TRX-002",
      },
    }),
    p.userVehicle.upsert({
      where: { userId_startNumber: { userId: athlete3.id, startNumber: "33" } },
      update: {},
      create: {
        userId: athlete3.id,
        startNumber: "33",
        make: "Margard",
        model: "CrossCar 250",
        year: 2024,
        color: "Yellow",
        licensePlate: "CC-033",
        category: "AUTOCROSS",
        transponderNumber: "TRX-003",
      },
    }),
    p.userVehicle.upsert({
      where: { userId_startNumber: { userId: athlete4.id, startNumber: "44" } },
      update: {},
      create: {
        userId: athlete4.id,
        startNumber: "44",
        make: "Speedcar",
        model: "SuperBuggy XTREM",
        year: 2022,
        color: "Green/Black",
        licensePlate: "SB-044",
        category: "AUTOCROSS",
        transponderNumber: "TRX-004",
      },
    }),
  ]);
  console.log("✅ Vehicles created");

  // ─── 7. Event ─────────────────────────────────────────────────────────────
  const now = new Date();
  let event = await p.event.findFirst({ where: { title: "Oslo Autocross Cup 2026 — Round 1", clubId: club.id } });
  if (!event) {
    event = await p.event.create({
      data: {
        title: "Oslo Autocross Cup 2026 — Round 1",
        description: "First round of the Oslo Autocross Cup 2026 season at Rudskogen. Classes: SuperBuggy, Buggy 1600, Junior Buggy, CrossCar and CrossCar Junior.",
        startDate: new Date(now.getFullYear(), now.getMonth() + 1, 14, 9, 0),
        endDate:   new Date(now.getFullYear(), now.getMonth() + 1, 14, 18, 0),
        location: "Rudskogen Motorsenter, Øyern",
        status: "PUBLISHED",
        maxParticipants: 80,
        registrationStartDate: new Date(),
        registrationEndDate: new Date(now.getFullYear(), now.getMonth() + 1, 10),
        requiresVehicle: true,
        clubId: club.id,
      },
    });
  }

  // Classes per sub-discipline (skip if already exist for this event)
  const existingClasses = await p.class.findMany({ where: { eventId: event.id } });
  const klasseSB = existingClasses.find(c => c.name === "SuperBuggy")
    ?? await p.class.create({ data: { name: "SuperBuggy", eventId: event.id, minWeight: 390, maxWeight: 450 } });
  const klasseB1600 = existingClasses.find(c => c.name === "Buggy 1600 / Junior Buggy")
    ?? await p.class.create({ data: { name: "Buggy 1600 / Junior Buggy", eventId: event.id, minWeight: 330, maxWeight: 390 } });
  const klasseCC = existingClasses.find(c => c.name === "CrossCar / CrossCar Junior")
    ?? await p.class.create({ data: { name: "CrossCar / CrossCar Junior", eventId: event.id, minWeight: 260, maxWeight: 310 } });
  console.log("✅ Event and classes created");

  // ─── 8. Registrations ────────────────────────────────────────────────────
  const makeReg = async (startNumber, status, userId, classId, vehicleId, depot) => {
    const existing = await p.registration.findFirst({ where: { eventId: event.id, startNumber } });
    if (existing) return existing;
    return p.registration.create({ data: { startNumber, status, userId, eventId: event.id, classId, userVehicleId: vehicleId, depotSize: depot } });
  };
  const [reg1, reg2, reg3, reg4] = await Promise.all([
    makeReg(11, "CONFIRMED",  athlete1.id, klasseSB.id,    car1.id, "MEDIUM"),
    makeReg(22, "CONFIRMED",  athlete2.id, klasseB1600.id, car2.id, "MEDIUM"),
    makeReg(33, "WAITLISTED", athlete3.id, klasseCC.id,    car3.id, "SMALL"),
    makeReg(44, "CONFIRMED",  athlete4.id, klasseSB.id,    car4.id, "MEDIUM"),
  ]);
  console.log("✅ Registrations created");

  // ─── 9. Tyres (real Michelin models per FIA INFO TYRES 2026) ─────────────
  //
  //  James Wilson  — SuperBuggy  — Michelin R800K71 (6 new + 4 used = 10 total)
  //  Mark Thompson — Buggy 1600  — Michelin R800K33 (4 new + 4 used = 8 total)
  //  Emma Larsen   — CrossCar    — Michelin C9205 front (3) + C9203 rear (3) = 6 total
  //
  const tireData = [
    // James Wilson — SuperBuggy — Michelin R800K71 — 10 tyres (6 new, 4 used)
    { rfidEpc: "E28011700000010000000001", barcodeNumber: "11000001", approvedTireId: tireR800K71.id, ownerId: athlete1.id, serialNumber: "SB-26-001", discipline: "AUTOCROSS", subId: subSB.id, isNew: true },
    { rfidEpc: "E28011700000010000000002", barcodeNumber: "11000002", approvedTireId: tireR800K71.id, ownerId: athlete1.id, serialNumber: "SB-26-002", discipline: "AUTOCROSS", subId: subSB.id, isNew: true },
    { rfidEpc: "E28011700000010000000003", barcodeNumber: "11000003", approvedTireId: tireR800K71.id, ownerId: athlete1.id, serialNumber: "SB-26-003", discipline: "AUTOCROSS", subId: subSB.id, isNew: true },
    { rfidEpc: "E28011700000010000000004", barcodeNumber: "11000004", approvedTireId: tireR800K71.id, ownerId: athlete1.id, serialNumber: "SB-26-004", discipline: "AUTOCROSS", subId: subSB.id, isNew: true },
    { rfidEpc: "E28011700000010000000005", barcodeNumber: "11000005", approvedTireId: tireR800K71.id, ownerId: athlete1.id, serialNumber: "SB-26-005", discipline: "AUTOCROSS", subId: subSB.id, isNew: true },
    { rfidEpc: "E28011700000010000000006", barcodeNumber: "11000006", approvedTireId: tireR800K71.id, ownerId: athlete1.id, serialNumber: "SB-26-006", discipline: "AUTOCROSS", subId: subSB.id, isNew: true },
    { rfidEpc: "E28011700000010000000007", barcodeNumber: "11000007", approvedTireId: tireR800K71.id, ownerId: athlete1.id, serialNumber: "SB-25-007", discipline: "AUTOCROSS", subId: subSB.id, isNew: false },
    { rfidEpc: "E28011700000010000000008", barcodeNumber: "11000008", approvedTireId: tireR800K71.id, ownerId: athlete1.id, serialNumber: "SB-25-008", discipline: "AUTOCROSS", subId: subSB.id, isNew: false },
    { rfidEpc: "E28011700000010000000009", barcodeNumber: "11000009", approvedTireId: tireR800K71.id, ownerId: athlete1.id, serialNumber: "SB-25-009", discipline: "AUTOCROSS", subId: subSB.id, isNew: false },
    { rfidEpc: "E28011700000010000000010", barcodeNumber: "11000010", approvedTireId: tireR800K71.id, ownerId: athlete1.id, serialNumber: "SB-25-010", discipline: "AUTOCROSS", subId: subSB.id, isNew: false },
    // Mark Thompson — Buggy 1600 — Michelin R800K33 — 8 tyres (4 new, 4 used)
    { rfidEpc: "E28011700000020000000001", barcodeNumber: "12000001", approvedTireId: tireR800K33.id, ownerId: athlete2.id, serialNumber: "B1600-26-001", discipline: "AUTOCROSS", subId: subB1600.id, isNew: true },
    { rfidEpc: "E28011700000020000000002", barcodeNumber: "12000002", approvedTireId: tireR800K33.id, ownerId: athlete2.id, serialNumber: "B1600-26-002", discipline: "AUTOCROSS", subId: subB1600.id, isNew: true },
    { rfidEpc: "E28011700000020000000003", barcodeNumber: "12000003", approvedTireId: tireR800K33.id, ownerId: athlete2.id, serialNumber: "B1600-26-003", discipline: "AUTOCROSS", subId: subB1600.id, isNew: true },
    { rfidEpc: "E28011700000020000000004", barcodeNumber: "12000004", approvedTireId: tireR800K33.id, ownerId: athlete2.id, serialNumber: "B1600-26-004", discipline: "AUTOCROSS", subId: subB1600.id, isNew: true },
    { rfidEpc: "E28011700000020000000005", barcodeNumber: "12000005", approvedTireId: tireR800K33.id, ownerId: athlete2.id, serialNumber: "B1600-25-005", discipline: "AUTOCROSS", subId: subB1600.id, isNew: false },
    { rfidEpc: "E28011700000020000000006", barcodeNumber: "12000006", approvedTireId: tireR800K33.id, ownerId: athlete2.id, serialNumber: "B1600-25-006", discipline: "AUTOCROSS", subId: subB1600.id, isNew: false },
    { rfidEpc: "E28011700000020000000007", barcodeNumber: "12000007", approvedTireId: tireR800K33.id, ownerId: athlete2.id, serialNumber: "B1600-25-007", discipline: "AUTOCROSS", subId: subB1600.id, isNew: false },
    { rfidEpc: "E28011700000020000000008", barcodeNumber: "12000008", approvedTireId: tireR800K33.id, ownerId: athlete2.id, serialNumber: "B1600-25-008", discipline: "AUTOCROSS", subId: subB1600.id, isNew: false },
    // Emma Larsen — CrossCar — Michelin C9205 (front 3) + C9203 (rear 3) = 6 total
    { rfidEpc: "E28011700000030000000001", barcodeNumber: "13000001", approvedTireId: tireC9205.id, ownerId: athlete3.id, serialNumber: "CC-F-26-001", discipline: "AUTOCROSS", subId: subCC.id, isNew: true },
    { rfidEpc: "E28011700000030000000002", barcodeNumber: "13000002", approvedTireId: tireC9205.id, ownerId: athlete3.id, serialNumber: "CC-F-26-002", discipline: "AUTOCROSS", subId: subCC.id, isNew: true },
    { rfidEpc: "E28011700000030000000003", barcodeNumber: "13000003", approvedTireId: tireC9205.id, ownerId: athlete3.id, serialNumber: "CC-F-25-003", discipline: "AUTOCROSS", subId: subCC.id, isNew: false },
    { rfidEpc: "E28011700000030000000004", barcodeNumber: "13000004", approvedTireId: tireC9203.id, ownerId: athlete3.id, serialNumber: "CC-R-26-004", discipline: "AUTOCROSS", subId: subCC.id, isNew: true },
    { rfidEpc: "E28011700000030000000005", barcodeNumber: "13000005", approvedTireId: tireC9203.id, ownerId: athlete3.id, serialNumber: "CC-R-26-005", discipline: "AUTOCROSS", subId: subCC.id, isNew: true },
    { rfidEpc: "E28011700000030000000006", barcodeNumber: "13000006", approvedTireId: tireC9203.id, ownerId: athlete3.id, serialNumber: "CC-R-25-006", discipline: "AUTOCROSS", subId: subCC.id, isNew: false },
    // Lucas Berger — SuperBuggy — Michelin R800K71 — 4 registered tyres (2 new, 2 used)
    // NOTE: tires[24..27] — front-left (idx 24) is the one swapped illegally before heat 1
    { rfidEpc: "E28011700000040000000001", barcodeNumber: "14000001", approvedTireId: tireR800K71.id, ownerId: athlete4.id, serialNumber: "SB-26-041", discipline: "AUTOCROSS", subId: subSB.id, isNew: true },
    { rfidEpc: "E28011700000040000000002", barcodeNumber: "14000002", approvedTireId: tireR800K71.id, ownerId: athlete4.id, serialNumber: "SB-26-042", discipline: "AUTOCROSS", subId: subSB.id, isNew: true },
    { rfidEpc: "E28011700000040000000003", barcodeNumber: "14000003", approvedTireId: tireR800K71.id, ownerId: athlete4.id, serialNumber: "SB-25-043", discipline: "AUTOCROSS", subId: subSB.id, isNew: false },
    { rfidEpc: "E28011700000040000000004", barcodeNumber: "14000004", approvedTireId: tireR800K71.id, ownerId: athlete4.id, serialNumber: "SB-25-044", discipline: "AUTOCROSS", subId: subSB.id, isNew: false },
  ];

  const tires = [];
  for (const t of tireData) {
    let tire = await p.tire.findUnique({ where: { rfidEpc: t.rfidEpc } });
    if (!tire) {
      tire = await p.tire.create({
        data: {
          rfidEpc: t.rfidEpc,
          barcodeNumber: t.barcodeNumber,
          approvedTireId: t.approvedTireId,
          currentOwnerId: t.ownerId,
          serialNumber: t.serialNumber,
          discipline: t.discipline,
          subDisciplineId: t.subId,
          isNewForOwner: t.isNew,
          season: 2026,
          status: "ACTIVE",
        },
      });
      await p.tireOwnership.create({
        data: { tireId: tire.id, ownerId: t.ownerId, isNewAtAcquisition: t.isNew },
      });
    }
    tires.push(tire);
  }
  console.log(`✅ Tyres: ${tires.length} tyres with RFID + FIA barcode`);

  // ─── 10. Register tyres for event ────────────────────────────────────────
  //  James (SuperBuggy): 10 tyres on reg1 (indices 0-9)
  //  Mark  (Buggy 1600): 8 tyres on reg2  (indices 10-17)
  //  Emma  (CrossCar):   6 tyres on reg3  (indices 18-23) — but she's waitlisted
  const regTirePairs = [
    { reg: reg1, tireIdx: [0,1,2,3,4,5,6,7,8,9] },
    { reg: reg2, tireIdx: [10,11,12,13,14,15,16,17] },
    { reg: reg4, tireIdx: [24,25,26,27] },
  ];
  for (const { reg, tireIdx } of regTirePairs) {
    for (const idx of tireIdx) {
      const exists = await p.eventTireRegistration.findUnique({
        where: { registrationId_tireId: { registrationId: reg.id, tireId: tires[idx].id } },
      });
      if (!exists) {
        await p.eventTireRegistration.create({
          data: { eventId: event.id, registrationId: reg.id, tireId: tires[idx].id },
        });
      }
    }
  }
  console.log("✅ Tyres registered for event");

  // ─── 11. Technical check + weight check (James Wilson) ───────────────────
  const existingTech = await p.technicalCheck.findUnique({ where: { registrationId: reg1.id } });
  if (!existingTech) {
    await p.technicalCheck.create({
      data: { registrationId: reg1.id, status: true, notes: "All checks passed — SuperBuggy class" },
    });
  }
  const existingWeight = await p.weightCheck.findUnique({ where: { registrationId: reg1.id } });
  if (!existingWeight) {
    await p.weightCheck.create({
      data: { registrationId: reg1.id, weight: 412.0, status: true, notes: "Within SuperBuggy weight limit (390–450 kg)" },
    });
  }
  console.log("✅ Technical check and weight check created");

  // ─── 12. Federation + FIA delegate ───────────────────────────────────────
  const federation = await p.federation.upsert({
    where: { name: "FIA (Fédération Internationale de l'Automobile)" },
    update: {},
    create: {
      name: "FIA (Fédération Internationale de l'Automobile)",
      country: "France",
      website: "https://fia.com",
    },
  });

  const fiaDelegate = await p.user.upsert({
    where: { email: "delegate@fia.com" },
    update: {},
    create: {
      email: "delegate@fia.com",
      name: "FIA Technical Delegate",
      password: await hash("Delegate123!"),
      role: "FIA_DELEGATE",
      licenseNumber: "FIA-TD-001",
      federationId: federation.id,
    },
  });
  console.log("✅ Federation and FIA delegate created");

  // ─── 13. Sample scan logs ─────────────────────────────────────────────────
  await p.scanLog.deleteMany({ where: { localId: { in: ["demo-scan-1","demo-scan-2","demo-scan-3","demo-scan-4"] } } });
  await p.scanLog.createMany({
    data: [
      // Green: James Wilson SuperBuggy tyre scanned via portal
      { localId: "demo-scan-1", eventId: event.id, scanMode: "RFID", identifier: tires[0].rfidEpc, outcome: "GREEN", reason: "Approved — Michelin R800K71 registered for SuperBuggy (FIA LT54)", tireId: tires[0].id, registrationId: reg1.id, scannedAt: new Date(), nodeId: "node-portal-1", nodeName: "Tyre Scanner Portal 1" },
      // Green: Mark Thompson Buggy 1600 tyre scanned via barcode
      { localId: "demo-scan-2", eventId: event.id, scanMode: "BARCODE", identifier: tires[10].barcodeNumber, outcome: "GREEN", reason: "Approved — Michelin R800K33 registered for Buggy 1600 (FIA LT54)", tireId: tires[10].id, registrationId: reg2.id, scannedAt: new Date(), nodeId: "node-handheld-1", nodeName: "Handheld Scanner 1" },
      // Red: unknown RFID
      { localId: "demo-scan-3", eventId: event.id, scanMode: "RFID", identifier: "AABBCCDD00000000FFFFFFFF", outcome: "RED", reason: "RFID EPC code not found in the system. Tyre is not registered.", scannedAt: new Date(), nodeId: "node-portal-1", nodeName: "Tyre Scanner Portal 1" },
      // Yellow: Emma's CrossCar tyre — driver is waitlisted
      { localId: "demo-scan-4", eventId: event.id, scanMode: "RFID", identifier: tires[18].rfidEpc, outcome: "YELLOW", reason: "Michelin C9205 found — driver is waitlisted, not yet confirmed for this event.", tireId: tires[18].id, scannedAt: new Date(), nodeId: "node-handheld-1", nodeName: "Handheld Scanner 1" },
    ],
  });
  console.log("✅ Sample scan logs created");

  // ─── 14. Tyre Scan Sessions (portal scan results per heat) ────────────────
  // Clear existing demo sessions so re-seeding is idempotent
  await p.tyreScanSession.deleteMany({ where: { eventId: event.id } });

  const wheel = (pos, label, outcome, detail, epc, make, model, serial) => ({
    pos, label, outcome,
    resultLabel: outcome === "GREEN" ? "OK — Registered" : "FAIL",
    detail: detail ?? "",
    rfidEpc: epc ?? null,
    manufacturer: make ?? null,
    model: model ?? null,
    serialNumber: serial ?? null,
  });

  // Convenience: all-green set for James (uses first 4 registered tires)
  const jamesWheelsOK = JSON.stringify([
    wheel("FL", "Front Left",  "GREEN", null, tires[0].rfidEpc, "Michelin", "R800K71", tires[0].serialNumber),
    wheel("FR", "Front Right", "GREEN", null, tires[1].rfidEpc, "Michelin", "R800K71", tires[1].serialNumber),
    wheel("RL", "Rear Left",   "GREEN", null, tires[2].rfidEpc, "Michelin", "R800K71", tires[2].serialNumber),
    wheel("RR", "Rear Right",  "GREEN", null, tires[3].rfidEpc, "Michelin", "R800K71", tires[3].serialNumber),
  ]);

  // All-green set for Mark (uses first 4 of his tires)
  const markWheelsOK = JSON.stringify([
    wheel("FL", "Front Left",  "GREEN", null, tires[10].rfidEpc, "Michelin", "R800K33", tires[10].serialNumber),
    wheel("FR", "Front Right", "GREEN", null, tires[11].rfidEpc, "Michelin", "R800K33", tires[11].serialNumber),
    wheel("RL", "Rear Left",   "GREEN", null, tires[12].rfidEpc, "Michelin", "R800K33", tires[12].serialNumber),
    wheel("RR", "Rear Right",  "GREEN", null, tires[13].rfidEpc, "Michelin", "R800K33", tires[13].serialNumber),
  ]);

  // Lucas — Heat 1: FRONT-LEFT fails (illegal RFID, not registered to this driver)
  const lucasWheelsFail = JSON.stringify([
    wheel("FL", "Front Left",  "RED",   "RFID tag not registered to this driver — tyre not in event registration", "E2801170DEADBEEF00000001", null, null, null),
    wheel("FR", "Front Right", "GREEN", null, tires[25].rfidEpc, "Michelin", "R800K71", tires[25].serialNumber),
    wheel("RL", "Rear Left",   "GREEN", null, tires[26].rfidEpc, "Michelin", "R800K71", tires[26].serialNumber),
    wheel("RR", "Rear Right",  "GREEN", null, tires[27].rfidEpc, "Michelin", "R800K71", tires[27].serialNumber),
  ]);

  // Lucas — Heat 2: driver replaced front-left with his registered tyre — all PASS
  const lucasWheelsOK = JSON.stringify([
    wheel("FL", "Front Left",  "GREEN", null, tires[24].rfidEpc, "Michelin", "R800K71", tires[24].serialNumber),
    wheel("FR", "Front Right", "GREEN", null, tires[25].rfidEpc, "Michelin", "R800K71", tires[25].serialNumber),
    wheel("RL", "Rear Left",   "GREEN", null, tires[26].rfidEpc, "Michelin", "R800K71", tires[26].serialNumber),
    wheel("RR", "Rear Right",  "GREEN", null, tires[27].rfidEpc, "Michelin", "R800K71", tires[27].serialNumber),
  ]);

  const baseTime = new Date(event.startDate);
  baseTime.setHours(9, 0, 0, 0);
  const t = (offsetMin) => new Date(baseTime.getTime() + offsetMin * 60 * 1000);

  await p.tyreScanSession.createMany({
    data: [
      // ── Heat 1 ──
      {
        eventId: event.id,
        registrationId: reg1.id,
        startNumber: "11",
        driverName: "James Wilson",
        vehicleName: "Speedcar SuperBuggy XTREM",
        subDiscipline: "SuperBuggy",
        heat: "1",
        overallResult: "PASS",
        wheelResults: jamesWheelsOK,
        notes: null,
        scannedById: inspector.id,
        createdAt: t(10),
      },
      {
        eventId: event.id,
        registrationId: reg2.id,
        startNumber: "22",
        driverName: "Mark Thompson",
        vehicleName: "PH Motorsport Buggy 1600 RS",
        subDiscipline: "Buggy 1600",
        heat: "1",
        overallResult: "PASS",
        wheelResults: markWheelsOK,
        notes: null,
        scannedById: inspector.id,
        createdAt: t(15),
      },
      {
        eventId: event.id,
        registrationId: reg4.id,
        startNumber: "44",
        driverName: "Lucas Berger",
        vehicleName: "Speedcar SuperBuggy XTREM",
        subDiscipline: "SuperBuggy",
        heat: "1",
        overallResult: "FAIL",
        wheelResults: lucasWheelsFail,
        notes: "Front-left tyre RFID (E2801170DEADBEEF00000001) is not registered to this driver. Tyre withheld by technical inspector pending FIA review. Driver notified and given 30 minutes to remedy.",
        scannedById: inspector.id,
        createdAt: t(20),
      },
      // ── Heat 2 — James and Mark pass again, Lucas now corrected ──
      {
        eventId: event.id,
        registrationId: reg1.id,
        startNumber: "11",
        driverName: "James Wilson",
        vehicleName: "Speedcar SuperBuggy XTREM",
        subDiscipline: "SuperBuggy",
        heat: "2",
        overallResult: "PASS",
        wheelResults: jamesWheelsOK,
        notes: null,
        scannedById: inspector.id,
        createdAt: t(95),
      },
      {
        eventId: event.id,
        registrationId: reg2.id,
        startNumber: "22",
        driverName: "Mark Thompson",
        vehicleName: "PH Motorsport Buggy 1600 RS",
        subDiscipline: "Buggy 1600",
        heat: "2",
        overallResult: "PASS",
        wheelResults: markWheelsOK,
        notes: null,
        scannedById: inspector.id,
        createdAt: t(100),
      },
      {
        eventId: event.id,
        registrationId: reg4.id,
        startNumber: "44",
        driverName: "Lucas Berger",
        vehicleName: "Speedcar SuperBuggy XTREM",
        subDiscipline: "SuperBuggy",
        heat: "2",
        overallResult: "PASS",
        wheelResults: lucasWheelsOK,
        notes: "Front-left tyre replaced with registered tyre SB-26-041 (E28011700000040000000001). Cleared for Heat 2.",
        scannedById: inspector.id,
        createdAt: t(105),
      },
    ],
  });
  console.log("✅ Tyre scan sessions created (Heat 1 + Heat 2, Lucas FAIL → PASS)");

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              ScrutMan — Demo seed complete!                  ║
╠══════════════════════════════════════════════════════════════╣
║  Logins:                                                     ║
║  superadmin@scrutman.no   Admin123!    SUPERADMIN            ║
║  fed@scrutman.no          Admin123!    FEDERATION_ADMIN      ║
║  delegate@fia.com         Delegate123! FIA_DELEGATE          ║
║  klubb@scrutman.no        Admin123!    CLUBADMIN             ║
║  inspektor@scrutman.no    Admin123!    TECHNICAL_INSPECTOR   ║
║  forer1@scrutman.no       Forer123!    James Wilson (SB #11) ║
║  forer2@scrutman.no       Forer123!    Mark Thompson (B1600) ║
║  forer3@scrutman.no       Forer123!    Emma Larsen (CC #33)  ║
║  forer4@scrutman.no       Forer123!    Lucas Berger (SB #44) ║
╠══════════════════════════════════════════════════════════════╣
║  Autocross sub-disciplines (INFO TYRES 2026):                ║
║  SuperBuggy      — Michelin R800K71 — max 10 (6 new)        ║
║  Buggy 1600      — Michelin R800K33 — max 8  (4 new)        ║
║  Junior Buggy    — Michelin R800K33 — max 8  (4 new)        ║
║  CrossCar        — Michelin C9205/C9203 — max 6 (4 new)     ║
║  CrossCar Junior — Michelin C9205/C9203 — max 6 (4 new)     ║
╠══════════════════════════════════════════════════════════════╣
║  RFID GREEN:  E28011700000010000000001  (James — SB)         ║
║  BC   GREEN:  12000001                 (Mark  — B1600)       ║
║  RFID YELLOW: E28011700000030000000001 (Emma  — waitlisted)  ║
║  RFID RED:    AABBCCDD00000000FFFFFFFF (unknown)             ║
╠══════════════════════════════════════════════════════════════╣
║  Scan sessions:                                              ║
║  Heat 1: James #11 PASS, Mark #22 PASS, Lucas #44 FAIL      ║
║    └─ Lucas FL: unregistered RFID (illegal tyre swap)        ║
║  Heat 2: James #11 PASS, Mark #22 PASS, Lucas #44 PASS      ║
║    └─ Lucas corrected front-left before heat 2               ║
╚══════════════════════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => p.$disconnect());
