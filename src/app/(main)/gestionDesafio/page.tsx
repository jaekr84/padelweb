import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { listarCategorias, listarDesafios } from "../desafio/actions/desafios";
import GestionDesafiosClient from "./GestionDesafiosClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Gestión de Desafíos" };

export default async function GestionDesafioPage() {
    const session = await getSession();
    // El módulo es de la app, no de un club: sólo admin y superadmin.
    if (session?.role !== "admin" && session?.role !== "superadmin") {
        redirect("/desafio");
    }

    const [desafios, categorias] = await Promise.all([listarDesafios(), listarCategorias()]);

    return <GestionDesafiosClient desafios={desafios} categorias={categorias} />;
}
