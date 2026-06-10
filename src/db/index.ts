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

// For Hostinger MySQL, using a pool is better for long-living apps.
// idleTimeout closes idle connections client-side before the server's wait_timeout
// kills them (otherwise the pool hands out dead sockets → ECONNRESET).
const createPool = () => mysql.createPool({
    uri: finalUrl,
    charset: 'utf8mb4',
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000
});

// Reuse the pool across Next.js dev hot-reloads to avoid leaking connections
const globalForDb = globalThis as unknown as { _mysqlPool?: mysql.Pool };
const pool = globalForDb._mysqlPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb._mysqlPool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
