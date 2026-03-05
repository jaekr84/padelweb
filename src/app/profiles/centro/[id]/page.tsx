import { db } from "@/db";
import { clubs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import CentroProfileClient from "../CentroProfileClient";
import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const result = await db.select().from(clubs).where(eq(clubs.id, id));
    const centro = result[0];
    if (!centro) return { title: "Centro no encontrado" };
    return {
        title: `${centro.name} | ACAP`,
        description: centro.bio || `Centro de pádel profesional en ${centro.location || "Argentina"}.`,
    };
}

export default async function CentroPublicPage({ params }: Props) {
    const { id } = await params;
    const [user, centroResult] = await Promise.all([
        currentUser(),
        db.select().from(clubs).where(eq(clubs.id, id)),
    ]);

    const centro = centroResult[0];
    if (!centro) notFound();

    const isOwner = user?.id === centro.ownerId;

    return (
        <CentroProfileClient
            centro={centro}
            isOwner={isOwner}
        />
    );
}
