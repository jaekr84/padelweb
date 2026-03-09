import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Users } from "lucide-react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const { sessionClaims } = await auth();
    const role = sessionClaims?.metadata?.role;

    if (role !== "superadmin") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-background text-white font-sans flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-slate-900 border-r border-border/50 flex flex-col md:min-h-screen p-6 gap-6">
                <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="w-8 h-8 text-indigo-500" />
                    <h2 className="text-xl font-black uppercase tracking-widest italic">Superadmin</h2>
                </div>

                <nav className="flex flex-col gap-2">
                    <Link href="/admin" className="px-4 py-3 rounded-xl hover:bg-card transition-colors text-sm font-bold uppercase tracking-wider text-slate-300">
                        Dashboard
                    </Link>
                    <Link href="/admin/invitations" className="px-4 py-3 rounded-xl hover:bg-card transition-colors text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Invitaciones
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
