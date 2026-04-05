"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    status: "loading",
  });

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setState({
        user: data.user,
        status: data.user ? "authenticated" : "unauthenticated",
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        status: session?.user ? "authenticated" : "unauthenticated",
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
