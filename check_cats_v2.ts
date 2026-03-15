
import { db } from "./src/db/index";
import { categoriesTable } from "./src/db/schema";

async function main() {
    console.log("Checking categories...");
    const cats = await db.select().from(categoriesTable);
    console.table(cats);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
