"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/supabase/types";
import { useSupabase, useUser } from "@/supabase/provider";

type QueryState<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
};

type RefetchOptions = {
  silent?: boolean;
};

type RealtimeConfig = {
  table: string;
  filter?: string;
};

export function useSupabaseQuery<T>(
  queryFn: (client: SupabaseClient) => Promise<T>,
  deps: unknown[],
  realtime?: RealtimeConfig | null
): QueryState<T> & { refetch: (options?: RefetchOptions) => Promise<void> } {
  const supabase = useSupabase();
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const refetch = useCallback(async (options?: RefetchOptions) => {
    if (options?.silent) {
      setState(prev => ({ ...prev, error: null }));
    } else {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }
    try {
      const result = await queryFnRef.current(supabase);
      setState(prev => ({ ...prev, data: result, isLoading: false, error: null }));
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, error }));
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;
    refetch().catch(() => {});

    if (realtime?.table) {
      const channel = supabase
        .channel(`rt-${realtime.table}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: realtime.table,
            filter: realtime.filter,
          },
          () => {
            if (!isMounted) return;
            refetch({ silent: true }).catch(() => {});
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [...deps, realtime?.table, realtime?.filter]);

  return { ...state, refetch };
}

export function useProfile(): QueryState<Profile> & { refetch: () => Promise<void> } {
  const { user } = useUser();
  const supabase = useSupabase();

  const queryFn = useCallback(async (client: SupabaseClient) => {
    if (!user) return null as any;
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    return data as Profile;
  }, [user?.id]);

  return useSupabaseQuery<Profile>(
    queryFn,
    [supabase, user?.id],
    user
      ? {
          table: "profiles",
          filter: `id=eq.${user.id}`,
        }
      : null
  );
}
