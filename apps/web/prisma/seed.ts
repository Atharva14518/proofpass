import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const organizations = [
    { id: "demo-canteen", name: "Central Works Canteen", type: "CANTEEN" as const, walletAddress: "0x1000000000000000000000000000000000000001", contactEmail: "canteen@example.test" },
    { id: "demo-ngo", name: "Community Table East", type: "NGO" as const, walletAddress: "0x3000000000000000000000000000000000000003", contactEmail: "ngo@example.test" },
    { id: "demo-sponsor", name: "Transit Relief Fund", type: "SPONSOR" as const, walletAddress: "0x4000000000000000000000000000000000000004", contactEmail: "sponsor@example.test" },
  ];
  for (const organization of organizations) await prisma.organization.upsert({ where: { walletAddress: organization.walletAddress }, update: {}, create: { ...organization, approvalStatus: "APPROVED", approvedAt: new Date() } });
  await prisma.batchPrivate.upsert({ where: { id: "0xec1b7f3a60485f3f0cd8c9296801d2f36078c220cf12fd7fc1fbc8f70244bdb7" }, update: {}, create: { id: "0xec1b7f3a60485f3f0cd8c9296801d2f36078c220cf12fd7fc1fbc8f70244bdb7", canteenId: "demo-canteen", pickupInstructions: "DEMO ONLY — rear loading entrance", publicDescription: "Prepared lunch portions from the staff canteen." } });
  console.log("Seeded clearly labelled local demo organizations and one private batch record.");
}
main().finally(() => prisma.$disconnect());
