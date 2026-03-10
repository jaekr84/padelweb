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
  let tournamentCount = 50;
  let playerCount = 300;
  let instructorCount = 20;
  let clubCount = 15;

  try {
    const [{ count: tCount }] = await db.select({ count: sql<number>`count(*)` }).from(tournaments);
    const [{ count: pCount }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "jugador"));
    const [{ count: iCount }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "profe"));
    const [{ count: cCount }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(inArray(users.role, ["club", "centro_de_padel"]));

    // Use DB data if available (> 0), keeping fallbacks for initial display
    if (tCount > 0) tournamentCount = tCount;
    if (pCount > 0) playerCount = pCount;
    if (iCount > 0) instructorCount = iCount;
    if (cCount > 0) clubCount = cCount;
  } catch (e) {
    console.error("Error fetching landing stats:", e);
  }

  // Si no hay sesión, mostrar el landing con datos reales
  return (
    <LandingPage
      tournamentCount={tournamentCount}
      playerCount={playerCount}
      instructorCount={instructorCount}
      clubCount={clubCount}
    />
  );
}
