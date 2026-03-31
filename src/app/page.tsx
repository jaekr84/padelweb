import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingPage from "./LandingPage";
import { db } from "@/db";
import { users, tournaments } from "@/db/schema";
import { sql, eq, inArray } from "drizzle-orm";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/home");
  }

  // Fetch real stats
  let tournamentCount = 0;
  let playerCount = 0;
  let clubCount = 0;

  try {
    const [{ count: tCount }] = await db.select({ count: sql<number>`count(*)` }).from(tournaments);
    const [{ count: pCount }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "jugador"));
    const [{ count: cCount }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "club"));

    // Use DB data directly
    tournamentCount = tCount;
    playerCount = pCount;
    clubCount = cCount;
  } catch (e) {
    console.error("Error fetching landing stats:", e);
  }

  // Si no hay sesión, mostrar el landing con datos reales
  return (
    <LandingPage
      tournamentCount={tournamentCount}
      playerCount={playerCount}
      clubCount={clubCount}
    />
  );
}
