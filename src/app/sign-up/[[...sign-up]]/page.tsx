import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default async function SignUpPage({
    searchParams
}: {
    searchParams: Promise<{ __clerk_ticket?: string }>
}) {
    const params = await searchParams;
    const hasTicket = !!params.__clerk_ticket;

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a14",
        }}>
            {hasTicket ? (
                <SignUp
                    fallbackRedirectUrl="/onboarding"
                    forceRedirectUrl="/onboarding"
                />
            ) : (
                <div className="bg-slate-900/40 p-12 rounded-[2rem] border border-white/5 shadow-2xl text-center max-w-md mx-4">
                    <h1 className="text-3xl font-black uppercase italic mb-4 text-white">Acceso Restringido</h1>
                    <p className="text-slate-400 mb-8 font-medium">
                        El registro en A.C.A.P. es actualmente por invitación. Si eres un club o instructor y deseas unirte, por favor contáctanos.
                    </p>
                    <Link href="/" className="bg-white text-black px-8 py-3 rounded-full text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition-all inline-block">
                        Volver al inicio
                    </Link>
                </div>
            )}
        </div>
    );
}
