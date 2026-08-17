import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { cuentasParaFusionar, listarInvitados } from "../../desafio/actions/invitados";
import InvitadosClient from "./InvitadosClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Invitados · Desafío" };

export default async function InvitadosPage() {
    const session = await getSession();
    // El módulo es de la app, no de un club: sólo admin y superadmin.
    if (session?.role !== "admin" && session?.role !== "superadmin") redirect("/desafio");

    const [invitados, cuentas] = await Promise.all([listarInvitados(), cuentasParaFusionar()]);

    return <InvitadosClient invitados={invitados} cuentas={cuentas} />;
}
