import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LandingPage from "./LandingPage";

export default async function Home() {
  const { userId } = await auth();

  // Si hay sesión activa, ir directo a la app
  if (userId) {
    redirect("/tournaments");
  }

  // Si no hay sesión, mostrar el landing
  return <LandingPage />;
}
