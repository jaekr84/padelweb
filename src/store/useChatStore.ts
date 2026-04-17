import { create } from "zustand";
import { getConversations, getMessages, sendMessage, markAsRead, getUnreadCount } from "@/app/(main)/mensajes/actions";

interface ConvUser {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    category: string | null;
}

interface ConvItem {
    id: string;
    user1Id: string;
    user2Id: string;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    otherUser: ConvUser | null;
    unreadCount: number;
}

interface Msg {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    isRead: boolean | null;
    createdAt: Date;
}

interface SearchResult {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    category: string | null;
    email: string;
}

interface ChatState {
    conversations: ConvItem[];
    activeConvId: string | null;
    messages: Msg[];
    unreadCount: number;
    isExpanded: boolean;
    isLoadingConversations: boolean;
    isLoadingMessages: boolean;
    // Search
    userSearchResults: SearchResult[];
    isSearchingUsers: boolean;

    // Actions
    setExpanded: (expanded: boolean) => void;
    setActiveConvId: (id: string | null) => void;
    fetchConversations: () => Promise<void>;
    fetchMessages: (convId: string) => Promise<void>;
    sendNewMessage: (convId: string, content: string, currentUserId: string) => Promise<void>;
    markRead: (convId: string) => Promise<void>;
    refreshUnread: () => Promise<void>;
    searchPlayers: (query: string) => Promise<void>;
    createNewConversation: (userId: string) => Promise<string | null>;
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

    setExpanded: (expanded) => set({ isExpanded: expanded }),

    setActiveConvId: (id) => {
        set({ activeConvId: id, messages: id === null ? [] : get().messages });
        if (id) {
            get().fetchMessages(id);
            get().markRead(id);
        }
    },

    fetchConversations: async () => {
        if (document.hidden) return;
        set({ isLoadingConversations: true });
        try {
            const convs = await getConversations();
            set({ conversations: convs as ConvItem[] });
            
            // Sync overall unread count from conversations
            const totalUnread = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
            set({ unreadCount: totalUnread });
        } catch (e) {
            console.error("Error fetching conversations:", e);
        } finally {
            set({ isLoadingConversations: false });
        }
    },

    fetchMessages: async (convId: string) => {
        if (document.hidden || !get().isExpanded) return;
        set({ isLoadingMessages: true });
        try {
            const msgs = await getMessages(convId);
            set({ messages: msgs as Msg[] });
        } catch (e) {
            console.error("Error fetching messages:", e);
        } finally {
            set({ isLoadingMessages: false });
        }
    },

    sendNewMessage: async (convId, content, currentUserId) => {
        // Optimistic update
        const optimistic: Msg = {
            id: `opt-${Date.now()}`,
            conversationId: convId,
            senderId: currentUserId,
            content: content.trim(),
            isRead: false,
            createdAt: new Date(),
        };

        set((state) => ({
            messages: [...state.messages, optimistic],
            conversations: state.conversations.map(c => 
                c.id === convId ? { ...c, lastMessage: content, lastMessageAt: new Date() } : c
            )
        }));

        try {
            await sendMessage(convId, content);
            // Refresh to get the actual message from server
            await get().fetchMessages(convId);
        } catch (e) {
            console.error("Error sending message:", e);
            // Revert optimistic if needed (simplified here)
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

    searchPlayers: async (query: string) => {
        if (!query.trim() || query.length < 2) {
            set({ userSearchResults: [] });
            return;
        }
        set({ isSearchingUsers: true });
        try {
            const { searchUsers } = await import("@/app/(main)/mensajes/actions");
            const res = await searchUsers(query);
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
            
            // Refresh local list to include new conv
            await get().fetchConversations();
            
            // Select it
            get().setActiveConvId(conversationId);
            return conversationId;
        } catch (e) {
            console.error("Error creating conversation:", e);
            return null;
        }
    }
}));
