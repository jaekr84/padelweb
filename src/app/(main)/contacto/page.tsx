"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Instagram, Mail, Send, MapPin, MessageSquare, Loader2 } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { submitContactForm } from "@/app/actions/contact";
import { toast } from "sonner";

export default function ContactoPage() {
    const [isPending, startTransition] = useTransition();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "Consulta General",
        message: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name || !formData.email || !formData.message) {
            toast.error("Por favor completa todos los campos obligatorios.");
            return;
        }

        startTransition(async () => {
            const result = await submitContactForm(formData);
            if (result.success) {
                toast.success("¡Mensaje enviado correctamente! Nos pondremos en contacto pronto.");
                setFormData({ name: "", email: "", subject: "Consulta General", message: "" });
            } else {
                toast.error(result.error || "Upps, algo salió mal.");
            }
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="min-h-screen bg-black text-slate-200 overflow-x-hidden font-sans selection:bg-azul-primary/30">
            {/* Background Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-azul-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] bg-celeste/10 rounded-full blur-[150px]" />
            </div>

            <Navbar />

            <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
                {/* Hero Section */}
                <header className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-black italic uppercase text-white mb-6 tracking-tighter">
                            Ponete en <span className="text-celeste">Contacto</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                            Estamos acá para ayudarte. Si tenés dudas sobre torneos, membresías o querés ser parte de ACAP, escribinos.
                        </p>
                    </motion.div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Info Cards */}
                    <div className="lg:col-span-1 space-y-6">
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="glass-card p-8 rounded-[2rem] group hover:border-pink-500/50 transition-all text-left"
                        >
                            <div className="w-12 h-12 bg-pink-500/20 rounded-2xl flex items-center justify-center text-pink-500 mb-6 group-hover:scale-110 transition-transform">
                                <Instagram className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-white italic uppercase mb-2">Instagram</h3>
                            <p className="text-slate-400 text-sm mb-6">Seguinos y envianos un DM para respuestas rápidas.</p>
                            <a 
                                href="https://www.instagram.com/acaparg?igsh=NW12OWR0OWcwcHky" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-pink-500 font-bold text-xs uppercase tracking-widest hover:gap-4 transition-all"
                            >
                                @acaparg <Send className="w-3 h-3" />
                            </a>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="glass-card p-8 rounded-[2rem] group hover:border-celeste/50 transition-all text-left"
                        >
                            <div className="w-12 h-12 bg-celeste/20 rounded-2xl flex items-center justify-center text-celeste mb-6 group-hover:scale-110 transition-transform">
                                <Mail className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-white italic uppercase mb-2">Email</h3>
                            <p className="text-slate-400 text-sm mb-6">Para consultas formales o patrocinio, escribinos un correo.</p>
                            <a 
                                href="mailto:acap@acap.ar" 
                                className="inline-flex items-center gap-2 text-celeste font-bold text-xs uppercase tracking-widest hover:gap-4 transition-all"
                            >
                                acap@acap.ar <Send className="w-3 h-3" />
                            </a>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="glass-card p-8 rounded-[2rem] opacity-50 cursor-not-allowed text-left"
                        >
                            <div className="w-12 h-12 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-500 mb-6">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-white italic uppercase mb-2">Sede Central</h3>
                            <p className="text-slate-500 text-sm">Buenos Aires, Argentina (Próximamente)</p>
                        </motion.div>
                    </div>

                    {/* Contact Form */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="lg:col-span-2 glass-card p-8 md:p-12 rounded-[2rem] relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-azul-primary/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                        
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black text-white italic uppercase mb-8 flex items-center gap-4">
                                <MessageSquare className="w-8 h-8 text-celeste" /> Enviar Mensaje
                            </h2>

                            <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Nombre Completo</label>
                                    <input 
                                        type="text" 
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Ej: Juan Pérez" 
                                        required
                                        className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-celeste transition-all"
                                    />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Email</label>
                                    <input 
                                        type="email" 
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="tu@email.com" 
                                        required
                                        className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-celeste transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Asunto</label>
                                    <div className="relative">
                                        <select 
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-celeste transition-all appearance-none cursor-pointer"
                                        >
                                            <option className="bg-slate-900" value="Consulta General">Consulta General</option>
                                            <option className="bg-slate-900" value="Inscripción a Torneo">Inscripción a Torneo</option>
                                            <option className="bg-slate-900" value="Sponsors / Publicidad">Sponsors / Publicidad</option>
                                            <option className="bg-slate-900" value="Problemas con la Cuenta">Problemas con la Cuenta</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Mensaje</label>
                                    <textarea 
                                        rows={5} 
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        placeholder="Escribí tu mensaje acá..." 
                                        required
                                        className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-celeste transition-all resize-none"
                                    />
                                </div>
                                <div className="md:col-span-2 pt-4">
                                    <button 
                                        type="submit"
                                        disabled={isPending}
                                        className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-white/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Enviando...
                                            </>
                                        ) : (
                                            "Enviar Mensaje"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
