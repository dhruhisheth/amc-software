import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "shethdhruhi05@gmail.com";
const TEMP_PASSWORD = "ChangeMe123!";

async function main() {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    return;
  }

  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      name: "Dhruhi Sheth",
      role: "ADMIN",
    },
  });

  console.log(`Created admin user ${ADMIN_EMAIL} with temporary password "${TEMP_PASSWORD}".`);
  console.log("Log in and change this password from /settings once that page exists.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
