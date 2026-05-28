"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare, X, Pencil, Send, User, ArrowLeft, Search,
    Check, CheckCheck, Minimize2, Image as ImageIcon, Loader2
} from "lucide-react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useChatStore } from "@/store/useChatStore";
import { useAppStore } from "@/store/useAppStore";
import { useClubs } from "@/hooks/use-clubs";
import { useClubPlayers } from "@/hooks/use-club-players";
import imageCompression from "browser-image-compression";

interface FloatingChatProps {
    currentUserId: string;
}

export default function FloatingChat({ currentUserId }: FloatingChatProps) {
    const pathname = usePathname();
    const [view, setView] = useState<"list" | "chat" | "search">("list");
    const [userQuery, setUserQuery] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);

    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
    const { clubs } = useClubs();
    const { players: clubMembers, isLoading: isLoadingMembers } = useClubPlayers(selectedClubId);

    const {
        conversations, activeConvId, messages, unreadCount,
        isExpanded, setExpanded, setActiveConvId,
        fetchConversations, fetchMessages, sendNewMessage,
        userSearchResults, isSearchingUsers, searchPlayers,
        createNewConversation, uploadImage
    } = useChatStore();

    const { sidebarCollapsed } = useAppStore();

    const isMessagesPage = pathname === "/mensajes";

    useEffect(() => {
        if (activeConvId) setView("chat");
        else if (view !== "search") setView("list");
    }, [activeConvId, view]);

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 30000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    useEffect(() => {
        if (!activeConvId || !isExpanded) return;
        const interval = setInterval(() => fetchMessages(activeConvId), 8000);
        return () => clearInterval(interval);
    }, [activeConvId, isExpanded, fetchMessages]);

    useEffect(() => {
        if (view !== "search" || userQuery.length < 2) return;
        const timer = setTimeout(() => searchPlayers(userQuery, selectedClubId), 300);
        return () => clearTimeout(timer);
    }, [userQuery, view, searchPlayers, selectedClubId]);

    useEffect(() => {
        if (isExpanded && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isExpanded]);

    // Close panel when navigating to /mensajes
    useEffect(() => {
        if (isMessagesPage) setExpanded(false);
    }, [isMessagesPage, setExpanded]);

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
            const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true });
            const url = await uploadImage(compressed);
            if (url) await handleSend(url);
        } catch (err) {
            console.error("Error upload:", err);
        } finally {
            setSending(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (isMessagesPage) return null;

    const activeConv = conversations.find(c => c.id === activeConvId);

    const formatTime = (date: Date | null) => {
        if (!date) return "";
        const d = new Date(date);
        const now = new Date();
        if (d.toDateString() === now.toDateString())
            return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
    };

    // Left offset = sidebar width en px
    const leftPx = sidebarCollapsed ? 64 : 208;

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
            />

            <AnimatePresence>
                {isExpanded && (
                    <>
                        {/* Backdrop mobile */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[54] bg-black/30 md:hidden"
                            onClick={() => setExpanded(false)}
                        />

                        {/* Panel mobile — fullscreen */}
                        <motion.div
                            key="panel-mobile"
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 320, damping: 32 }}
                            className="fixed inset-0 z-[55] bg-white flex flex-col font-sans overflow-hidden md:hidden"
                        >
                            {/* Header mobile */}
                            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-azul-primary" />
                                    <span className="text-xs font-black uppercase tracking-widest">Mensajes</span>
                                </div>
                                <button onClick={() => setExpanded(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden flex flex-col bg-white">
                                <div className="flex flex-col items-center justify-center h-full p-8 opacity-40">
                                    <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-center">Usá la versión desktop para el chat</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Panel lateral */}
                        <motion.div
                            key="panel"
                            initial={{ x: "-100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "-100%", opacity: 0 }}
                            transition={{ type: "spring", stiffness: 320, damping: 32 }}
                            style={{ left: leftPx }}
                            className="fixed top-0 h-screen z-[55] w-72 bg-white border-r border-slate-200 shadow-xl flex flex-col font-sans overflow-hidden hidden md:flex"
                        >
                            {/* Header */}
                            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    {view === "chat" ? (
                                        <button onClick={() => { setActiveConvId(null); setView("list"); }} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                                            <ArrowLeft className="w-4 h-4" />
                                        </button>
                                    ) : view === "search" ? (
                                        <button onClick={() => setView("list")} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                                            <ArrowLeft className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <MessageSquare className="w-4 h-4 text-azul-primary" />
                                    )}
                                    <span className="text-xs font-black uppercase tracking-widest truncate max-w-[150px]">
                                        {view === "chat" && activeConv
                                            ? `${activeConv.otherUser?.firstName} ${activeConv.otherUser?.lastName}`
                                            : view === "search" ? "Nuevo Mensaje"
                                            : unreadCount > 0 ? `Mensajes (${unreadCount})` : "Chat"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {view === "list" && (
                                        <button onClick={() => setView("search")} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                                            <Pencil className="w-4 h-4 text-azul-primary" />
                                        </button>
                                    )}
                                    <button onClick={() => setExpanded(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                                        <X className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden flex flex-col bg-white">
                                {view === "list" ? (
                                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                                        {conversations.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full p-8 opacity-40">
                                                <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-center">Todavía no tenés chats</p>
                                            </div>
                                        ) : conversations.map(conv => (
                                            <button
                                                key={conv.id}
                                                onClick={() => setActiveConvId(conv.id)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all text-left ${conv.unreadCount > 0 ? "bg-azul-primary/[0.03]" : ""}`}
                                            >
                                                <div className="relative shrink-0">
                                                    <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-100">
                                                        {conv.otherUser?.imageUrl
                                                            ? <Image src={conv.otherUser.imageUrl} alt="" width={36} height={36} className="object-cover" />
                                                            : <User className="w-4 h-4 text-slate-400" />}
                                                    </div>
                                                    {conv.unreadCount > 0 && (
                                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-azul-primary text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? "font-black text-slate-900" : "font-semibold text-slate-600"}`}>
                                                            {conv.otherUser?.firstName} {conv.otherUser?.lastName}
                                                        </p>
                                                        <span className="text-[9px] text-slate-400 font-medium shrink-0 ml-1">
                                                            {formatTime(conv.lastMessageAt)}
                                                        </span>
                                                    </div>
                                                    <p className={`text-[10px] truncate ${conv.unreadCount > 0 ? "text-slate-900 font-bold" : "text-slate-400"}`}>
                                                        {conv.lastMessage ?? "Conversación iniciada"}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : view === "search" ? (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        <div className="p-3 border-b border-slate-100 bg-slate-50/30 space-y-3">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Filtrar por Club</label>
                                                <select
                                                    value={selectedClubId || ""}
                                                    onChange={(e) => { setSelectedClubId(e.target.value || null); setUserQuery(""); }}
                                                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-azul-primary/20"
                                                >
                                                    <option value="">Todos los clubes</option>
                                                    {clubs.map(club => <option key={club.id} value={club.id}>{club.name}</option>)}
                                                </select>
                                            </div>
                                            {selectedClubId && (
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Seleccionar Jugador</label>
                                                    <select
                                                        onChange={(e) => {
                                                            const player = clubMembers.find(m => m.id === e.target.value);
                                                            if (player) { createNewConversation(player.id); setSelectedClubId(null); }
                                                        }}
                                                        defaultValue=""
                                                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-azul-primary/20"
                                                    >
                                                        <option value="" disabled>{isLoadingMembers ? "Cargando..." : "Seleccionar jugador..."}</option>
                                                        {clubMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="O busca por nombre..."
                                                    value={userQuery}
                                                    onChange={e => setUserQuery(e.target.value)}
                                                    className="w-full h-9 pl-8 pr-4 bg-white rounded-xl text-[11px] font-medium text-slate-900 border border-slate-100 outline-none focus:ring-1 focus:ring-azul-primary/30"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            {isSearchingUsers
                                                ? <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 text-azul-primary animate-spin" /></div>
                                                : userSearchResults.map(user => (
                                                    <button
                                                        key={user.id}
                                                        onClick={() => createNewConversation(user.id)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                                                    >
                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center">
                                                            {user.imageUrl
                                                                ? <Image src={user.imageUrl} alt="" width={32} height={32} className="object-cover" />
                                                                : <User className="w-4 h-4 text-slate-400" />}
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-900">{user.firstName} {user.lastName}</p>
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                                            {messages.map(msg => {
                                                const isMine = msg.senderId === currentUserId;
                                                return (
                                                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-snug shadow-sm ${isMine ? "bg-azul-primary text-white rounded-br-sm" : "bg-white text-slate-900 border border-slate-100 rounded-bl-sm"}`}>
                                                            {msg.imageUrl && (
                                                                <div className="mb-1.5 rounded-lg overflow-hidden border border-white/20">
                                                                    <Image src={msg.imageUrl} alt="" width={200} height={200} className="object-contain max-h-40" />
                                                                </div>
                                                            )}
                                                            {msg.content}
                                                            <div className={`mt-0.5 text-[8px] flex justify-end gap-1 ${isMine ? "text-blue-100" : "text-slate-400"}`}>
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                                {isMine && (msg.isRead ? <CheckCheck className="w-2.5 h-2.5" /> : <Check className="w-2.5 h-2.5" />)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>
                                        <div className="p-3 border-t border-slate-100 bg-white shrink-0">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all"
                                                >
                                                    <ImageIcon className="w-4 h-4" />
                                                </button>
                                                <input
                                                    ref={inputRef}
                                                    type="text"
                                                    value={newMessage}
                                                    onChange={e => setNewMessage(e.target.value)}
                                                    onKeyDown={e => e.key === "Enter" && handleSend()}
                                                    placeholder="Escribe..."
                                                    className="flex-1 h-9 px-4 bg-slate-50 rounded-xl text-xs text-slate-900 border border-slate-100 outline-none focus:ring-1 focus:ring-azul-primary/30"
                                                />
                                                <button
                                                    onClick={() => handleSend()}
                                                    disabled={(!newMessage.trim() && !sending) || sending}
                                                    className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-azul-primary transition-all disabled:opacity-40"
                                                >
                                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
