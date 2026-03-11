import { db } from "./src/db";
import { categoriesTable } from "./src/db/schema";

async function checkCategories() {
    const cats = await db.select().from(categoriesTable);
    console.log("Categories found:", cats.length);
    cats.forEach(c => {
        console.log(`Name: ${c.name}, Gender: '${c.gender}'`);
    });
    process.exit(0);
}

checkCategories().catch(err => {
    console.error(err);
    process.exit(1);
});
