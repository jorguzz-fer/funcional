import { create } from "zustand";
import api from "../services/api";
import type { FaturamentoBatch, UploadSummary } from "../types";

interface UploadState {
  batches: FaturamentoBatch[];
  currentBatch: FaturamentoBatch | null;
  uploadSummary: UploadSummary | null;
  isUploading: boolean;
  isLoading: boolean;
  error: string | null;

  fetchBatches: () => Promise<void>;
  uploadAutorizador: (file: File, periodo: string) => Promise<string>;
  uploadProteus: (file: File, batchId: string) => Promise<void>;
}

export const useUploadStore = create<UploadState>((set) => ({
  batches: [],
  currentBatch: null,
  uploadSummary: null,
  isUploading: false,
  isLoading: false,
  error: null,

  fetchBatches: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get("/upload/batches");
      set({ batches: data.batches, isLoading: false });
    } catch {
      set({ error: "Erro ao carregar batches", isLoading: false });
    }
  },

  uploadAutorizador: async (file, periodo) => {
    set({ isUploading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("periodo", periodo);
      const { data } = await api.post("/upload/autorizador", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      set({ isUploading: false, uploadSummary: data.summary });
      return data.batchId;
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || "Erro no upload";
      set({ isUploading: false, error: msg });
      throw error;
    }
  },

  uploadProteus: async (file, batchId) => {
    set({ isUploading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("batchId", batchId);
      const { data } = await api.post("/upload/proteus", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      set({ isUploading: false });
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || "Erro no upload";
      set({ isUploading: false, error: msg });
      throw error;
    }
  },
}));
