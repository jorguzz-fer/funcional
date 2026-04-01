import { create } from "zustand";
import api from "../services/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("token"),
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    set({ user: data.user, token: data.token });
  },

  register: async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("token", data.token);
    set({ user: data.user, token: data.token });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.user, token, isLoading: false });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
