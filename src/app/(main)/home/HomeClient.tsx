"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPost } from "./actions";
import { Image as ImageIcon, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import Image from "next/image";

// ── Time Ago helper ────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
    const d = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " años";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
}

// ── Types ────────────────────────────────────────────────────────────────
interface Post {
    id: string;
    content: string | null;
    imageUrl: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        role: string;
        imageUrl: string | null;
    };
}

interface HomeClientProps {
    initialPosts: Post[];
    currentUser: {
        id: string;
        name: string | null;
        imageUrl: string | null;
    } | null;
}

// ── Upload ───────────────────────────────────────────────────────────────
const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al subir la imagen");
    }
    const data = await res.json();
    return data.url;
};

// ── Component ────────────────────────────────────────────────────────────
export default function HomeClient({ initialPosts, currentUser }: HomeClientProps) {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [compressedFile, setCompressedFile] = useState<File | null>(null);
    const [isPosting, setIsPosting] = useState(false);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create initial preview to show something fast
        const localPreview = URL.createObjectURL(file);
        setImagePreview(localPreview);

        try {
            // Compress using browser-image-compression
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1200,
                useWebWorker: true
            };
            const cBlob = await imageCompression(file, options);
            const cFile = new File([cBlob], "post.jpg", { type: "image/jpeg" });

            setCompressedFile(cFile);
            setImagePreview(URL.createObjectURL(cFile));
            toast.success("Imagen optimizada para red");
        } catch (err) {
            toast.error("Error al procesar la imagen");
            setImagePreview(null);
            setCompressedFile(null);
        }
    };

    const handlePost = async () => {
        if (!content.trim() && !compressedFile) return;

        setIsPosting(true);
        try {
            let imageUrl = null;
            if (compressedFile) {
                imageUrl = await uploadImage(compressedFile);
            }

            await createPost(content, imageUrl);
            toast.success("Publicado");

            // Reset
            setContent("");
            setImagePreview(null);
            setCompressedFile(null);

            router.refresh(); // Refresh data
        } catch (err: any) {
            toast.error(err.message || "Error al publicar");
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-blue-500/30">
            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[30%] right-[-15%] w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col pt-6 md:pt-12 px-4 md:px-6">

                {/* ── Header ── */}
                <div className="mb-6 px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-1">
                        A.C.A.P.
                    </p>
                    <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground mb-2">
                        Feed
                    </h1>
                </div>

                {/* ── Compose Post ── */}
                {currentUser && (
                    <div className="bg-card border border-border rounded-3xl p-4 mb-8 shadow-sm">
                        <div className="flex gap-3 mb-3">
                            <div className="w-10 h-10 shrink-0 bg-muted rounded-full overflow-hidden border border-border relative">
                                {currentUser.imageUrl ? (
                                    <Image src={currentUser.imageUrl} alt="" fill unoptimized className="object-cover" priority />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-muted text-muted-foreground uppercase">
                                        {currentUser.name?.charAt(0) || "U"}
                                    </div>
                                )}
                            </div>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="¿Qué está pasando en la cancha?"
                                className="w-full bg-transparent resize-none text-foreground placeholder-muted-foreground outline-none text-sm pt-2 min-h-[60px]"
                            />
                        </div>

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="relative mb-3 ml-13 mr-2 bg-muted rounded-2xl overflow-hidden group aspect-video">
                                <Image src={imagePreview} fill className="object-cover" alt="Preview" unoptimized />
                                <button
                                    onClick={() => { setImagePreview(null); setCompressedFile(null); }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between ml-13 border-t border-border pt-3">
                            <label className="p-2 -ml-2 text-blue-500 hover:bg-blue-500/10 rounded-full cursor-pointer transition-colors">
                                <ImageIcon className="w-5 h-5" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>

                            <button
                                onClick={handlePost}
                                disabled={isPosting || (!content.trim() && !compressedFile)}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded-full text-[11px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                            >
                                {isPosting ? "Enviando..." : "Publicar"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Posts List ── */}
                <div className="flex flex-col gap-4">
                    {initialPosts.length === 0 ? (
                        <div className="text-center py-20 bg-card border border-border rounded-3xl">
                            <p className="text-muted-foreground font-bold text-sm">No hay publicaciones aún.</p>
                            <p className="text-muted-foreground/60 text-xs mt-1">Sé el primero en publicarlo.</p>
                        </div>
                    ) : (
                        initialPosts.map(post => {
                            const userInitials = post.user.name?.charAt(0) || "U";
                            return (
                                <div key={post.id} className="bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm hover:border-indigo-500/20 transition-all">
                                    {/* Author */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-muted border border-border rounded-full flex items-center justify-center overflow-hidden shrink-0 relative">
                                                {post.user.imageUrl ? (
                                                    <Image src={post.user.imageUrl} alt={post.user.name || ""} fill unoptimized className="object-cover" />
                                                ) : (
                                                    <span className="text-sm font-bold text-muted-foreground uppercase">{userInitials}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-bold text-foreground">{post.user.name}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-bold uppercase tracking-wider">{post.user.role === 'jugador' ? 'Jugador' : post.user.role === 'club' ? 'Club' : post.user.role === 'superadmin' ? 'Administrador' : 'Usuario'}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="pl-13">
                                        {post.content && (
                                            <p className="text-foreground text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                                                {post.content}
                                            </p>
                                        )}

                                        {post.imageUrl && (
                                            <div className="relative rounded-2xl border border-border overflow-hidden mb-3 bg-muted aspect-video w-full">
                                                <Image
                                                    src={post.imageUrl}
                                                    fill
                                                    unoptimized
                                                    className="object-cover"
                                                    alt="Publicación"
                                                    sizes="(max-width: 768px) 100vw, 672px"
                                                />
                                            </div>
                                        )}

                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div>
        </div>
    );
}
