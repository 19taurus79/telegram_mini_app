"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: ReactNode;
  rootId?: string;
}

export default function Portal({ children, rootId = "modal-root" }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const rootElement = document.getElementById(rootId);
  if (!rootElement) {
    console.warn(`Portal root element with id "${rootId}" not found.`);
    return <>{children}</>;
  }

  return createPortal(children, rootElement);
}
