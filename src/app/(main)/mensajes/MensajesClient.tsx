"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, ArrowLeft, MessageSquare, Search, Check, CheckCheck, Pencil, X } from "lucide-react";
import Image from "next/image";
import { getMessages, sendMessage, markAsRead, getConversations, searchUsers, startConversation } from "./actions";
import { useRouter } from "next/navigation";

type ConvUser = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    category: string | null;
};

type ConvItem = {
    id: string;
    user1Id: string;
    user2Id: string;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    otherUser: ConvUser | null;
    unreadCount: number;
};

type Msg = {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    isRead: boolean | null;
    createdAt: Date;
};

type SearchResult = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    category: string | null;
    email: string;
};

interface MensajesClientProps {
    initialConversations: ConvItem[];
    currentUserId: string;
    initialConvId?: string;
}

export default function MensajesClient({ initialConversations, currentUserId, initialConvId }: MensajesClientProps) {
    const [conversations, setConversations] = useState<ConvItem[]>(initialConversations);
    const [activeConvId, setActiveConvId] = useState<string | null>(initialConvId || null);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState("");
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [mobileShowChat, setMobileShowChat] = useState(!!initialConvId);
    // New conversation search
    const [showNewConv, setShowNewConv] = useState(false);
    const [userQuery, setUserQuery] = useState("");
    const [userResults, setUserResults] = useState<SearchResult[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [startingConv, setStartingConv] = useState(false);
    const markedAsReadRef = useRef<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const activeConv = conversations.find(c => c.id === activeConvId);

    const loadMessages = useCallback(async (convId: string, markRead = false) => {
        const msgs = await getMessages(convId);
        setMessages(msgs as Msg[]);
        if (markRead && !markedAsReadRef.current.has(convId)) {
            await markAsRead(convId);
            markedAsReadRef.current.add(convId);
        }
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
    }, []);
    
    // Clear the read ref when user leaves or switches focus, or periodically
    useEffect(() => {
        const clearHistory = () => markedAsReadRef.current.clear();
        window.addEventListener("blur", clearHistory);
        return () => window.removeEventListener("blur", clearHistory);
    }, []);

    const refreshConversations = useCallback(async () => {
        const convs = await getConversations();
        setConversations(convs as ConvItem[]);
    }, []);

    // Initial load if there's an active conv
    useEffect(() => {
        if (activeConvId) {
            setLoadingMessages(true);
            loadMessages(activeConvId, true).finally(() => setLoadingMessages(false));
        }
    }, [activeConvId, loadMessages]);

    // Polling: messages every 5s (only when tab is visible)
    useEffect(() => {
        if (!activeConvId) return;

        const pollMessages = async () => {
            if (document.hidden) return;
            const msgs = await getMessages(activeConvId);
            setMessages(msgs as Msg[]);
        };

        const onVisible = async () => {
            if (document.hidden) return;
            await markAsRead(activeConvId);
            setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, unreadCount: 0 } : c));
        };

        const msgInterval = setInterval(pollMessages, 12000);
        const convInterval = setInterval(refreshConversations, 45000);
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            clearInterval(msgInterval);
            clearInterval(convInterval);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [activeConvId, refreshConversations]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Debounced user search
    useEffect(() => {
        if (userQuery.length < 2) { setUserResults([]); return; }
        setSearchingUsers(true);
        const timer = setTimeout(async () => {
            const res = await searchUsers(userQuery);
            setUserResults(res as SearchResult[]);
            setSearchingUsers(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [userQuery]);

    const handleSelectConv = (convId: string) => {
        setActiveConvId(convId);
        setMobileShowChat(true);
        // Rely on useEffect to load messages
        inputRef.current?.focus();
    };

    const handleStartConv = async (user: SearchResult) => {
        if (startingConv) return;
        setStartingConv(true);
        try {
            const { conversationId } = await startConversation(user.id);
            await refreshConversations();
            setShowNewConv(false);
            setUserQuery("");
            setUserResults([]);
            handleSelectConv(conversationId);
        } catch {
        } finally {
            setStartingConv(false);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !activeConvId || sending) return;
        setSending(true);
        const text = newMessage.trim();
        setNewMessage("");

        // Optimistic update
        const optimistic: Msg = {
            id: `opt-${Date.now()}`,
            conversationId: activeConvId,
            senderId: currentUserId,
            content: text,
            isRead: false,
            createdAt: new Date(),
        };
        setMessages(prev => [...prev, optimistic]);

        try {
            await sendMessage(activeConvId, text);
            const msgs = await getMessages(activeConvId);
            setMessages(msgs as Msg[]);
            setConversations(prev => prev.map(c =>
                c.id === activeConvId ? { ...c, lastMessage: text, lastMessageAt: new Date() } : c
            ));
        } catch {
        } finally {
            setSending(false);
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
        if (!search) return true;
        const name = `${c.otherUser?.firstName ?? ""} ${c.otherUser?.lastName ?? ""}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    return (
        <div className="min-h-screen bg-white text-slate-900 pb-24 font-sans">
            {/* ── Sticky Header ── */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 py-6 px-3 sm:px-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-azul-primary">Mensajería Privada</p>
                        <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter leading-none text-slate-900">
                            Mensajes
                        </h1>
                    </div>
                    <button
                        onClick={() => { setShowNewConv(true); setUserQuery(""); setUserResults([]); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-azul-primary transition-all shadow-md"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Nuevo Mensaje
                    </button>
                </div>
            </div>

            {/* ── Main Layout ── */}
            <div className="flex h-[calc(100vh-136px)]">
                {/* ── Conversation List ── */}
                <div className={`w-full md:w-72 lg:w-80 border-r border-slate-100 flex flex-col flex-shrink-0 ${mobileShowChat ? "hidden md:flex" : "flex"}`}>
                    {/* Search */}
                    <div className="p-4 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar conversación..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 bg-slate-50 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-azul-primary/30 focus:border-azul-primary/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto">
                        <AnimatePresence>
                            {filteredConvs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-40 py-20">
                                    <MessageSquare className="w-12 h-12 mb-3 text-slate-300" />
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                        {search ? "Sin resultados" : "Sin conversaciones"}
                                    </p>
                                    {!search && (
                                        <button
                                            onClick={() => setShowNewConv(true)}
                                            className="mt-4 px-4 py-2 bg-azul-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all opacity-100"
                                        >
                                            Nuevo mensaje
                                        </button>
                                    )}
                                </div>
                            ) : filteredConvs.map(conv => (
                                <motion.button
                                    key={conv.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => handleSelectConv(conv.id)}
                                    className={`w-full flex items-center gap-3 px-5 py-5 hover:bg-slate-50 transition-all text-left border-b border-slate-100 relative ${activeConvId === conv.id ? "bg-azul-primary/5 border-l-2 border-l-azul-primary" : conv.unreadCount > 0 ? "bg-azul-primary/[0.03]" : ""}`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-100">
                                            {conv.otherUser?.imageUrl ? (
                                                <Image src={conv.otherUser.imageUrl} alt="" fill className="object-cover" />
                                            ) : (
                                                <User className="w-5 h-5 text-slate-400" />
                                            )}
                                        </div>
                                        {conv.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-azul-primary text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white z-10 shadow-sm">
                                                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                                            </span>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-black text-slate-900" : "font-semibold text-slate-700"}`}>
                                                {conv.otherUser?.firstName} {conv.otherUser?.lastName}
                                            </p>
                                            <span className="text-[10px] text-slate-400 font-medium flex-shrink-0 ml-2">
                                                {formatTime(conv.lastMessageAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-xs truncate flex-1 ${conv.unreadCount > 0 ? "text-slate-900 font-bold" : "text-slate-400 font-medium"}`}>
                                                {conv.lastMessage ?? "Conversación iniciada"}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <div className="w-2 h-2 rounded-full bg-azul-primary animate-pulse flex-shrink-0" />
                                            )}
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
                            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-white">
                                <button
                                    onClick={() => setMobileShowChat(false)}
                                    className="md:hidden w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-100 flex-shrink-0">
                                    {activeConv.otherUser?.imageUrl ? (
                                        <Image src={activeConv.otherUser.imageUrl} alt="" fill className="object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-slate-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-black text-sm text-slate-900">
                                        {activeConv.otherUser?.firstName} {activeConv.otherUser?.lastName}
                                    </p>
                                    {activeConv.otherUser?.category && (
                                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                                            Cat. {activeConv.otherUser.category}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
                                {loadingMessages ? (
                                    <div className="flex items-center justify-center h-full opacity-30">
                                        <div className="w-8 h-8 border-4 border-azul-primary/20 border-t-azul-primary rounded-full animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-30 gap-3">
                                        <MessageSquare className="w-12 h-12 text-slate-300" />
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                            Todavía no hay mensajes. ¡Empezá la conversación!
                                        </p>
                                    </div>
                                ) : messages.map((msg, i) => {
                                    const isMine = msg.senderId === currentUserId;
                                    const showDate = i === 0 || new Date(messages[i - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                                    return (
                                        <div key={msg.id}>
                                            {showDate && (
                                                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest my-4">
                                                    {new Date(msg.createdAt).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                                                </p>
                                            )}
                                            <motion.div
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                            >
                                                <div className={`max-w-[75%] flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
                                                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMine
                                                        ? "bg-azul-primary text-white rounded-br-sm shadow-md shadow-azul-primary/20"
                                                        : "bg-white text-slate-900 rounded-bl-sm border border-slate-100 shadow-sm"
                                                        }`}>
                                                        {msg.content}
                                                    </div>
                                                    <div className="flex items-center gap-1 px-1">
                                                        <span className="text-[10px] text-slate-400">
                                                            {new Date(msg.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                        {isMine && (
                                                            msg.isRead
                                                                ? <CheckCheck className="w-3 h-3 text-azul-primary" />
                                                                : <Check className="w-3 h-3 text-slate-400" />
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
                            <div className="px-6 py-4 border-t border-slate-100 bg-white">
                                <div className="flex items-center gap-3">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                                        placeholder="Escribí un mensaje..."
                                        className="flex-1 h-12 px-5 bg-slate-50 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-azul-primary/30 focus:border-azul-primary/50 transition-all"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!newMessage.trim() || sending}
                                        className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center transition-all hover:bg-azul-primary active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Empty state */
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50/50">
                            <MessageSquare className="w-16 h-16 text-slate-200" />
                            <div className="text-center">
                                <p className="text-base font-black uppercase italic tracking-tighter text-slate-900">Tus Mensajes</p>
                                <p className="text-sm text-slate-400 font-medium mt-1">
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
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowNewConv(false)}
                                className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
                            />

                            {/* Modal */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden"
                            >
                                {/* Modal Header */}
                                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-azul-primary">Mensajería</p>
                                        <h2 className="text-lg font-black uppercase italic tracking-tighter text-slate-900">Nuevo Mensaje</h2>
                                    </div>
                                    <button
                                        onClick={() => setShowNewConv(false)}
                                        className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 border border-slate-100 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Search Input */}
                                <div className="px-6 py-4 border-b border-slate-100">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="Buscá un jugador por nombre o email..."
                                            value={userQuery}
                                            onChange={e => setUserQuery(e.target.value)}
                                            className="w-full h-11 pl-9 pr-4 bg-slate-50 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-azul-primary/30 focus:border-azul-primary/50 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Results */}
                                <div className="overflow-y-auto max-h-72">
                                    {searchingUsers ? (
                                        <div className="flex items-center justify-center py-10">
                                            <div className="w-6 h-6 border-2 border-azul-primary/20 border-t-azul-primary rounded-full animate-spin" />
                                        </div>
                                    ) : userQuery.length < 2 ? (
                                        <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                            <Search className="w-8 h-8 mb-2 text-slate-300" />
                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Escribí al menos 2 letras</p>
                                        </div>
                                    ) : userResults.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                            <User className="w-8 h-8 mb-2 text-slate-300" />
                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sin resultados</p>
                                        </div>
                                    ) : userResults.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleStartConv(user)}
                                            disabled={startingConv}
                                            className="group w-full flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50 transition-all text-left border-b border-slate-100 last:border-0 disabled:opacity-50"
                                        >
                                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center border border-slate-100">
                                                {user.imageUrl ? (
                                                    <Image src={user.imageUrl} alt="" fill className="object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5 text-slate-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-slate-900 truncate">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                                {user.category && (
                                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                                                        Cat. {user.category}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-azul-primary opacity-0 group-hover:opacity-100 transition-opacity">
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
