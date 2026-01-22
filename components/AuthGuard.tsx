"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/Auth";
import { getUser } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import { FadeLoader } from "react-spinners";
import { CSSProperties } from "react";

const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
};

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, setUser, setLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("AuthGuard: useEffect triggered. Current state:", { user, isAuthenticated, isLoading, pathname });

    const checkAuth = async () => {
      console.log("AuthGuard: checkAuth started.");
      setLoading(true); // Начинаем загрузку

      const initData = getInitData();
      console.log("AuthGuard: initData =", initData ? "present" : "absent");

      if (initData) {
        console.log("AuthGuard: Mini App mode detected.");
        // В Mini App мы полагаемся на initData для каждого запроса.
        // Здесь мы можем запросить данные пользователя, используя initData.
        try {
          const currentUser = await getUser(); // getUser() теперь использует initData из интерцептора
          setUser(currentUser, null); // В Mini App accessToken не нужен
          console.log("AuthGuard: Mini App user fetched successfully:", currentUser);
        } catch (error) {
          console.error("AuthGuard: Failed to fetch user in Mini App mode:", error);
          setUser(null, null);
        }
      } else {
        console.log("AuthGuard: Browser mode detected. Attempting to fetch user via cookie/token.");
        try {
          // getUser() теперь автоматически отправит токен, если он есть в useAuthStore (из localStorage)
          const currentUser = await getUser();
          setUser(currentUser, useAuthStore.getState().accessToken); // Сохраняем пользователя и существующий токен
          console.log("AuthGuard: User fetched successfully in browser mode:", currentUser);
        } catch (error) {
          console.error("AuthGuard: Failed to fetch user in browser mode:", error);
          setUser(null, null); // Сбрасываем пользователя и токен
        }
      }
      setLoading(false); // Заканчиваем загрузку
      console.log("AuthGuard: checkAuth finished. Final state:", { user: useAuthStore.getState().user, isAuthenticated: useAuthStore.getState().isAuthenticated, isLoading: useAuthStore.getState().isLoading });
    };

    // Запускаем проверку только если пользователь еще не загружен и не в процессе загрузки
    // или если состояние загрузки сброшено (например, после ошибки)
    if (!user && isLoading) { // Initial load or after a reset
        checkAuth();
    } else if (!isLoading && !isAuthenticated && pathname !== '/login') {
        console.log("AuthGuard: Not authenticated and not on login page. Redirecting to /login.");
        router.push('/login');
    }
  }, [user, isAuthenticated, isLoading, pathname, router, setUser, setLoading]);

  // Этот useEffect отвечает за редирект после того, как isLoading станет false
  useEffect(() => {
    if (!isLoading) { // Только после того, как загрузка завершилась
      if (!isAuthenticated && pathname !== '/login') {
        console.log("AuthGuard: Redirecting to /login due to lack of authentication.");
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, pathname, router]);


  if (isLoading) {
    console.log("AuthGuard: Rendering loader.");
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <FadeLoader color="#0ef18e" cssOverride={override} />
      </div>
    );
  }

  if (!isAuthenticated && pathname === '/login') {
    console.log("AuthGuard: Rendering login page for unauthenticated user.");
    return <>{children}</>;
  }

  if (isAuthenticated) {
    console.log("AuthGuard: Rendering children for authenticated user.");
    return <>{children}</>;
  }

  console.log("AuthGuard: Fallback rendering null (should not happen often).");
  return null;
}
