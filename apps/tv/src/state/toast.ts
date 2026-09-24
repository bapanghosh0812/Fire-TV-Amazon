import { create } from 'zustand';

interface ToastStore {
  message?: string;
  color?: string;
  id: number;
  show: (message: string, color?: string) => void;
}

export const useToast = create<ToastStore>((set, get) => ({
  id: 0,
  show: (message, color) => {
    const id = get().id + 1;
    set({ message, color, id });
    setTimeout(() => {
      if (get().id === id) set({ message: undefined });
    }, 3500);
  },
}));
