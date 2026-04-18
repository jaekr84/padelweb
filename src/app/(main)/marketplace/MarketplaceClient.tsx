"use client";

import { useState, useRef } from "react";
import { 
    ShoppingBag, 
    Plus, 
    X, 
    Camera, 
    Trash2, 
    MessageCircle, 
    ChevronLeft, 
    ChevronRight, 
    DollarSign,
    Info,
    Tag,
    Clock,
    User as UserIcon,
    Search,
    Filter,
    CheckCircle2,
    Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { createMarketplaceItem, deleteMarketplaceItem, updateMarketplaceItem } from "./actions";
import Image from "next/image";
import Link from "next/link";

type MarketplaceItem = {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    price: number;
    images: string[];
    category: string | null;
    condition: string | null;
    status: string;
    whatsappUrl: string | null;
    observations: string | null;
    createdAt: Date;
    user: {
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    };
};

const CATEGORIES = [
    { id: "paletas", label: "Paletas", icon: "🎾" },
    { id: "zapatillas", label: "Zapatillas", icon: "👟" },
    { id: "indumentaria", label: "Indumentaria", icon: "👕" },
    { id: "bolsos", label: "Bolsos y Fundas", icon: "🎒" },
    { id: "accesorios", label: "Accesorios", icon: "🩹" },
    { id: "otros", label: "Otros", icon: "✨" },
];

const CONDITIONS = [
    { id: "nuevo", label: "Nuevo" },
    { id: "usado", label: "Usado" },
];

const formatCurrency = (value: string) => {
    const number = value.replace(/\D/g, "");
    if (!number) return "";
    return new Intl.NumberFormat("es-AR").format(Number(number));
};

const parseCurrency = (formattedValue: string) => {
    return formattedValue.replace(/\./g, "");
};

export default function MarketplaceClient({ initialItems, session }: { initialItems: MarketplaceItem[], session: any }) {
    const [items, setItems] = useState<MarketplaceItem[]>(initialItems);
    const [isPublishing, setIsPublishing] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
    const [filter, setFilter] = useState("all");
    const [conditionFilter, setConditionFilter] = useState("all");
    const [search, setSearch] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isCompressing, setIsCompressing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const isSuperAdmin = session?.user?.role === 'superadmin';

    const [formData, setFormData] = useState({
        title: "",
        price: "",
        category: "",
        condition: "usado",
        observations: "",
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (images.length + files.length > 3) {
            toast.error("Máximo 3 fotos permitidas");
            return;
        }

        setIsCompressing(true);
        const newImages: File[] = [];
        const newPreviews: string[] = [];

        try {
            for (const file of files) {
                const options = {
                    maxSizeMB: 0.5, // Reduced from 0.8
                    maxWidthOrHeight: 1000, // Reduced from 1200
                    useWebWorker: true,
                    fileType: 'image/jpeg' // Normalize to jpeg for better compression
                };
                const compressedFile = await imageCompression(file, options);
                newImages.push(compressedFile);
                newPreviews.push(URL.createObjectURL(compressedFile));
            }
            setImages(prev => [...prev, ...newImages]);
            setPreviews(prev => [...prev, ...newPreviews]);
        } catch (error) {
            toast.error("Error al procesar imágenes");
        } finally {
            setIsCompressing(false);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async (): Promise<string[]> => {
        const urls: string[] = [];
        for (const file of images) {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) throw new Error("Error al subir imagen");
            const data = await res.json();
            urls.push(data.url);
        }
        return urls;
    };

    const openEditModal = (item: MarketplaceItem) => {
        setEditingId(item.id);
        setFormData({
            title: item.title,
            price: formatCurrency(item.price.toString()),
            category: item.category || "",
            condition: item.condition || "usado",
            observations: item.observations || "",
        });
        // Set existing images as previews (they won't be in the 'images' File array unless re-uploaded)
        setPreviews(getAllImages(item));
        setImages([]); // Clear new uploads
        setIsPublishing(true);
        setSelectedItem(null); // Close detail modal
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (images.length === 0) {
            toast.error("Subí al menos una foto");
            return;
        }
        if (!formData.title || !formData.price || !formData.category) {
            toast.error("Completá los campos obligatorios");
            return;
        }

        setIsLoading(true);
        try {
            const urlsFromPreviews = previews.filter(p => p.startsWith("/uploads/"));
            const newUploadedUrls = await uploadImages();
            const imageUrls = [...urlsFromPreviews, ...newUploadedUrls];
            
            // The phone is handled on the server side or from session
            const phone = session?.user?.phone;
            if (!phone) throw new Error("No tenés un teléfono registrado en tu perfil");

            let cleanPhone = phone.replace(/\D/g, "");
            if (!cleanPhone.startsWith("54")) cleanPhone = "54" + cleanPhone;
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hola! Vi tu publicación en ACAP Marketplace: ${formData.title}`;

            if (editingId) {
                await updateMarketplaceItem(editingId, {
                    ...formData,
                    price: Number(parseCurrency(formData.price)),
                    images: imageUrls,
                    whatsappUrl,
                });
                toast.success("Publicación actualizada con éxito");
            } else {
                await createMarketplaceItem({
                    ...formData,
                    price: Number(parseCurrency(formData.price)),
                    images: imageUrls,
                    whatsappUrl,
                });
                toast.success("Publicación creada con éxito");
            }

            setIsPublishing(false);
            setEditingId(null);
            setFormData({
                title: "",
                price: "",
                category: "",
                condition: "usado",
                observations: "",
            });
            setImages([]);
            setPreviews([]);
            window.location.reload(); // Quick way to refresh items from server
        } catch (error: any) {
            toast.error(error.message || "Error al publicar");
        } finally {
            setIsLoading(false);
        }
    };

    const getFirstImage = (item: MarketplaceItem | null) => {
        if (!item) return "/placeholder-padel.jpg";
        try {
            const imgs = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
            if (Array.isArray(imgs) && imgs.length > 0 && imgs[0]) {
                return imgs[0];
            }
        } catch (e) {}
        return "/placeholder-padel.jpg"; // Fallback image
    };

    const getAllImages = (item: MarketplaceItem | null): string[] => {
        if (!item) return [];
        try {
            const imgs = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
            return Array.isArray(imgs) ? imgs.filter(Boolean) : [];
        } catch (e) {
            return [];
        }
    };

    const filteredItems = items.filter(item => {
        const matchesCategory = filter === "all" || item.category?.toUpperCase() === filter.toUpperCase();
        const matchesCondition = conditionFilter === "all" || item.condition === conditionFilter;
        const s = search.toLowerCase();
        const matchesSearch = (item.title?.toLowerCase() || "").includes(s) || 
                             (item.category?.toLowerCase() || "").includes(s) ||
                             (item.observations?.toLowerCase() || "").includes(s);
        return matchesCategory && matchesCondition && matchesSearch;
    });

    const itemImages = selectedItem ? getAllImages(selectedItem) : [];

    // Extract unique categories from items for the filters, normalized to UPPERCASE
    const existingCats = Array.from(new Set(items.map(i => i.category?.toUpperCase()).filter(Boolean))).sort();

    return (
        <div className="min-h-screen bg-background text-foreground relative font-sans selection:bg-azul-primary/30">
            {/* CSS KEYFRAMES & GLOBAL STYLES */}
            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .text-gradient-animate {
                    background: linear-gradient(to right, #10b981, #3b82f6, #06b6d4, #10b981);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: gradient-x 6s ease infinite;
                }
                .glass-card {
                    background-color: color-mix(in srgb, var(--card) 85%, transparent);
                    backdrop-filter: blur(20px);
                    border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
                }
                .glass-card:hover {
                    border-color: rgba(14, 165, 233, 0.4);
                }
                .glow-button {
                    position: relative;
                }
                .glow-button::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: inherit;
                    background: linear-gradient(45deg, #10b981, #3b82f6);
                    z-index: -1;
                    filter: blur(8px);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .glow-button:hover::before {
                    opacity: 1;
                }
                @keyframes fade-slide-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-slide-up 0.6s ease-out forwards;
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            
            {/* Ambient background glows */}
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-celeste/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-azul-primary/10 rounded-full blur-[150px]" />
                <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] bg-rojo/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            {/* Public Header */}
            {!session?.userId && (
                <div className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-slate-100 shadow-[0_1px_10px_-5px_rgba(0,0,0,0.05)]">
                    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-full border border-celeste/30 overflow-hidden shrink-0 relative">
                                <img src="/img/stickers 1.jpg" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-black italic tracking-tighter text-sm uppercase">A.C.A.P.</span>
                        </Link>
                        <div className="flex items-center gap-3">
                            <Link href="/login" className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10">Login</Link>
                            <Link href="/" className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm">Volver</Link>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative z-10">
                {/* Header Section */}
                <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 py-6 px-6">
                    <div className="max-w-7xl mx-auto flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-1"
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-celeste">Comunidad ACAP</p>
                                <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none text-slate-900">
                                    <span className="text-gradient-animate drop-shadow-[0_0_20px_rgba(14,165,233,0.3)]">Marketplace</span>
                                </h1>
                            </motion.div>
                            {isSuperAdmin && (
                                <motion.button 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => setIsPublishing(true)}
                                    className="glow-button bg-foreground text-background px-6 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 shadow-2xl transition-all active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    Vender Algo
                                </motion.button>
                            )}
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                                <button 
                                    onClick={() => setFilter("all")}
                                    className={`px-5 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${filter === "all" ? "bg-azul-primary border-azul-primary text-white shadow-lg shadow-azul-primary/20" : "glass-card text-muted-foreground hover:text-foreground"}`}
                                >
                                    Todas las Categorías
                                </button>
                                {existingCats.map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => setFilter(cat!)}
                                        className={`px-5 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-2 ${filter === cat ? "bg-azul-primary border-azul-primary text-white shadow-lg shadow-azul-primary/20" : "glass-card text-muted-foreground hover:text-foreground"}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setConditionFilter("all")}
                                    className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${conditionFilter === "all" ? "bg-muted text-foreground border-white/20 shadow-md" : "glass-card text-muted-foreground"}`}
                                >
                                    Todos los Estados
                                </button>
                                {CONDITIONS.map(c => (
                                    <button 
                                        key={c.id}
                                        onClick={() => setConditionFilter(c.id)}
                                        className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${conditionFilter === c.id ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" : "glass-card text-muted-foreground"}`}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-azul-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Buscar equipamiento..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full glass-card rounded-2xl py-4 px-12 text-sm font-medium outline-none focus:ring-1 focus:ring-azul-primary/30 transition-all placeholder:text-muted-foreground/70 placeholder:uppercase placeholder:text-[10px] placeholder:tracking-[0.2em]"
                            />
                        </div>
                    </div>
                </div>

                {/* Grid Section */}
                <div className="max-w-7xl mx-auto p-5">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        <AnimatePresence>
                            {filteredItems.map(item => (
                                <motion.div 
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => setSelectedItem(item)}
                                    className="group glass-card rounded-[2.5rem] overflow-hidden cursor-pointer shadow-xl transition-all duration-500 flex flex-col h-full hover:shadow-azul-primary/10 relative"
                                >
                                    {/* Card Glow Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-azul-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    
                                    <div className="relative aspect-[4/5] overflow-hidden">
                                        <Image 
                                            src={getFirstImage(item)} 
                                            alt={item.title} 
                                            fill 
                                            unoptimized={true}
                                            className="object-cover group-hover:scale-110 transition-transform duration-1000" 
                                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                        />
                                        <div className="absolute top-4 left-4 bg-azul-primary text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl backdrop-blur-md">
                                            ${item.price.toLocaleString()}
                                        </div>
                                        <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white border border-white/10">
                                            {(Array.isArray(item.images) ? item.images.length : (typeof item.images === 'string' ? JSON.parse(item.images).length : 1))} FOTOS
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col flex-1 gap-3 relative z-10">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-celeste mb-1">
                                                {item.category || "General"}
                                            </span>
                                            <h3 className="font-extrabold text-base leading-tight line-clamp-2 uppercase italic tracking-tighter text-foreground group-hover:text-azul-primary transition-colors">{item.title}</h3>
                                        </div>
                                        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4">
                                            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                                <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center">
                                                    <UserIcon className="w-3 h-3" />
                                                </div>
                                                <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[80px]">
                                                    {item.user?.firstName || "Jugador"}
                                                </span>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${item.condition === 'nuevo' ? 'border-celeste/20 bg-celeste/10 text-celeste' : 'border-azul-primary/20 bg-azul-primary/10 text-azul-primary'}`}>
                                                {item.condition === "nuevo" ? "NUEVO" : "USADO"}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {filteredItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30 select-none">
                            <ShoppingBag className="w-20 h-20 mb-4" />
                            <h3 className="text-xl font-black uppercase italic italic tracking-tighter">No se encontró nada</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest">Probá con otros filtros o publicá algo vos.</p>
                        </div>
                    )}
                </div>

                {/* Item Detail Modal */}
                <AnimatePresence>
                    {selectedItem && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedItem(null)}
                                className="absolute inset-0 bg-background/60 backdrop-blur-xl"
                            />
                            <motion.div 
                                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                                className="relative w-full max-w-lg glass-card rounded-[3rem] overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar"
                            >
                                <button 
                                    onClick={() => setSelectedItem(null)}
                                    className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-background/50 backdrop-blur-md border border-border flex items-center justify-center hover:bg-background transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>

                                <div className="relative aspect-square">
                                    <Image 
                                        src={getFirstImage(selectedItem)} 
                                        alt={selectedItem.title} 
                                        fill 
                                        unoptimized={true}
                                        className="object-cover" 
                                        sizes="(max-width: 768px) 100vw, 512px"
                                    />
                                    {getAllImages(selectedItem).length > 1 && (
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                                            {getAllImages(selectedItem).map((_, i) => (
                                                <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? "bg-white" : "bg-white/40"}`} />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-8 flex flex-col gap-6">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-azul-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                                                ${selectedItem.price.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic truncate">
                                                {selectedItem.category} • {selectedItem.condition === "nuevo" ? "NUEVO" : "USADO"}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none mt-2">
                                            {selectedItem.title}
                                        </h2>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col gap-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-celeste">Observaciones</h4>
                                        <p className="text-sm font-medium leading-relaxed opacity-80 whitespace-pre-wrap">
                                            {selectedItem.observations || "Sin observaciones adicionales."}
                                        </p>
                                    </div>


                                    <div className="flex items-center gap-4 border-t border-white/10 pt-6 mt-2">
                                        <div className="flex-1">
                                            <p className="text-[8px] font-black uppercase text-white/30 tracking-widest">Vendedor</p>
                                            <p className="text-sm font-bold truncate italic tracking-tight">{selectedItem.user.firstName} {selectedItem.user.lastName}</p>
                                        </div>
                                        <div className="flex-1 text-right">
                                            <p className="text-[8px] font-black uppercase text-white/30 tracking-widest">Publicado</p>
                                            <p className="text-sm font-bold opacity-60 italic tracking-tight">
                                                {new Date(selectedItem.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <a 
                                            href={selectedItem.whatsappUrl || "#"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="glow-button flex-[2] bg-azul-primary text-white h-16 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-xl shadow-azul-primary/20 active:scale-95 transition-all"
                                        >
                                            <MessageCircle className="w-5 h-5 fill-white" />
                                            Contactar por WhatsApp
                                        </a>
                                        {session?.userId === selectedItem.userId && (
                                            <div className="flex-1 flex gap-2">
                                                <button 
                                                    onClick={() => openEditModal(selectedItem!)}
                                                    className="flex-1 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center justify-center transition-all hover:bg-white/10"
                                                >
                                                    <Tag className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={async () => {
                                                        if (confirm("¿Borrar esta publicación?")) {
                                                            await deleteMarketplaceItem(selectedItem!.id);
                                                            toast.success("Publicación borrada");
                                                            window.location.reload();
                                                        }
                                                    }}
                                                    className="w-16 bg-red-600/10 border border-red-600/20 text-red-500 rounded-2xl flex items-center justify-center transition-all hover:bg-red-600 hover:text-white"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Publishing Modal */}
                <AnimatePresence>
                    {isPublishing && (
                        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsPublishing(false)}
                                className="absolute inset-0 bg-background/60 backdrop-blur-xl"
                            />
                            <motion.div 
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 100 }}
                                className="relative w-full max-w-2xl glass-card border-t md:border-none rounded-t-[3rem] md:rounded-[3rem] overflow-hidden shadow-2xl overflow-y-auto max-h-[92vh] no-scrollbar"
                            >
                                <div className="sticky top-0 z-10 bg-card/50 backdrop-blur-xl border-b border-white/5 px-8 py-6 flex items-center justify-between">
                                    <h2 className="text-xl font-black uppercase italic tracking-tighter">
                                        {editingId ? "Editar Publicación" : "Publicar Equipamiento"}
                                    </h2>
                                    <button 
                                        onClick={() => setIsPublishing(false)}
                                        className="w-10 h-10 rounded-full bg-background/50 border border-border flex items-center justify-center hover:bg-muted"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-8 pb-32">
                                    {/* Photo Upload */}
                                    <div className="flex flex-col gap-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-azul-primary/80 italic px-2">Fotos del Producto (Máx 3)</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            {previews.map((url, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 group shadow-lg">
                                                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeImage(idx)}
                                                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {previews.length < 3 && (
                                                <label className="aspect-square rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-azul-primary/50 transition-all hover:bg-white/5 group overflow-hidden relative">
                                                    {isCompressing ? (
                                                        <Activity className="w-8 h-8 text-celeste animate-spin" />
                                                    ) : (
                                                        <>
                                                              <div className="w-12 h-12 rounded-full bg-azul-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                                <Camera className="w-6 h-6 text-azul-primary" />
                                                            </div>
                                                            <span className="text-[8px] font-black uppercase text-muted-foreground text-center">Tocar para<br/>subir</span>
                                                        </>
                                                    )}
                                                    <input 
                                                        type="file" 
                                                        multiple 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        onChange={handleImageChange}
                                                        disabled={isCompressing}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Título del Producto</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold uppercase italic tracking-tight outline-none focus:border-azul-primary/50 transition-all"
                                                placeholder="Ej: Siux Electra ST2..."
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Precio (ARS)</label>
                                            <div className="relative">
                                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-azul-primary">$</span>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.price}
                                                    onChange={e => setFormData({ ...formData, price: formatCurrency(e.target.value) })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-12 text-sm font-black italic tracking-tight outline-none focus:border-azul-primary/50 transition-all"
                                                    placeholder="250.000"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-2">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic px-2">Categoría</h3>
                                            <input
                                                type="text"
                                                required
                                                value={formData.category}
                                                onChange={e => setFormData({ ...formData, category: e.target.value.toUpperCase() })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold uppercase italic outline-none focus:border-azul-primary/50 transition-all"
                                                placeholder="Ej: PALETA, CALZADO..."
                                            />
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic px-2">Estado</h3>
                                            <div className="bg-white/5 p-1 rounded-2xl border border-white/10 flex">
                                                {CONDITIONS.map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, condition: c.id })}
                                                        className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.condition === c.id ? "bg-azul-primary text-white shadow-lg shadow-azul-primary/20" : "text-muted-foreground hover:text-foreground"}`}
                                                    >
                                                        {c.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Observaciones / Detalles</label>
                                        <textarea
                                            required
                                            value={formData.observations}
                                            onChange={e => setFormData({ ...formData, observations: e.target.value })}
                                            rows={4}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:border-azul-primary/50 transition-all resize-none shadow-inner"
                                            placeholder="Detalles técnicos, estado, medidas, etc."
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Contacto</label>
                                        <div className="bg-azul-primary/5 border border-azul-primary/10 rounded-2xl py-4 px-6 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-azul-primary/20 flex items-center justify-center">
                                                    <MessageCircle className="w-4 h-4 text-azul-primary" />
                                                </div>
                                                <span className="text-sm font-bold text-azul-primary/80">WhatsApp vinculado</span>
                                            </div>
                                            <span className="text-xs font-black italic opacity-60">+{session?.user?.phone}</span>
                                        </div>
                                    </div>

                                    <div className="fixed bottom-0 left-0 right-0 p-8 bg-background/80 backdrop-blur-xl border-t border-white/5 md:relative md:bg-transparent md:border-none md:p-0 md:mt-4">
                                        <button 
                                            type="submit"
                                            disabled={isLoading}
                                            className="glow-button w-full bg-foreground text-background h-16 rounded-full font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] transition-all disabled:opacity-50"
                                        >
                                            {isLoading ? <Activity className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                            {isLoading ? (editingId ? "Guardando..." : "Publicando...") : (editingId ? "Guardar Cambios" : "Confirmar Publicación")}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
