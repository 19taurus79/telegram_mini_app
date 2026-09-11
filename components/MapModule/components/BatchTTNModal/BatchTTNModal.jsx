import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { validateTTN } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import { Loader2, X, Package, Layers, Hash } from "lucide-react";
import css from "./BatchTTNModal.module.css";

export default function BatchTTNModal({ isOpen, npDeliveries = [], onClose, onSubmit }) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState("common"); // "common" | "individual"
  const [commonTtn, setCommonTtn] = useState("");
  const [individualTtns, setIndividualTtns] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCommonTtn("");
      const initial = {};
      npDeliveries.forEach(d => {
        initial[d.id] = (d.ttn || "").trim();
      });
      setIndividualTtns(initial);
      // Если все заявки одного клиента, по умолчанию можно оставить common
      // Если разные клиенты, можно также оставить common с возможностью переключить
      setMode("common");
    }
  }, [isOpen, npDeliveries]);

  if (!mounted || !isOpen || npDeliveries.length === 0) return null;

  const handleIndividualChange = (id, val) => {
    const cleaned = val.replace(/\D/g, "");
    setIndividualTtns(prev => ({
      ...prev,
      [id]: cleaned
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const initData = getInitData();

      if (mode === "common") {
        const trimmed = commonTtn.trim();
        if (!trimmed) {
          toast.error("Будь ласка, введіть спільний номер ТТН (для НП обов'язково)");
          setIsLoading(false);
          return;
        }

        const res = await validateTTN(trimmed, initData);
        if (!res || !res.success) {
          const errorMsg = res?.errors?.[0] || "ТТН не знайдено або помилка перевірки в Новій Пошті";
          toast.error(errorMsg);
          setIsLoading(false);
          return;
        }

        toast.success("ТТН успішно перевірено");
        
        const updatedNPDeliveries = npDeliveries.map(d => ({
          ...d,
          ttn: trimmed
        }));

        onSubmit({
          commonTtn: trimmed,
          ttnMap: null,
          updatedNPDeliveries
        });
      } else {
        // Individual mode: проверяем каждую доставку
        for (const d of npDeliveries) {
          const val = (individualTtns[d.id] || "").trim();
          if (!val) {
            toast.error(`Введіть ТТН для доставки №${d.id} (${d.client || "Клієнт"})`);
            setIsLoading(false);
            return;
          }
        }

        // Проверяем уникальные ТТН в Новой Почте
        const uniqueTtns = Array.from(new Set(Object.values(individualTtns).map(t => t.trim())));
        
        for (const ttnToCheck of uniqueTtns) {
          const res = await validateTTN(ttnToCheck, initData);
          if (!res || !res.success) {
            const errorMsg = res?.errors?.[0] || `ТТН ${ttnToCheck} не знайдено або помилка перевірки`;
            toast.error(errorMsg);
            setIsLoading(false);
            return;
          }
        }

        toast.success("Всі ТТН успішно перевірено");
        
        const updatedNPDeliveries = npDeliveries.map(d => ({
          ...d,
          ttn: (individualTtns[d.id] || "").trim()
        }));

        onSubmit({
          commonTtn: null,
          ttnMap: individualTtns,
          updatedNPDeliveries
        });
      }
    } catch (err) {
      console.error("Error validating TTNs:", err);
      toast.error("Помилка при перевірці ТТН");
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      className={css.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className={css.modal}>
        <div className={css.header}>
          <div className={css.titleBlock}>
            <span className={css.npBadge}>
              <Package size={13} />
              Нова Пошта ({npDeliveries.length})
            </span>
            <h3>Введіть ТТН для закриття</h3>
            <p className={css.headerSubtitle}>
              Для завершення доставок Нової Пошти обов&apos;язково вкажіть номер ТТН
            </p>
          </div>
          <button className={css.closeBtn} onClick={onClose} disabled={isLoading} title="Закрити">
            <X size={18} />
          </button>
        </div>

        {npDeliveries.length > 1 && (
          <div className={css.modeTabs}>
            <button
              type="button"
              className={`${css.modeTab} ${mode === "common" ? css.active : ""}`}
              onClick={() => setMode("common")}
              disabled={isLoading}
            >
              <Layers size={14} />
              Один спільний ТТН для всіх
            </button>
            <button
              type="button"
              className={`${css.modeTab} ${mode === "individual" ? css.active : ""}`}
              onClick={() => setMode("individual")}
              disabled={isLoading}
            >
              <Hash size={14} />
              Окремий ТТН для кожної
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div className={css.contentArea}>
            {mode === "common" ? (
              <div className={css.commonSection}>
                <div className={css.commonNotice}>
                  Номер ТТН буде автоматично закріплено за всіма <strong>{npDeliveries.length}</strong> обраними доставками Нової Пошти.
                </div>

                <div className={css.inputGroup}>
                  <label className={css.inputLabel}>Номер накладної (ТТН)</label>
                  <div className={css.inputWrapper}>
                    <span className={css.inputIcon}>
                      <Package size={16} />
                    </span>
                    <input
                      type="text"
                      className={css.textInput}
                      value={commonTtn}
                      onChange={(e) => setCommonTtn(e.target.value.replace(/\D/g, ""))}
                      placeholder="20450000000000"
                      disabled={isLoading}
                      autoFocus
                      maxLength={20}
                    />
                  </div>
                  <span className={css.inputHint}>Тільки цифри · зазвичай 14 символів</span>
                </div>

                <div className={css.deliveriesPreviewList}>
                  <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600, marginTop: "6px" }}>
                    Заявки в цій відправці:
                  </div>
                  {npDeliveries.map((d) => (
                    <div key={d.id} className={css.deliveryCard}>
                      <div className={css.deliveryCardHeader}>
                        <span className={css.clientName}>{d.client || "Клієнт"}</span>
                        <span className={css.deliveryBadge}>№{d.id}</span>
                      </div>
                      {d.address && <div className={css.deliveryAddress}>{d.address}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={css.deliveriesPreviewList}>
                {npDeliveries.map((d, idx) => (
                  <div key={d.id} className={css.deliveryCard}>
                    <div className={css.deliveryCardHeader}>
                      <span className={css.clientName}>{d.client || `Доставка №${d.id}`}</span>
                      <span className={css.deliveryBadge}>№{d.id}</span>
                    </div>
                    {d.address && <div className={css.deliveryAddress}>{d.address}</div>}

                    <div className={css.inputGroup} style={{ marginTop: "4px" }}>
                      <label className={css.inputLabel}>ТТН для цієї заявки:</label>
                      <div className={css.inputWrapper}>
                        <span className={css.inputIcon}>
                          <Package size={15} />
                        </span>
                        <input
                          type="text"
                          className={css.textInput}
                          value={individualTtns[d.id] || ""}
                          onChange={(e) => handleIndividualChange(d.id, e.target.value)}
                          placeholder="20450000000000"
                          disabled={isLoading}
                          autoFocus={idx === 0}
                          maxLength={20}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={css.footer}>
            <button
              type="button"
              className={css.cancelBtn}
              onClick={onClose}
              disabled={isLoading}
            >
              Скасувати
            </button>
            <button
              type="submit"
              className={css.submitBtn}
              disabled={isLoading || (mode === "common" && !commonTtn.trim())}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className={css.spin} />
                  Перевірка...
                </>
              ) : (
                "✓ Підтвердити та виконати"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
