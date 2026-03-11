import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user && !isError,
    logout: logoutMutation.mutate,
  };
}
