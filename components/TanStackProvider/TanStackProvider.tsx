"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWebsocket } from "@/hooks/useWebsocket";

type Props = {
  children: React.ReactNode;
};

/**
 * Вспомогательный компонент для инициализации WebSocket внутри QueryClientProvider.
 * Это необходимо, так как useWebsocket использует useQueryClient().
 */
const SocketInitializer = () => {
  useWebsocket();
  return null;
};

const TanStackProvider = ({ children }: Props) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SocketInitializer />
      {children}
    </QueryClientProvider>
  );
};

export default TanStackProvider;
