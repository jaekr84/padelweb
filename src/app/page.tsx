import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLandingData, getLandingVariant } from "@/lib/landing";
import { Landing } from "./landings";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/home");
  }

  // Si no hay sesión, mostrar la landing que eligió el admin, con datos reales
  const [variant, data] = await Promise.all([getLandingVariant(), getLandingData()]);
  return <Landing variant={variant} data={data} />;
}
