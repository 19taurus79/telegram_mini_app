"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useUnmappedCount } from "@/hooks/useUnmappedCount";
import css from "./AddressFixWidget.module.css";

export default function AddressFixWidget() {
  const count = useUnmappedCount();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || count === 0) {
    return null;
  }

  return (
    <div className={css.card}>
      <div className={css.mainContent}>
        <div className={css.headerRow}>
          <div className={css.iconWrapper}>
            <AlertTriangle size={22} color="#ef4444" />
          </div>
          <div className={css.titleGroup}>
            <h3 className={css.title}>Потрібне уточнення адрес для</h3>
            <span className={css.badgeHighlight}>{count} контрагентів</span>
          </div>
        </div>
        <p className={css.description}>
          У довіднику відсутні дані про адресу вигрузки. Заявки по цих клієнтах не відображаються на мапі доставок.
        </p>
      </div>

      <Link href="/address_fix" className={css.actionBtn}>
        <span>📍 Внести адреси</span>
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
