"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SupabaseClient, User, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/supabase/client";

type SupabaseContextValue = {
  supabase: SupabaseClient;
  user: User | null;
  session: Session | null;
  isUserLoading: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isUserLoading, setIsUserLoading] = useState<boolean>(true);
  const lastSyncedProviderTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setUser(null);
        setSession(null);
        setIsUserLoading(false);
        return;
      }
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setIsUserLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setIsUserLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const provider = session?.user?.app_metadata?.provider;
    const providerToken = session?.provider_token;
    const appAccessToken = session?.access_token;
    if (provider !== "google" || !providerToken || !appAccessToken) return;
    if (lastSyncedProviderTokenRef.current === providerToken) return;

    fetch("/api/google/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appAccessToken}`,
      },
      body: JSON.stringify({
        providerToken,
        providerRefreshToken: session?.provider_refresh_token ?? null,
      }),
    })
      .then((response) => {
        if (response.ok) {
          lastSyncedProviderTokenRef.current = providerToken;
        }
      })
      .catch(() => {});
  }, [session?.access_token, session?.provider_refresh_token, session?.provider_token, session?.user?.app_metadata?.provider]);

  const value: SupabaseContextValue = {
    supabase,
    user,
    session,
    isUserLoading,
  };

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase must be used within SupabaseProvider");
  }
  return ctx.supabase;
}

export function useUser() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    return { user: null, isUserLoading: false };
  }
  return { user: ctx.user, isUserLoading: ctx.isUserLoading };
}

export function useSession() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    return { session: null, isUserLoading: false };
  }
  return { session: ctx.session, isUserLoading: ctx.isUserLoading };
}
