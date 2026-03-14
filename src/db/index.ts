import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const getConnectionString = () => {
    let url = process.env.DATABASE_URL;
    if (!url) return "mysql://root@localhost/padelweb";

    // If it's a PostgreSQL URL being used with MySQL2 driver, 
    // we need to sanitize it to avoid warnings about sslmode
    if (url.includes("sslmode=")) {
        try {
            const parsed = new URL(url);
            parsed.searchParams.delete("sslmode");
            parsed.searchParams.delete("channel_binding");
            return parsed.toString();
        } catch (e) {
            return url;
        }
    }
    return url;
};

const finalUrl = getConnectionString();

// For Hostinger MySQL, using a pool is better for long-living apps
const pool = mysql.createPool(finalUrl);
export const db = drizzle(pool, { schema, mode: "default" });
