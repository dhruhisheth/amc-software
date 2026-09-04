import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ROOT_ADMIN_EMAIL } from "@/lib/auth/root-admin";

// The owner account. The password is only the *initial* one — override it for a real deployment
// with ROOT_ADMIN_PASSWORD, and change it from Settings after the first login.
const ROOT_ADMIN_NAME = "Warehouse Admin";
const ROOT_ADMIN_PASSWORD = process.env.ROOT_ADMIN_PASSWORD ?? "Warehouse@123";

async function main() {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const existing = await prisma.user.findUnique({ where: { email: ROOT_ADMIN_EMAIL } });
  if (existing) {
    // Never rewrite an existing password (that would silently reset the owner's credential on
    // every deploy) — but do repair the role, since the owner must always be an admin.
    if (existing.role !== "ADMIN") {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
      console.log(`Restored ADMIN role on ${ROOT_ADMIN_EMAIL}.`);
    }
    console.log(`Owner account already exists: ${ROOT_ADMIN_EMAIL}`);
    return;
  }

  const passwordHash = await bcrypt.hash(ROOT_ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: {
      email: ROOT_ADMIN_EMAIL,
      passwordHash,
      name: ROOT_ADMIN_NAME,
      role: "ADMIN",
    },
  });

  console.log(`Created owner account ${ROOT_ADMIN_EMAIL} with password "${ROOT_ADMIN_PASSWORD}".`);
  console.log("Log in and change this password from /settings.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
