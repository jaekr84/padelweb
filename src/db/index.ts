import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const getConnectionString = () => {
    let url = process.env.DATABASE_URL;
    if (!url) return "mysql://root@localhost/padelweb";

    // Hostinger sometimes uses different formats, let's ensure it starts with mysql://
    if (url.startsWith("postgres") || url.includes("sslmode=")) {
        try {
            const parsed = new URL(url);
            parsed.protocol = "mysql:";
            parsed.searchParams.delete("sslmode");
            parsed.searchParams.delete("channel_binding");
            return parsed.toString();
        } catch (e) {
            return url.replace("postgres://", "mysql://").replace("postgresql://", "mysql://");
        }
    }
    return url;
};

const finalUrl = getConnectionString();

// For Hostinger MySQL, using a pool is better for long-living apps
const pool = mysql.createPool({
    uri: finalUrl,
    charset: 'utf8mb4'
});
export const db = drizzle(pool, { schema, mode: "default" });
