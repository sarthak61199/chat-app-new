import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api } from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";

export function useAuth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.getMe,
    retry: false,
  });

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
  };
}

export function useSignUp() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: api.signUp,
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data);
      connectSocket();
      navigate({ to: "/" });
    },
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: api.signIn,
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data);
      connectSocket();
      navigate({ to: "/" });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: api.signOut,
    onSuccess: () => {
      disconnectSocket();
      queryClient.clear();
      navigate({ to: "/sign-in" });
    },
  });
}
