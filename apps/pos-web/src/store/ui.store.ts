/**
 * CoffeeOS POS Web - UI Store
 * Estado global de la interfaz de usuario usando Zustand
 */

import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { Toast, Modal } from '@/types';

interface UIState {
  // Modals
  modals: Map<string, Modal>;
  // Toasts
  toasts: Toast[];
  // Loading
  isLoading: boolean;
  loadingMessage: string | null;
  // Sidebar
  sidebarOpen: boolean;
  // Actions
  openModal: (id: string, title?: string, size?: Modal['size']) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  showToast: (type: Toast['type'], message: string, duration?: number) => string;
  hideToast: (id: string) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const DEFAULT_TOAST_DURATION = 5000; // 5 seconds

export const useUIStore = create<UIState>((set, get) => ({
  modals: new Map(),
  toasts: [],
  isLoading: false,
  loadingMessage: null,
  sidebarOpen: true,

  // ============================================================================
  // MODALS
  // ============================================================================
  openModal: (id, title, size = 'md') => {
    const state = get();
    const newModals = new Map(state.modals);
    newModals.set(id, { id, isOpen: true, title, size });
    set({ modals: newModals });
  },

  closeModal: (id) => {
    const state = get();
    const newModals = new Map(state.modals);
    const modal = newModals.get(id);
    if (modal) {
      newModals.set(id, { ...modal, isOpen: false });
    }
    set({ modals: newModals });
  },

  closeAllModals: () => {
    set({ modals: new Map() });
  },

  // ============================================================================
  // TOASTS
  // ============================================================================
  showToast: (type, message, duration = DEFAULT_TOAST_DURATION) => {
    const id = uuid();
    const toast: Toast = { id, type, message, duration };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-hide toast after duration
    if (duration > 0) {
      setTimeout(() => {
        get().hideToast(id);
      }, duration);
    }

    return id;
  },

  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  // ============================================================================
  // LOADING
  // ============================================================================
  setLoading: (isLoading, message) => {
    set({ isLoading, loadingMessage: message || null });
  },

  // ============================================================================
  // SIDEBAR
  // ============================================================================
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },
}));
