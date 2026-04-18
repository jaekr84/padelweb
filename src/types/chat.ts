export interface ConvUser {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    category: string | null;
}

export interface ConvItem {
    id: string;
    user1Id: string;
    user2Id: string;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    otherUser: ConvUser | null;
    unreadCount: number;
}

export interface Msg {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    imageUrl?: string | null;
    isRead: boolean | null;
    createdAt: Date;
}

export interface SearchResult {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    category: string | null;
    email: string;
}
