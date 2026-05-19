import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const categories = [
    {
      name: "Home Services",
      subCategories: ["Cleaning", "Plumbing", "Electrical", "Gardening"],
    },
    {
      name: "Delivery",
      subCategories: ["Groceries", "Food", "Packages", "Furniture"],
    },
    {
      name: "Tech & Design",
      subCategories: ["Web Development", "Graphic Design", "IT Support", "Content Writing"],
    },
    {
      name: "Education",
      subCategories: ["Tutoring", "Music Lessons", "Language", "Exam Prep"],
    },
    {
      name: "Events",
      subCategories: ["Photography", "Catering", "Decoration", "Music/DJ"],
    },
  ];

  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name },
    });

    for (const sub of cat.subCategories) {
      await prisma.subCategory.upsert({
        where: { name_categoryId: { name: sub, categoryId: category.id } },
        update: {},
        create: { name: sub, categoryId: category.id },
      });
    }
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
