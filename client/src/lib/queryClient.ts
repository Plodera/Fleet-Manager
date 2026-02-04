import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Custom event for session invalidation notification
export const SESSION_INVALIDATED_EVENT = "session-invalidated";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle session invalidated (logged in from another location)
    if (res.status === 440) {
      try {
        const data = await res.json();
        // Dispatch custom event to notify the app about session invalidation
        window.dispatchEvent(new CustomEvent(SESSION_INVALIDATED_EVENT, { 
          detail: { message: data.notification || "Your session has been terminated because your account was logged in from another location." }
        }));
      } catch {
        window.dispatchEvent(new CustomEvent(SESSION_INVALIDATED_EVENT, { 
          detail: { message: "Your session has been terminated because your account was logged in from another location." }
        }));
      }
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = "/auth";
      }, 3000);
      throw new Error("Session expired - logged in from another location");
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }
    
    // Handle session invalidated (logged in from another location)
    if (res.status === 440) {
      try {
        const data = await res.json();
        window.dispatchEvent(new CustomEvent(SESSION_INVALIDATED_EVENT, { 
          detail: { message: data.notification || "Your session has been terminated because your account was logged in from another location." }
        }));
      } catch {
        window.dispatchEvent(new CustomEvent(SESSION_INVALIDATED_EVENT, { 
          detail: { message: "Your session has been terminated because your account was logged in from another location." }
        }));
      }
      setTimeout(() => {
        window.location.href = "/auth";
      }, 3000);
      throw new Error("Session expired - logged in from another location");
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
