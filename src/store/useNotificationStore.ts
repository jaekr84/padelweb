import { create } from 'zustand';
import { getUnreadCount } from '@/app/(main)/mensajes/actions';

interface NotificationState {
  unreadCount: number;
  isLoading: boolean;
  setUnreadCount: (count: number) => void;
  decrementUnread: (amount?: number) => void;
  incrementUnread: (amount?: number) => void;
  refresh: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  isLoading: false,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  decrementUnread: (amount = 1) => set((state) => ({ 
    unreadCount: Math.max(0, state.unreadCount - amount) 
  })),
  incrementUnread: (amount = 1) => set((state) => ({ 
    unreadCount: state.unreadCount + amount 
  })),
  refresh: async () => {
    set({ isLoading: true });
    try {
      const count = await getUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
