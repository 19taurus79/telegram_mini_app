"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import NovaPoshtaSelector, { NPSelection } from "@/components/NovaPoshta/NovaPoshtaSelector";
import { DeliveryRequest, ClientAddress } from "@/types/types";
import { getDeliveryById, updateDeliveryData, updateClientAddress } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import toast from "react-hot-toast";
import { 
  Box, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  AlertTriangle, 
  Calendar, 
  X,
  MessageSquare,
  Package
} from "lucide-react";
import css from "./NovaPoshtaFill.module.css";

interface Props {
  deliveryId: string;
}

export default function NovaPoshtaFillClient({ deliveryId }: Props) {
  const [delivery, setDelivery] = useState<DeliveryRequest | null>(null);
  const [clientAddress, setClientAddress] = useState<ClientAddress | null>(null);
  const [defaultNpData, setDefaultNpData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [npSelection, setNpSelection] = useState<NPSelection | null>(null);
  const [saveAsClientDefault, setSaveAsClientDefault] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showItems, setShowItems] = useState(false);

  // Ініціалізація Telegram WebApp
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready?.();
        window.Telegram.WebApp.expand?.();
      } catch (err) {
        console.warn("Telegram WebApp API error:", err);
      }
    }
  }, []);

  // Завантаження доставки
  const loadDelivery = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const initData = getInitData();
      const res = await getDeliveryById(deliveryId, initData);
      setDelivery(res.delivery);
      setClientAddress(res.client_address || null);
      setDefaultNpData(res.default_np_data || null);
    } catch (err) {
      console.error("Failed to load delivery:", err);
      setLoadError("Не вдалося завантажити дані доставки. Перевірте доступ або повторіть спробу.");
    } finally {
      setIsLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    loadDelivery();
  }, [loadDelivery]);

  // Початкові дані для NovaPoshtaSelector
  const initialSelection = useMemo<Partial<NPSelection>>(() => {
    let clientNp: Partial<NPSelection> | null = null;
    const rawNp = defaultNpData || clientAddress?.default_np_data;
    if (rawNp) {
      if (typeof rawNp === "string") {
        try {
          clientNp = JSON.parse(rawNp) as Partial<NPSelection>;
        } catch {
          clientNp = null;
        }
      } else {
        clientNp = rawNp as Partial<NPSelection>;
      }
    }

    return {
      ...clientNp,
      recipientName:
        clientNp?.recipientName ||
        delivery?.contact ||
        clientAddress?.representative ||
        "",
      recipientPhone:
        clientNp?.recipientPhone ||
        delivery?.phone ||
        clientAddress?.phone1 ||
        "",
      deliveryType: clientNp?.deliveryType || "branch",
      recipientType: clientNp?.recipientType || "person",
      payer: clientNp?.payer || "recipient",
      paymentMethod: clientNp?.paymentMethod || "cash",
    };
  }, [defaultNpData, clientAddress, delivery?.contact, delivery?.phone]);

  // Обробник збереження та відправки
  const handleSave = async () => {
    if (!delivery) return;

    if (!npSelection || !npSelection.isValid) {
      toast.error("Будь ласка, заповніть усі обов'язкові дані Нової Пошти");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Збереження реквізитів Нової Пошти...");

    try {
      const initData = getInitData();
      const actorName = delivery.manager || "Менеджер";

      const fullCity = npSelection.city?.present || npSelection.city?.main_description || "";
      const deliveryTypeLabel =
        npSelection.deliveryType === "branch"
          ? "Відділення"
          : npSelection.deliveryType === "postomat"
          ? "Поштомат"
          : "Адресна доставка";

      const streetDesc =
        npSelection.street?.description ||
        npSelection.street?.present ||
        npSelection.address ||
        "";
      const targetPoint =
        npSelection.deliveryType === "address"
          ? `${streetDesc}, буд. ${npSelection.house || ""}`.trim()
          : npSelection.warehouse?.description || "";

      const payerNote = npSelection.payer === "sender" ? "Оплата: Відправник" : "Оплата: Отримувач";
      const paymentNote = npSelection.paymentMethod === "cash" ? "Готівка" : "Безготівковий";

      const finalAddress = `Нова Пошта: ${fullCity}, ${deliveryTypeLabel}: ${targetPoint} | ${payerNote} | ${paymentNote}`;

      let finalContact = npSelection.recipientName;
      if (npSelection.recipientType === "company") {
        finalContact = `${npSelection.companyName || ""} (ЄДРПОУ: ${npSelection.companyEdrpou || ""}), представник: ${npSelection.recipientName || ""}`.trim();
      }
      const finalPhone = npSelection.recipientPhone;

      const currentComment = delivery.comment || "";
      let finalComment = currentComment;
      if (!currentComment.includes("Нова Пошта:")) {
        const fullNPInfo = `${finalAddress} | Отримувач: ${finalContact} | Тел: ${finalPhone}`;
        finalComment = currentComment ? `${fullNPInfo}\n\n${currentComment}`.trim() : fullNPInfo;
      }

      // Підготовка позицій
      const cleanItems = (delivery.items || []).map((item) => {
        const recordItem = item as Record<string, unknown>;
        return {
          product: String(item.product),
          quantity: Number(item.quantity) || 0,
          orderRef: String(recordItem.order_ref || recordItem.orderRef || ""),
          weight: Number(recordItem.total_weight || recordItem.weight || item.weight || 0),
          parties: Array.isArray(item.parties)
            ? item.parties.map((p) => {
                const recordParty = p as Record<string, unknown>;
                return {
                  party: String(p.party),
                  moved_q: Number(recordParty.party_quantity || recordParty.moved_q || p.party_quantity || p.moved_q || 0),
                };
              })
            : [],
        };
      });

      const totalWeight =
        delivery.total_weight ||
        cleanItems.reduce((sum, item) => sum + (item.weight || 0), 0);

      // 1. Оновлюємо доставку зі статусом "Нова Пошта"
      await updateDeliveryData(
        String(delivery.id),
        "Нова Пошта",
        cleanItems,
        totalWeight,
        initData,
        actorName,
        undefined,
        {
          address: finalAddress,
          contact: finalContact,
          phone: finalPhone,
          comment: finalComment,
          latitude: 0,
          longitude: 0,
        }
      );

      // 2. Якщо вибрано збереження як дефолтне для клієнта
      if (saveAsClientDefault && clientAddress && clientAddress.id) {
        try {
          const clientPayload = {
            ...clientAddress,
            address: clientAddress.address || clientAddress.city || finalAddress,
            default_np_data: npSelection as unknown as Record<string, unknown>,
          };
          await updateClientAddress({
            id: clientAddress.id,
            clientData: clientPayload as unknown as Parameters<typeof updateClientAddress>[0]["clientData"],
            initData,
          });
        } catch (cErr) {
          console.warn("Could not save default NP data for client:", cErr);
        }
      }

      toast.success("Дані Нової Пошти збережено!", { id: toastId });
      setIsSuccess(true);

      // Закриваємо WebApp через 2.5 секунди якщо в Telegram
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        setTimeout(() => {
          try {
            window.Telegram?.WebApp?.close();
          } catch {
            // ignore
          }
        }, 2500);
      }
    } catch (err) {
      console.error("Failed to save NP details:", err);
      toast.error("Помилка збереження даних", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseWebApp = () => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.close();
        return;
      } catch {
        // ignore
      }
    }
    window.close();
  };

  if (isLoading) {
    return (
      <div className={css.pageContainer}>
        <div className={css.centerContainer}>
          <Loader2 size={36} className={css.loadingSpinner} />
          <p style={{ color: "#94a3b8" }}>Завантаження даних доставки №{deliveryId}...</p>
        </div>
      </div>
    );
  }

  if (loadError || !delivery) {
    return (
      <div className={css.pageContainer}>
        <div className={css.centerContainer}>
          <AlertTriangle size={48} color="#ef4444" />
          <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#fff" }}>Помилка завантаження</h2>
          <p style={{ color: "#94a3b8", maxWidth: 360 }}>{loadError || "Доставку не знайдено"}</p>
          <button className={css.retryBtn} onClick={loadDelivery}>
            Спробувати знову
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={css.pageContainer}>
        <div className={css.contentWrapper}>
          <div className={css.successCard}>
            <div className={css.successIcon}>
              <CheckCircle size={36} />
            </div>
            <h2 className={css.successTitle}>Дані успішно передано!</h2>
            <p className={css.successDesc}>
              Доставку <b>№{delivery.id}</b> переведено в статус <b>«Нова Пошта»</b>. Логісти отримали сповіщення з реквізитами відправки.
            </p>
            <div className={css.successDetails}>
              <div>👤 Клієнт: <b>{delivery.client}</b></div>
              <div>📍 Одержувач: <b>{npSelection?.recipientName} ({npSelection?.recipientPhone})</b></div>
              <div>🏢 Місто / Відділення: <b>{npSelection?.city?.present}, {npSelection?.warehouse?.description || npSelection?.address}</b></div>
            </div>
            <button className={css.closeAppBtn} onClick={handleCloseWebApp}>
              Закрити Mini App
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Виділяємо коментар логіста (якщо є)
  const logisticianNote = delivery.comment && delivery.comment.includes("[Логіст")
    ? delivery.comment.split("\n").filter(line => line.includes("[Логіст")).join("\n")
    : null;

  return (
    <div className={css.pageContainer}>
      <div className={css.contentWrapper}>
        {/* Header */}
        <header className={css.header}>
          <div className={css.headerTitleBox}>
            <div className={css.brandRow}>
              <h1 className={css.pageTitle}>Нова Пошта</h1>
              <span className={css.npBadge}>№{delivery.id}</span>
            </div>
            <p className={css.pageSubtitle}>Заповніть реквізити для відправки замовлення</p>
          </div>
          <button className={css.closeBtn} onClick={handleCloseWebApp} title="Закрити">
            <X size={20} />
          </button>
        </header>

        {/* Logistician Note Alert */}
        {logisticianNote && (
          <div className={css.logisticianNote}>
            <MessageSquare size={20} className={css.noteIcon} />
            <div className={css.noteContent}>
              <span className={css.noteTitle}>Коментар від логіста:</span>
              <span className={css.noteText}>{logisticianNote.replace(/\[Логіст.*?\]:\s*/g, "")}</span>
            </div>
          </div>
        )}

        {/* Order Summary Card */}
        <div className={css.orderCard}>
          <div className={css.orderCardHeader}>
            <span className={css.clientName}>{delivery.client}</span>
            {delivery.delivery_date && (
              <span className={css.orderDate}>
                <Calendar size={14} /> {delivery.delivery_date}
              </span>
            )}
          </div>

          <div className={css.metaGrid}>
            <div className={css.metaItem}>
              <span className={css.metaLabel}>Менеджер</span>
              <span className={css.metaValue}>{delivery.manager || "—"}</span>
            </div>
            <div className={css.metaItem}>
              <span className={css.metaLabel}>Загальна вага</span>
              <span className={css.metaValue}>
                {delivery.total_weight ? `${Number(delivery.total_weight).toFixed(2)} кг` : "—"}
              </span>
            </div>
          </div>

          {/* Items Accordion */}
          {delivery.items && delivery.items.length > 0 && (
            <div>
              <button
                type="button"
                className={css.itemsToggle}
                onClick={() => setShowItems(!showItems)}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Package size={14} /> Товари в доставці ({delivery.items.length})
                </span>
                {showItems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showItems && (
                <div className={css.itemsList}>
                  {delivery.items.map((item, idx) => (
                    <div key={idx} className={css.itemRow}>
                      <span className={css.itemProduct} title={item.product}>
                        {item.product}
                      </span>
                      <span className={css.itemQuantity}>
                        {item.quantity} шт.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Container */}
        <div className={css.formContainer}>
          <NovaPoshtaSelector
            onSelect={setNpSelection}
            initialSelection={initialSelection}
          />

          <label className={css.clientDefaultCheckbox}>
            <input
              type="checkbox"
              checked={saveAsClientDefault}
              onChange={(e) => setSaveAsClientDefault(e.target.checked)}
            />
            <span>Зберегти як основні дані НП для клієнта «{delivery.client}»</span>
          </label>
        </div>

        {/* Sticky Submit Button */}
        <div className={css.submitArea}>
          <button
            className={css.submitBtn}
            onClick={handleSave}
            disabled={isSaving || !npSelection?.isValid}
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Збереження даних...
              </>
            ) : (
              <>
                <Box size={18} />
                Зберегти та надіслати логісту
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
