import bcrypt from "bcryptjs";
import { prisma } from "../src/config/database";

async function createAdmin() {
  const email = "admin@buildsathi.com";
  const password = "Admin@123";

  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log("User already exists:", existingAdmin.email);

    if (existingAdmin.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          role: "ADMIN",
          status: "ACTIVE",
        },
      });

      console.log("Existing user promoted to ADMIN.");
    }

    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      name: "BuildSathi Admin",
      email,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Admin created successfully!");
  console.log({
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });
}

createAdmin()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });