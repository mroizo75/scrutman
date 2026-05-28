const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function main() {
  await p.scanLog.deleteMany();
  await p.eventTireRegistration.deleteMany();
  await p.tireOwnership.deleteMany();
  await p.tire.deleteMany();
  await p.disciplineTireLimit.deleteMany();
  await p.approvedTire.deleteMany();
  await p.weightCheck.deleteMany();
  await p.technicalCheck.deleteMany();
  await p.checkIn.deleteMany();
  await p.registration.deleteMany();
  await p.class.deleteMany();
  await p.event.deleteMany();
  await p.userVehicle.deleteMany();
  await p.user.deleteMany();
  await p.club.deleteMany();
  console.log("Cleared.");
}
main().catch(console.error).finally(() => p.$disconnect());
