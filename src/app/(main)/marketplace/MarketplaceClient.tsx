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
                    maxSizeMB: 0.8,
                    maxWidthOrHeight: 1200,
                    useWebWorker: true,
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
        const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                             item.category?.toLowerCase().includes(search.toLowerCase()) ||
                             item.observations?.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesCondition && matchesSearch;
    });

    const itemImages = selectedItem ? getAllImages(selectedItem) : [];

    // Extract unique categories from items for the filters, normalized to UPPERCASE
    const existingCats = Array.from(new Set(items.map(i => i.category?.toUpperCase()).filter(Boolean))).sort();

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-8">
            {/* Header Section */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 px-5 py-4 md:py-6">
                <div className="max-w-7xl mx-auto flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                                <ShoppingBag className="w-8 h-8 text-indigo-600" />
                                Marketplace
                            </h1>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                Equipamiento de Padel Pro
                            </p>
                        </div>
                        <button 
                            onClick={() => setIsPublishing(true)}
                            className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Vender Algo
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <button 
                                onClick={() => setFilter("all")}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${filter === "all" ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-card border-border text-muted-foreground hover:border-indigo-600/50"}`}
                            >
                                Todas las Categorías
                            </button>
                            {existingCats.map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setFilter(cat!)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-2 ${filter === cat ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-card border-border text-muted-foreground hover:border-indigo-600/50"}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => setConditionFilter("all")}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${conditionFilter === "all" ? "bg-slate-700 border-slate-600 text-white shadow-md" : "bg-card border-border text-muted-foreground hover:border-indigo-600/50"}`}
                            >
                                Todos los Estados
                            </button>
                            {CONDITIONS.map(c => (
                                <button 
                                    key={c.id}
                                    onClick={() => setConditionFilter(c.id)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${conditionFilter === c.id ? "bg-emerald-600 border-emerald-500 text-white shadow-md" : "bg-card border-border text-muted-foreground hover:border-indigo-600/50"}`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                            type="text" 
                            placeholder="Buscar equipamiento..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-card border border-border rounded-2xl py-3 px-11 text-sm font-medium focus:border-indigo-600/50 outline-none transition-all"
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
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => setSelectedItem(item)}
                                className="group bg-card border border-border rounded-[2rem] overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-indigo-600/10 transition-all duration-500 flex flex-col h-full"
                            >
                                <div className="relative aspect-square overflow-hidden">
                                    <Image 
                                        src={getFirstImage(item)} 
                                        alt={item.title} 
                                        fill 
                                        unoptimized={true}
                                        className="object-cover group-hover:scale-110 transition-transform duration-700" 
                                    />
                                    <div className="absolute top-3 left-3 bg-indigo-600 text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                                        ${item.price.toLocaleString()}
                                    </div>
                                    <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-foreground border border-border">
                                        {Array.isArray(item.images) ? item.images.length : 1} FOTOS
                                    </div>
                                </div>
                                <div className="p-4 flex flex-col flex-1 gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-0.5">
                                            {item.category || "General"}
                                        </span>
                                        <h3 className="font-bold text-sm leading-tight line-clamp-2 uppercase italic tracking-tight">{item.title}</h3>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <UserIcon className="w-3 h-3" />
                                            <span className="text-[9px] font-bold uppercase truncate max-w-[80px]">
                                                {item.user?.firstName || "Jugador"}
                                            </span>
                                        </div>
                                        <span className="text-[8px] font-black uppercase text-white/30 truncate">
                                            {item.condition === "nuevo" ? "Nuevo" : "Usado"}
                                        </span>
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
                            className="relative w-full max-w-lg bg-card border border-border rounded-[3rem] overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar"
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
                                />
                                {itemImages.length > 1 && (
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                                        {itemImages.map((_, i) => (
                                            <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? "bg-white" : "bg-white/40"}`} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-8 flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                                            ${selectedItem.price.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic truncate">
                                            {selectedItem.category} • {selectedItem.condition === "nuevo" ? "Nuevo" : "Usado"}
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none mt-2">
                                        {selectedItem.title}
                                    </h2>
                                </div>

                                <div className="bg-background/50 border border-border rounded-3xl p-5 flex flex-col gap-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Observaciones</h4>
                                    <p className="text-sm font-medium leading-relaxed opacity-80 whitespace-pre-wrap">
                                        {selectedItem.observations || "Sin observaciones adicionales."}
                                    </p>
                                </div>


                                <div className="flex items-center gap-4 border-t border-border pt-6 mt-2">
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
                                        className="flex-[2] bg-emerald-600 text-white h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                                    >
                                        <MessageCircle className="w-5 h-5 fill-white" />
                                        Contactar por WhatsApp
                                    </a>
                                    {session?.userId === selectedItem.userId && (
                                        <div className="flex-1 flex gap-2">
                                            <button 
                                                onClick={() => openEditModal(selectedItem)}
                                                className="flex-1 bg-indigo-600/10 border border-indigo-600/20 text-indigo-500 rounded-[1.5rem] flex items-center justify-center transition-all hover:bg-indigo-600 hover:text-white"
                                            >
                                                Editar
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    if (confirm("¿Borrar esta publicación?")) {
                                                        await deleteMarketplaceItem(selectedItem.id);
                                                        toast.success("Publicación borrada");
                                                        window.location.reload();
                                                    }
                                                }}
                                                className="w-16 bg-red-600/10 border border-red-600/20 text-red-500 rounded-[1.5rem] flex items-center justify-center transition-all hover:bg-red-600 hover:text-white"
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
                            className="relative w-full max-w-2xl bg-card border-t md:border border-border rounded-t-[3rem] md:rounded-[3rem] overflow-hidden shadow-2xl overflow-y-auto max-h-[92vh] no-scrollbar"
                        >
                            <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border/50 px-8 py-6 flex items-center justify-between">
                                <h2 className="text-xl font-black uppercase italic tracking-tighter">
                                    {editingId ? "Editar Publicación" : "Publicar Equipamiento"}
                                </h2>
                                <button 
                                    onClick={() => setIsPublishing(false)}
                                    className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-8 pb-32">
                                {/* Photo Upload */}
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic px-2">Fotos del Producto (Máx 3)</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {previews.map((url, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-3xl overflow-hidden border border-border group">
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
                                            <label className="aspect-square rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-600 transition-all group overflow-hidden relative">
                                                {isCompressing ? (
                                                    <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 rounded-full bg-indigo-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <Camera className="w-6 h-6 text-indigo-600" />
                                                        </div>
                                                        <span className="text-[8px] font-black uppercase text-white/30 text-center">Tocar para<br/>subir</span>
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
                                    <p className="text-[8px] font-bold uppercase text-white/20 ml-2 tracking-widest italic">
                                        * Las fotos se optimizan automáticamente para ahorrar datos.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Título del Producto</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full bg-background border border-border rounded-2xl py-4 px-6 text-sm font-bold uppercase italic tracking-tight outline-none focus:border-indigo-600 transition-all shadow-inner"
                                            placeholder="Ej: Siux Electra ST2..."
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Precio (ARS)</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-indigo-600">$</span>
                                            <input
                                                type="text"
                                                required
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: formatCurrency(e.target.value) })}
                                                className="w-full bg-background border border-border rounded-2xl py-4 px-12 text-sm font-black italic tracking-tight outline-none focus:border-indigo-600 transition-all shadow-inner"
                                                placeholder="250.000"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic px-2">Categoría</h3>
                                        <input
                                            type="text"
                                            required
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value.toUpperCase() })}
                                            className="w-full bg-background border border-border rounded-2xl py-4 px-6 text-sm font-bold uppercase italic outline-none focus:border-indigo-600 transition-all shadow-inner"
                                            placeholder="Ej: PALETA, CALZADO..."
                                        />
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic px-2">Estado</h3>
                                        <div className="bg-background p-1 rounded-2xl border border-border flex">
                                            {CONDITIONS.map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, condition: c.id })}
                                                    className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.condition === c.id ? "bg-indigo-600 text-white shadow-lg" : "text-white/30 hover:text-white"}`}
                                                >
                                                    {c.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Observaciones / Detalles</label>
                                    <textarea
                                        required
                                        value={formData.observations}
                                        onChange={e => setFormData({ ...formData, observations: e.target.value })}
                                        rows={4}
                                        className="w-full bg-background border border-border rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:border-indigo-600 transition-all resize-none shadow-inner"
                                        placeholder="Detalles técnicos, estado, medidas, etc."
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Contacto</label>
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl py-4 px-6 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <MessageCircle className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <span className="text-sm font-bold text-emerald-500/80">WhatsApp vinculado</span>
                                        </div>
                                        <span className="text-xs font-black italic opacity-60">+{session?.user?.phone}</span>
                                    </div>
                                    <p className="text-[8px] font-bold uppercase text-white/20 ml-2 tracking-widest">
                                        Se usará el teléfono registrado en tu perfil para que te contacten.
                                    </p>
                                </div>

                                <div className="fixed bottom-0 left-0 right-0 p-8 bg-card/80 backdrop-blur-xl border-t border-border/50 md:relative md:bg-transparent md:border-none md:p-0 md:mt-4">
                                    <button 
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-indigo-600 text-white h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl shadow-indigo-600/30 active:scale-[0.98] transition-all disabled:opacity-50"
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
    );
}
