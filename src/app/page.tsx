import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LandingPage from "./LandingPage";
import { db } from "@/db";
import { users, tournaments } from "@/db/schema";
import { sql } from "drizzle-orm";

export default async function Home() {
  const { userId } = await auth();

  // Si hay sesión activa, ir directo a la app
  if (userId) {
    redirect("/tournaments");
  }

  // Fetch real stats
  let tournamentCount = 50;
  let playerCount = 300;

  try {
    const [{ count: tCount }] = await db.select({ count: sql<number>`count(*)` }).from(tournaments);
    const [{ count: pCount }] = await db.select({ count: sql<number>`count(*)` }).from(users);

    // Fallback to defaults if DB is empty or still in early phase, but use real data if > 0
    if (tCount > 0) tournamentCount = tCount;
    if (pCount > 0) playerCount = pCount;
  } catch (e) {
    console.error("Error fetching landing stats:", e);
  }

  // Si no hay sesión, mostrar el landing con datos reales
  return <LandingPage tournamentCount={tournamentCount} playerCount={playerCount} />;
}
