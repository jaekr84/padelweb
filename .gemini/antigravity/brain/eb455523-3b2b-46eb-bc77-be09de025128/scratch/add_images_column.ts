import { db } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding 'images' column to 'posts' table...");
  try {
    // MySQL syntax is slightly different from Postgres for JSON column addition
    await db.execute(sql`ALTER TABLE posts ADD COLUMN images JSON AFTER image_url`);
    console.log("Column 'images' added successfully!");
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log("Column 'images' already exists.");
    } else {
      console.error("Error adding column:", e);
      process.exit(1);
    }
  }
  process.exit(0);
}

main();
