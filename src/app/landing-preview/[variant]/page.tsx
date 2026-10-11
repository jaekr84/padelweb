import { notFound, redirect } from "next/navigation";
import { checkSuperadmin } from "@/lib/auth";
import { getLandingData, isLandingVariant } from "@/lib/landing";
import { Landing } from "@/app/landings";

// Vista previa de cualquier landing, aunque no sea la activa. Sólo superadmin
// (la usan las miniaturas y "Ver completa" de /admin/landing); en `next dev`
// queda abierta para poder diseñar landings nuevas sin loguearse.
export default async function LandingPreviewPage({ params }: { params: Promise<{ variant: string }> }) {
    if (process.env.NODE_ENV !== "development" && !(await checkSuperadmin())) {
        redirect("/home");
    }

    const { variant } = await params;
    if (!isLandingVariant(variant)) {
        notFound();
    }

    const data = await getLandingData();
    return <Landing variant={variant} data={data} />;
}

export const metadata = { robots: { index: false, follow: false } };
