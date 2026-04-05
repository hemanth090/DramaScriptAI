"use client";

import { useState, useCallback, useEffect } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

let toastListeners: Array<(toast: Toast) => void> = [];
let removeListeners: Array<(id: string) => void> = [];

export function toast(message: string, type: Toast["type"] = "info") {
  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const t: Toast = { id, message, type };
  toastListeners.forEach((fn) => fn(t));

  setTimeout(() => {
    removeListeners.forEach((fn) => fn(id));
  }, 3000);
}

export function useToastStore() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev.slice(-4), t]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    toastListeners.push(addToast);
    removeListeners.push(removeToast);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== addToast);
      removeListeners = removeListeners.filter((fn) => fn !== removeToast);
    };
  }, [addToast, removeToast]);

  return { toasts, removeToast };
}
