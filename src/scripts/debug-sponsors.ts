
import { db } from "@/db";
import { sponsors } from "@/db/schema";

async function checkSponsors() {
    const data = await db.select().from(sponsors);
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
}

checkSponsors().catch(err => {
    console.error(err);
    process.exit(1);
});
