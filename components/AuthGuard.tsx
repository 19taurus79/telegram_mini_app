"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/Auth";
import { useInitData } from "@/store/InitData"; // Импортируем useInitData
import { getUser } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import { FadeLoader } from "react-spinners";
import { CSSProperties } from "react";
import axios from "axios";

const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
};

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, setUser, setLoading } = useAuthStore();
  const { setInitData } = useInitData(); // Получаем setInitData
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("AuthGuard: useEffect triggered. Current state:", { user, isAuthenticated, isLoading, pathname });

    const checkAuth = async () => {
      if (pathname === '/login') {
        console.log("AuthGuard: On login page, skipping checkAuth.");
        setLoading(false);
        return;
      }
      console.log("AuthGuard: checkAuth started.");
      setLoading(true);

      // Сигнализируем Telegram, что Мини-апп готов к отображению
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
      }

      let initData = getInitData();
      
      // Если мы в Telegram (есть объект WebApp), но initData пустой - подождем немного
      if (!initData && typeof window !== "undefined" && window.Telegram?.WebApp) {
        console.log("AuthGuard: Telegram object found but initData is empty. Waiting 200ms...");
        await new Promise(resolve => setTimeout(resolve, 200));
        initData = getInitData();
      }

      console.log("AuthGuard: initData detected:", initData ? "YES (length: " + initData.length + ")" : "NO");

      if (initData) {
        setInitData(initData);
        try {
          console.log("AuthGuard: Attempting getUser() with initData...");
          const currentUser = await getUser();
          console.log("AuthGuard: getUser() SUCCESS (TMA mode):", currentUser);
          setUser(currentUser, null);
        } catch (error: unknown) {
          console.error("AuthGuard: Failed to fetch user in Mini App mode (initData).");
          let status = "Network Error";
          let apiError = "";
          if (axios.isAxiosError(error)) {
            status = error.response?.status?.toString() || "Network Error";
            apiError = JSON.stringify(error.response?.data);
            console.error("AuthGuard axios error detail:", { status, data: error.response?.data });
          }
          import('react-hot-toast').then(t => t.default.error(`Авторизація TMA збій: ${status} ${apiError}`));
          setUser(null, null);
        }
      } else {
        console.log("AuthGuard: Browser mode. Current store token:", useAuthStore.getState().accessToken ? "PRESENT" : "MISSING");
        if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData === "") {
           // import('react-hot-toast').then(t => t.default.error("initData відсутній у Telegram"));
        }
        setInitData(null); // Очищаем initData, чтобы использовать accessToken в интерцепторе
        try {
          console.log("AuthGuard: Attempting getUser() in browser mode...");
          const currentUser = await getUser();
          console.log("AuthGuard: getUser() SUCCESS (Browser mode):", currentUser);
          setUser(currentUser, useAuthStore.getState().accessToken);
        } catch (error: unknown) {
          console.error("AuthGuard: Failed to fetch user in browser mode.");
          if (axios.isAxiosError(error)) {
            console.error("AuthGuard browser error detail:", { 
              status: error.response?.status, 
              text: error.response?.statusText,
              data: error.response?.data,
              header: error.config?.headers["Authorization"] ? "Bearer PRESENT" : "Bearer MISSING"
            });
          }
          setUser(null, null);
        }
      }
      setLoading(false);
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, setUser, setLoading, setInitData]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      console.log("AuthGuard: Redirecting to /login.");
      router.push('/login');
    }
    if (!isLoading && isAuthenticated && pathname === '/login') {
      console.log("AuthGuard: Already authenticated on /login, redirecting to /.");
      router.push('/');
    }
  }, [isLoading, isAuthenticated, pathname, router]);


  if (isLoading && pathname !== '/login') {
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
