import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { validateTTN } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import { Loader2, X } from "lucide-react";
import css from "./TTNInputModal.module.css";

export default function TTNInputModal({ isOpen, onClose, onSubmit }) {
  const [ttn, setTtn] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) setTtn("");
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ttn.trim()) {
      toast.error("Будь ласка, введіть номер ТТН");
      return;
    }

    setIsLoading(true);
    try {
      const initData = getInitData();
      const res = await validateTTN(ttn.trim(), initData);

      if (res && res.success) {
        toast.success("ТТН перевірено успішно");
        onSubmit(ttn.trim());
      } else {
        const errorMsg = res?.errors?.[0] || "ТТН не знайдено або помилка перевірки";
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Error validating TTN:", error);
      toast.error("Помилка при перевірці ТТН");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className={css.overlay}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={css.modal}>
        <div className={css.header}>
          <div className={css.titleBlock}>
            <span className={css.npBadge}>📦 Нова Пошта</span>
            <h3>Введіть номер ТТН</h3>
          </div>
          <button className={css.closeBtn} onClick={onClose} disabled={isLoading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={css.form}>
          <div className={css.inputGroup}>
            <label>Номер накладної (ТТН)</label>
            <div className={css.inputWrapper}>
              <span className={css.inputIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" rx="2"/>
                  <path d="M16 8h4l3 5v3h-7V8z"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </span>
              <input
                type="text"
                value={ttn}
                onChange={(e) => setTtn(e.target.value.replace(/\D/g, ""))}
                placeholder="20450000000000"
                disabled={isLoading}
                autoFocus
                maxLength={20}
              />
            </div>
            <span className={css.hint}>Тільки цифри · 14 символів</span>
          </div>

          <div className={css.divider} />

          <div className={css.actions}>
            <button type="button" className={css.cancelBtn} onClick={onClose} disabled={isLoading}>
              Скасувати
            </button>
            <button type="submit" className={css.submitBtn} disabled={isLoading || !ttn.trim()}>
              {isLoading
                ? <><Loader2 size={15} className={css.spin} /> Перевірка...</>
                : "✓ Підтвердити"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
