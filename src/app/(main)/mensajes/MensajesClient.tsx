"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, ArrowLeft, MessageSquare, Search, Check, CheckCheck, Pencil, X, ChevronDown, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { useClubs } from "@/hooks/use-clubs";
import { useClubPlayers } from "@/hooks/use-club-players";
import { useChatStore } from "@/store/useChatStore";
import { SearchResult } from "@/types/chat";
import imageCompression from "browser-image-compression";

interface MensajesClientProps {
    currentUserId: string;
    initialConvId?: string;
}

export default function MensajesClient({ currentUserId, initialConvId }: MensajesClientProps) {
    const {
        conversations,
        activeConvId,
        messages,
        isLoadingMessages,
        convSearchQuery,
        setConvSearchQuery,
        setActiveConvId,
        fetchConversations,
        fetchMessages,
        sendNewMessage,
        markRead,
        searchPlayers,
        userSearchResults,
        isSearchingUsers,
        createNewConversation,
        uploadImage
    } = useChatStore();

    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [mobileShowChat, setMobileShowChat] = useState(false);
    
    // New conversation search
    const [showNewConv, setShowNewConv] = useState(false);
    const [userQuery, setUserQuery] = useState("");
    const [startingConv, setStartingConv] = useState(false);
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
    const { clubs } = useClubs();
    const { players: clubMembers, isLoading: isLoadingMembers } = useClubPlayers(selectedClubId);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeConv = conversations.find(c => c.id === activeConvId);

    // Initial load and polling
    useEffect(() => {
        fetchConversations();
        if (initialConvId) {
            setActiveConvId(initialConvId);
            setMobileShowChat(true);
        }
        const convInterval = setInterval(fetchConversations, 30000);
        return () => clearInterval(convInterval);
    }, [fetchConversations, initialConvId, setActiveConvId]);

    // Polling for active chat
    useEffect(() => {
        if (!activeConvId) return;
        const msgInterval = setInterval(() => fetchMessages(activeConvId), 8000);
        return () => clearInterval(msgInterval);
    }, [activeConvId, fetchMessages]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Debounced user search
    useEffect(() => {
        if (userQuery.length < 2) return;
        const timer = setTimeout(() => {
            searchPlayers(userQuery, selectedClubId);
        }, 300);
        return () => clearTimeout(timer);
    }, [userQuery, selectedClubId, searchPlayers]);

    const handleSelectConv = (convId: string) => {
        setActiveConvId(convId);
        setMobileShowChat(true);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleStartConv = async (user: SearchResult) => {
        if (startingConv) return;
        setStartingConv(true);
        try {
            const conversationId = await createNewConversation(user.id);
            if (conversationId) {
                setShowNewConv(false);
                setUserQuery("");
                setMobileShowChat(true);
            }
        } finally {
            setStartingConv(false);
        }
    };

    const handleSend = async (imageUrl?: string | null) => {
        if ((!newMessage.trim() && !imageUrl) || !activeConvId || sending) return;
        
        setSending(true);
        const text = newMessage.trim();
        if (!imageUrl) setNewMessage("");

        try {
            await sendNewMessage(activeConvId, text, currentUserId, imageUrl);
        } finally {
            setSending(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setSending(true);
            // Compression
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1280,
                useWebWorker: true
            };
            const compressedFile = await imageCompression(file, options);
            
            const url = await uploadImage(compressedFile);
            if (url) {
                await handleSend(url);
            }
        } catch (err) {
            console.error("Error processing image:", err);
        } finally {
            setSending(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const formatTime = (date: Date | null) => {
        if (!date) return "";
        const d = new Date(date);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
    };

    const filteredConvs = conversations.filter(c => {
        if (!convSearchQuery) return true;
        const name = `${c.otherUser?.firstName ?? ""} ${c.otherUser?.lastName ?? ""}`.toLowerCase();
        return name.includes(convSearchQuery.toLowerCase());
    });

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 font-sans">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*" 
            />

            {/* ── Sticky Header ── */}
            <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-hairline py-3 px-3 sm:px-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-celeste">Mensajería Privada</p>
                        <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter leading-none text-foreground">
                            Mensajes
                        </h1>
                    </div>
                    <button
                        onClick={() => { setShowNewConv(true); setUserQuery(""); }}
                        className="flex items-center gap-2 px-4 py-2 bg-celeste text-carbon-950 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-celeste-light transition-all shadow-lg shadow-celeste/20 h-8"
                    >
                        <Pencil className="w-3 h-3" />
                        Nuevo Mensaje
                    </button>
                </div>
            </div>

            {/* ── Main Layout ── */}
            <div className="flex h-[calc(100vh-84px)]">
                {/* ── Conversation List ── */}
                <div className={`w-full md:w-64 lg:w-72 border-r border-hairline flex flex-col flex-shrink-0 ${mobileShowChat ? "hidden md:flex" : "flex"}`}>
                    {/* Search */}
                    <div className="p-2 border-b border-hairline">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar conversación..."
                                value={convSearchQuery}
                                onChange={e => setConvSearchQuery(e.target.value)}
                                className="w-full h-9 pl-9 pr-4 bg-surface rounded-lg text-[11px] font-medium text-foreground placeholder:text-subtle border border-hairline focus:outline-none focus:ring-2 focus:ring-celeste/30 focus:border-celeste/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto">
                        <AnimatePresence>
                            {filteredConvs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-40 py-20">
                                    <MessageSquare className="w-12 h-12 mb-3 text-muted-foreground" />
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        {convSearchQuery ? "Sin resultados" : "Sin conversaciones"}
                                    </p>
                                </div>
                            ) : filteredConvs.map(conv => (
                                <motion.button
                                    key={conv.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => handleSelectConv(conv.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface transition-all text-left border-b border-hairline relative ${activeConvId === conv.id ? "bg-celeste/5 border-l-2 border-l-celeste" : conv.unreadCount > 0 ? "bg-celeste/[0.03]" : ""}`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-raised flex items-center justify-center border border-hairline">
                                            {conv.otherUser?.imageUrl ? (
                                                <Image src={conv.otherUser.imageUrl} alt="" width={36} height={36} className="object-cover" />
                                            ) : (
                                                <User className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </div>
                                        {conv.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-celeste text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white z-10 shadow-sm">
                                                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                                            </span>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between mb-0">
                                            <p className={`text-[11px] truncate ${conv.unreadCount > 0 ? "font-black text-foreground" : "font-semibold text-muted-foreground"}`}>
                                                {conv.otherUser?.firstName} {conv.otherUser?.lastName}
                                            </p>
                                            <span className="text-[8px] text-muted-foreground font-medium flex-shrink-0 ml-2">
                                                {formatTime(conv.lastMessageAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-[10px] truncate flex-1 ${conv.unreadCount > 0 ? "text-foreground font-bold" : "text-muted-foreground font-medium"}`}>
                                                {conv.lastMessage ?? "Conversación iniciada"}
                                            </p>
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── Main Chat Area ── */}
                <div className={`flex-1 flex flex-col ${!mobileShowChat ? "hidden md:flex" : "flex"}`}>
                    {activeConv ? (
                        <>
                            {/* Chat Header */}
                            <div className="flex items-center gap-3 px-6 py-2 border-b border-hairline bg-background">
                                <button
                                    onClick={() => setMobileShowChat(false)}
                                    className="md:hidden w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-surface-raised flex items-center justify-center border border-hairline flex-shrink-0">
                                    {activeConv.otherUser?.imageUrl ? (
                                        <Image src={activeConv.otherUser.imageUrl} alt="" width={32} height={32} className="object-cover" />
                                    ) : (
                                        <User className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-black text-xs text-foreground">
                                        {activeConv.otherUser?.firstName} {activeConv.otherUser?.lastName}
                                    </p>
                                    {activeConv.otherUser?.category && (
                                        <p className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">
                                            Cat. {activeConv.otherUser.category}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-surface">
                                {isLoadingMessages && messages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full opacity-30">
                                        <Loader2 className="w-8 h-8 text-celeste animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-30 gap-3">
                                        <MessageSquare className="w-12 h-12 text-muted-foreground" />
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            Todavía no hay mensajes
                                        </p>
                                    </div>
                                ) : messages.map((msg, i) => {
                                    const isMine = msg.senderId === currentUserId;
                                    const showDate = i === 0 || i > 0 && new Date(messages[i - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                                    return (
                                        <div key={msg.id}>
                                            {showDate && (
                                                <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest my-4">
                                                    {new Date(msg.createdAt).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                                                </p>
                                            )}
                                            <motion.div
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                            >
                                                <div className={`max-w-[85%] flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
                                                    <div className={`px-3 py-1.5 rounded-xl text-[11px] leading-snug ${isMine
                                                        ? "bg-celeste text-carbon-950 rounded-br-sm shadow-md shadow-celeste/20"
                                                        : "bg-surface-raised text-foreground rounded-bl-sm border border-hairline"
                                                        }`}>
                                                        {msg.imageUrl && (
                                                            <div className="mb-1.5 rounded-lg overflow-hidden border border-hairline-strong">
                                                                <Image 
                                                                    src={msg.imageUrl} 
                                                                    alt="Chat attachment" 
                                                                    width={240} 
                                                                    height={240} 
                                                                    className="object-contain max-h-48" 
                                                                />
                                                            </div>
                                                        )}
                                                        {msg.content}
                                                    </div>
                                                    <div className="flex items-center gap-1 px-1">
                                                        <span className="text-[8px] text-muted-foreground font-bold uppercase">
                                                            {new Date(msg.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                        {isMine && (
                                                            msg.isRead
                                                                ? <CheckCheck className="w-2.5 h-2.5 text-celeste" />
                                                                : <Check className="w-2.5 h-2.5 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                             {/* Message Input */}
                             <div className="px-6 py-2.5 border-t border-hairline bg-background">
                                 <div className="flex items-center gap-2">
                                     <button
                                         onClick={() => fileInputRef.current?.click()}
                                         className="w-9 h-9 bg-surface text-muted-foreground rounded-xl flex items-center justify-center hover:bg-surface-raised hover:text-celeste transition-all active:scale-95 border border-hairline"
                                     >
                                         <ImageIcon className="w-4 h-4" />
                                     </button>
                                     <input
                                         ref={inputRef}
                                         type="text"
                                         value={newMessage}
                                         onChange={e => setNewMessage(e.target.value)}
                                         onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                                         placeholder="Escribí un mensaje..."
                                         className="flex-1 h-9 px-4 bg-surface rounded-xl text-[11px] text-foreground placeholder:text-subtle border border-hairline focus:outline-none focus:ring-2 focus:ring-celeste/30 focus:border-celeste/50 transition-all"
                                     />
                                     <button
                                         onClick={() => handleSend()}
                                         disabled={(!newMessage.trim() && !sending) || sending}
                                         className="w-9 h-9 bg-celeste text-carbon-950 rounded-xl flex items-center justify-center transition-all hover:bg-celeste-light active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                                     >
                                         {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                     </button>
                                 </div>
                             </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-surface">
                            <MessageSquare className="w-16 h-16 text-muted-foreground" />
                            <div className="text-center">
                                <p className="text-base font-black uppercase italic tracking-tighter text-foreground">Tus Mensajes</p>
                                <p className="text-sm text-muted-foreground font-medium mt-1">
                                    Seleccioná una conversación para empezar
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── New Conversation Modal ─────────────────────────────────── */}
                <AnimatePresence>
                    {showNewConv && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowNewConv(false)}
                                className="absolute inset-0 bg-background/30 backdrop-blur-sm"
                            />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative z-10 w-full max-w-md bg-background border border-hairline rounded-3xl shadow-2xl overflow-hidden"
                            >
                                 <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
                                     <div>
                                         <p className="text-[8px] font-black uppercase tracking-[0.3em] text-celeste">Mensajería</p>
                                         <h2 className="text-base font-black uppercase italic tracking-tighter text-foreground">Nuevo Mensaje</h2>
                                     </div>
                                     <button
                                         onClick={() => { setShowNewConv(false); setSelectedClubId(null); }}
                                         className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground border border-hairline transition-colors"
                                     >
                                         <X className="w-3.5 h-3.5" />
                                     </button>
                                 </div>

                                 <div className="px-6 py-4 bg-surface space-y-3 border-b border-hairline">
                                     <div className="flex flex-col gap-1.5">
                                         <label className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Filtrar por Club</label>
                                         <select
                                             value={selectedClubId || ""}
                                             onChange={(e) => {
                                                 setSelectedClubId(e.target.value || null);
                                                 setUserQuery("");
                                             }}
                                             className="w-full h-9 px-3 bg-background border border-hairline rounded-lg text-[11px] font-semibold text-foreground outline-none focus:ring-2 focus:ring-celeste/20 transition-all"
                                         >
                                             <option value="">Todos los clubes</option>
                                             {clubs.map(club => (
                                                 <option key={club.id} value={club.id}>{club.name}</option>
                                             ))}
                                         </select>
                                     </div>
                                    
                                    {selectedClubId && (
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Seleccionar Jugador</label>
                                            <select
                                                onChange={(e) => {
                                                    const player = clubMembers.find(m => m.id === e.target.value);
                                                    if (player) handleStartConv({ id: player.id, firstName: player.name, lastName: "" } as any);
                                                }}
                                                defaultValue=""
                                                disabled={isLoadingMembers}
                                                className="w-full h-11 px-4 bg-background border border-hairline rounded-xl text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-celeste/20 transition-all disabled:opacity-50"
                                            >
                                                <option value="" disabled>{isLoadingMembers ? "Cargando..." : "Seleccionar un jugador..."}</option>
                                                {clubMembers.map(member => (
                                                    <option key={member.id} value={member.id}>{member.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="px-6 py-4 border-b border-hairline">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Buscá un jugador..."
                                            value={userQuery}
                                            onChange={e => setUserQuery(e.target.value)}
                                            className="w-full h-11 pl-9 pr-4 bg-surface rounded-xl text-sm font-medium text-foreground placeholder:text-subtle border border-hairline focus:outline-none focus:ring-2 focus:ring-celeste/30"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-y-auto max-h-72">
                                    {isSearchingUsers ? (
                                        <div className="flex items-center justify-center py-10">
                                            <Loader2 className="w-6 h-6 text-celeste animate-spin" />
                                        </div>
                                    ) : userSearchResults.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleStartConv(user)}
                                            className="group w-full flex items-center gap-3 px-6 py-3.5 hover:bg-surface transition-all text-left border-b border-hairline last:border-0"
                                        >
                                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-surface-raised flex-shrink-0 flex items-center justify-center border border-hairline">
                                                {user.imageUrl ? (
                                                    <Image src={user.imageUrl} alt="" width={40} height={40} className="object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-foreground truncate">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                            </div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-celeste opacity-0 group-hover:opacity-100 transition-opacity">
                                                Mensaje →
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
