import { create } from "zustand";
import { getConversations, getMessages, sendMessage, markAsRead, getUnreadCount } from "@/app/(main)/mensajes/actions";
import { ConvItem, Msg, SearchResult } from "@/types/chat";
import { toast } from "sonner";

interface ChatState {
    conversations: ConvItem[];
    activeConvId: string | null;
    messages: Msg[];
    unreadCount: number;
    isExpanded: boolean;
    isLoadingConversations: boolean;
    isLoadingMessages: boolean;
    // Search & Filter
    userSearchResults: SearchResult[];
    isSearchingUsers: boolean;
    convSearchQuery: string;
    
    // Actions
    setExpanded: (expanded: boolean) => void;
    setActiveConvId: (id: string | null) => void;
    setConvSearchQuery: (query: string) => void;
    
    fetchConversations: () => Promise<void>;
    fetchMessages: (convId: string, force?: boolean) => Promise<void>;
    sendNewMessage: (convId: string, content: string, currentUserId: string, imageUrl?: string | null) => Promise<void>;
    markRead: (convId: string) => Promise<void>;
    refreshUnread: () => Promise<void>;
    searchPlayers: (query: string, clubId?: string | null) => Promise<void>;
    createNewConversation: (userId: string) => Promise<string | null>;
    uploadImage: (file: File) => Promise<string | null>;
}

export const useChatStore = create<ChatState>((set, get) => ({
    conversations: [],
    activeConvId: null,
    messages: [],
    unreadCount: 0,
    isExpanded: false,
    isLoadingConversations: false,
    isLoadingMessages: false,
    userSearchResults: [],
    isSearchingUsers: false,
    convSearchQuery: "",

    setExpanded: (expanded) => set({ isExpanded: expanded }),

    setActiveConvId: (id) => {
        const currentActive = get().activeConvId;
        if (currentActive === id && id !== null) return;
        
        set({ activeConvId: id });
        if (id) {
            get().fetchMessages(id, true);
            get().markRead(id);
        } else {
            set({ messages: [] });
        }
    },

    setConvSearchQuery: (query) => set({ convSearchQuery: query }),

    fetchConversations: async () => {
        if (document.hidden) return;
        set({ isLoadingConversations: true });
        try {
            const convs = await getConversations();
            set({ conversations: convs as ConvItem[] });
            
            // Sync overall unread count from conversations
            const totalUnread = (convs as ConvItem[]).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
            set({ unreadCount: totalUnread });
        } catch (e) {
            console.error("Error fetching conversations:", e);
        } finally {
            set({ isLoadingConversations: false });
        }
    },

    fetchMessages: async (convId: string, force = false) => {
        // Only fetch if tab is visible AND (widget is expanded OR we are on messages page)
        const isMessagesPage = typeof window !== 'undefined' && window.location.pathname === '/mensajes';
        if (!force && (document.hidden || (!get().isExpanded && !isMessagesPage))) return;
        
        if (force) set({ isLoadingMessages: true });
        try {
            const msgs = await getMessages(convId);
            set({ messages: msgs as Msg[] });
        } catch (e) {
            console.error("Error fetching messages:", e);
        } finally {
            if (force) set({ isLoadingMessages: false });
        }
    },

    sendNewMessage: async (convId, content, currentUserId, imageUrl) => {
        if (!content.trim() && !imageUrl) return;

        // Optimistic update
        const optimistic: Msg = {
            id: `opt-${Date.now()}`,
            conversationId: convId,
            senderId: currentUserId,
            content: content.trim(),
            imageUrl: imageUrl || null,
            isRead: false,
            createdAt: new Date(),
        };

        const prevMessages = get().messages;
        const prevConvs = get().conversations;

        set((state) => ({
            messages: [...state.messages, optimistic],
            conversations: state.conversations.map(c => 
                c.id === convId ? { 
                    ...c, 
                    lastMessage: imageUrl ? "📷 Imagen" : content, 
                    lastMessageAt: new Date() 
                } : c
            )
        }));

        try {
            const res = await sendMessage(convId, content, imageUrl);
            if (!res.ok) throw new Error("Error al enviar");
            
            // Refresh to get the actual message with real ID and timestamp
            await get().fetchMessages(convId);
        } catch (e) {
            toast.error("No se pudo enviar el mensaje");
            // Revert optimistic
            set({ messages: prevMessages, conversations: prevConvs });
        }
    },

    markRead: async (convId) => {
        try {
            await markAsRead(convId);
            set((state) => ({
                conversations: state.conversations.map(c => 
                    c.id === convId ? { ...c, unreadCount: 0 } : c
                )
            }));
            await get().refreshUnread();
        } catch (e) {
            console.error("Error marking as read:", e);
        }
    },

    refreshUnread: async () => {
        try {
            const count = await getUnreadCount();
            set({ unreadCount: count });
        } catch (e) {
            console.error("Error refreshing unread count:", e);
        }
    },

    searchPlayers: async (query: string, clubId?: string | null) => {
        if (!query.trim() || query.length < 2) {
            set({ userSearchResults: [] });
            return;
        }
        set({ isSearchingUsers: true });
        try {
            const { searchUsers } = await import("@/app/(main)/mensajes/actions");
            const res = await searchUsers(query, clubId);
            set({ userSearchResults: res as SearchResult[] });
        } catch (e) {
            console.error("Error searching users:", e);
        } finally {
            set({ isSearchingUsers: false });
        }
    },

    createNewConversation: async (userId: string) => {
        try {
            const { startConversation } = await import("@/app/(main)/mensajes/actions");
            const { conversationId } = await startConversation(userId);
            
            await get().fetchConversations();
            get().setActiveConvId(conversationId);
            return conversationId;
        } catch (e) {
            toast.error("Error al iniciar conversación");
            return null;
        }
    },

    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data.url;
        } catch (err: any) {
            toast.error(err.message || "Error al subir imagen");
            return null;
        }
    }
}));
