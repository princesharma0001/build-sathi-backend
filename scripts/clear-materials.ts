import { prisma } from "../src/config/database";

async function clearMaterials() {
  try {
    // 1. Delete records that reference Requirement first
    await prisma.requirement.deleteMany({});

    // 2. Now delete materials
    const deletedMaterials = await prisma.material.deleteMany({});

    // 3. Finally delete categories
    const deletedCategories = await prisma.materialCategory.deleteMany({});

    console.log("Requirements deleted");
    console.log("Materials deleted:", deletedMaterials.count);
    console.log("Categories deleted:", deletedCategories.count);
    console.log("Material and category data cleared successfully.");
  } catch (error) {
    console.error("Failed to clear data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearMaterials();