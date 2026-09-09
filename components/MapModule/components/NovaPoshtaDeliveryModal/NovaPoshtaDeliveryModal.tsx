"use client";

import React, { useState, useMemo } from "react";
import NovaPoshtaSelector, { NPSelection } from "@/components/NovaPoshta/NovaPoshtaSelector";
import Portal from "@/components/Portal";
import { DeliveryRequest, ClientAddress } from "@/types/types";
import { useApplicationsStore } from "../../store/applicationsStore";
import { useUser } from "@/store/User";
import { updateDeliveryData, updateClientAddress, requestNPDetailsFromManager } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Box, X, Loader2, Send, MessageSquare } from "lucide-react";
import css from "./NovaPoshtaDeliveryModal.module.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  delivery: DeliveryRequest | null;
  onSuccess?: (updatedDelivery: DeliveryRequest) => void;
}

export default function NovaPoshtaDeliveryModal({ isOpen, onClose, delivery, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const userData = useUser((state) => state.userData);
  const clients = useApplicationsStore((state) => state.clients as ClientAddress[]);
  const setClients = useApplicationsStore((state) => state.setClients);
  const updateDeliveries = useApplicationsStore((state) => state.updateDeliveries);

  const [npSelection, setNpSelection] = useState<NPSelection | null>(null);
  const [saveAsClientDefault, setSaveAsClientDefault] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showManagerPrompt, setShowManagerPrompt] = useState(false);
  const [managerComment, setManagerComment] = useState("");
  const [isRequestingManager, setIsRequestingManager] = useState(false);

  // Знаходимо клієнта доставки серед списку клієнтів
  const clientObj = useMemo(() => {
    if (!delivery?.client || !Array.isArray(clients)) return null;
    return clients.find((c) => c.client === delivery.client) || null;
  }, [delivery?.client, clients]);

  // Формуємо початкові дані: якщо у клієнта збережені default_np_data — беремо їх, інакше підставляємо контакти
  const initialSelection = useMemo<Partial<NPSelection>>(() => {
    let clientNp: Partial<NPSelection> | null = null;
    if (clientObj?.default_np_data) {
      if (typeof clientObj.default_np_data === "string") {
        try {
          clientNp = JSON.parse(clientObj.default_np_data) as Partial<NPSelection>;
        } catch {
          clientNp = null;
        }
      } else {
        clientNp = clientObj.default_np_data as Partial<NPSelection>;
      }
    }

    return {
      ...clientNp,
      recipientName:
        clientNp?.recipientName ||
        delivery?.contact ||
        clientObj?.representative ||
        "",
      recipientPhone:
        clientNp?.recipientPhone ||
        delivery?.phone ||
        clientObj?.phone1 ||
        "",
      deliveryType: clientNp?.deliveryType || "branch",
      recipientType: clientNp?.recipientType || "person",
      payer: clientNp?.payer || "recipient",
      paymentMethod: clientNp?.paymentMethod || "cash",
    };
  }, [clientObj, delivery?.contact, delivery?.phone]);

  if (!isOpen || !delivery) return null;

  const handleSave = async () => {
    if (!npSelection || !npSelection.isValid) {
      toast.error("Будь ласка, заповніть усі обов'язкові дані Нової Пошти");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Збереження переведення на Нову Пошту...");

    try {
      const initData = getInitData();
      const actorName = userData?.full_name_for_orders || "";

      // Формуємо адресний рядок у форматі НП
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

      // Оновлюємо коментар, додаючи опис доставки НП (якщо його там ще немає)
      const currentComment = delivery.comment || "";
      let finalComment = currentComment;
      if (!currentComment.includes("Нова Пошта:")) {
        const fullNPInfo = `${finalAddress} | Отримувач: ${finalContact} | Тел: ${finalPhone}`;
        finalComment = currentComment ? `${fullNPInfo}\n\n${currentComment}`.trim() : fullNPInfo;
      }

      // Готуємо список позицій
      const cleanItems = (delivery.items || []).map((item) => {
        const recordItem = item as Record<string, unknown>;
        return {
          product: String(item.product),
          nomenclature: String(recordItem.nomenclature || item.product),
          quantity: Number(item.quantity) || 0,
          manager: String(recordItem.manager || delivery.manager || ""),
          client: String(recordItem.client || delivery.client || ""),
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
          line_of_business: recordItem.line_of_business ? String(recordItem.line_of_business) : undefined
        };
      });

      const totalWeight =
        delivery.total_weight ||
        cleanItems.reduce((sum, item) => sum + (item.weight || 0), 0);

      // Викликаємо API оновлення доставки
      const res = await updateDeliveryData(
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

      if (res && res.warnings && res.warnings.length > 0) {
        res.warnings.forEach((warn) => toast(warn, { icon: "⚠️", duration: 6000 }));
      }

      // Оновлюємо збережені дані клієнта за замовчуванням при увімкненому чекбоксі
      if (saveAsClientDefault && clientObj && clientObj.id) {
        try {
          const clientPayload = {
            ...clientObj,
            address: clientObj.address || clientObj.city || finalAddress,
            default_np_data: npSelection as unknown as Record<string, unknown>,
          };
          await updateClientAddress({
            id: clientObj.id,
            clientData: clientPayload as unknown as Parameters<typeof updateClientAddress>[0]["clientData"],
            initData,
          });
          setClients((prev: ClientAddress[]) =>
            prev.map((c) =>
              c.id === clientObj.id
                ? { ...c, default_np_data: npSelection as unknown as Record<string, unknown> }
                : c
            )
          );
          queryClient.invalidateQueries({ queryKey: ["clients"] });
        } catch (clientErr) {
          console.warn("Could not save default NP data for client:", clientErr);
        }
      }

      // Оновлюємо локальний Zustand стор
      const updatedDelivery: DeliveryRequest = {
        ...delivery,
        status: "Нова Пошта",
        address: finalAddress,
        contact: finalContact,
        phone: finalPhone,
        comment: finalComment,
        latitude: 0,
        longitude: 0,
      };

      updateDeliveries([updatedDelivery]);
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });

      toast.success("Доставку переведено на Нову Пошту!", { id: toastId });
      onSuccess?.(updatedDelivery);
      onClose();
    } catch (error) {
      console.error("Failed to switch delivery to Nova Poshta:", error);
      toast.error("Помилка при переведенні на Нову Пошту", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestFromManager = async () => {
    setIsRequestingManager(true);
    const toastId = toast.loading("Надсилання запиту менеджеру...");
    try {
      const initData = getInitData();
      await requestNPDetailsFromManager(delivery.id, managerComment, initData);

      const updatedDelivery: DeliveryRequest = {
        ...delivery,
        status: "Потрібні дані НП",
        comment: managerComment
          ? `${delivery.comment || ""}\n[Логіст]: ${managerComment}`.trim()
          : delivery.comment,
      };

      updateDeliveries([updatedDelivery]);
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });

      toast.success("Запит надіслано менеджеру в Telegram!", { id: toastId });
      onSuccess?.(updatedDelivery);
      onClose();
    } catch (err) {
      console.error("Failed to send NP request to manager:", err);
      toast.error("Помилка при надсиланні запиту менеджеру", { id: toastId });
    } finally {
      setIsRequestingManager(false);
    }
  };

  return (
    <Portal>
      <div className={css.overlay} onClick={onClose}>
        <div className={css.modal} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={css.header}>
            <div className={css.titleArea}>
              <div className={css.titleRow}>
                <h3 className={css.title}>
                  <Box size={20} color="#e30613" />
                  Переведення на Нову Пошту
                </h3>
                <span className={css.npBadge}>№{delivery.id}</span>
              </div>
              <p className={css.subtitle}>
                Оберіть місто, відділення та отримувача для відправки через НП
              </p>
            </div>
            <button className={css.closeBtn} onClick={onClose} aria-label="Закрити">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className={css.body}>
            <div className={css.infoBanner}>
              <div className={css.infoRow}>
                <span className={css.infoLabel}>Клієнт:</span>
                <span className={css.infoValue}>{delivery.client}</span>
              </div>
              <div className={css.infoRow}>
                <span className={css.infoLabel}>Поточний статус:</span>
                <span className={css.infoValue}>{delivery.status}</span>
              </div>
              <div className={css.infoRow}>
                <span className={css.infoLabel}>Загальна вага:</span>
                <span className={css.infoValue}>
                  {delivery.total_weight ? `${Number(delivery.total_weight).toFixed(2)} кг` : "—"}
                </span>
              </div>
            </div>

            {/* Nova Poshta Selector */}
            <NovaPoshtaSelector
              onSelect={setNpSelection}
              initialSelection={initialSelection}
            />

            {/* Checkbox: save as client default */}
            <label className={css.clientDefaultCheckbox}>
              <input
                type="checkbox"
                checked={saveAsClientDefault}
                onChange={(e) => setSaveAsClientDefault(e.target.checked)}
              />
              <span>Зберегти ці дані як основне відділення для клієнта «{delivery.client}»</span>
            </label>

            {/* Manager Request Prompt Box */}
            {showManagerPrompt && (
              <div className={css.managerPromptBox}>
                <div className={css.managerPromptHeader}>
                  <MessageSquare size={16} color="#f59e0b" />
                  <span>Запит менеджеру ({delivery.manager || "автору заявки"})</span>
                </div>
                <p className={css.managerPromptDesc}>
                  Статус доставки зміниться на «Потрібні дані НП». Менеджер отримає сповіщення в Telegram із кнопкою для швидкого заповнення через Mini App.
                </p>
                <textarea
                  className={css.managerTextarea}
                  placeholder="Коментар для менеджера (наприклад: 'Уточніть у клієнта номер відділення')..."
                  value={managerComment}
                  onChange={(e) => setManagerComment(e.target.value)}
                  rows={2}
                />
                <div className={css.managerPromptActions}>
                  <button
                    type="button"
                    className={css.managerCancelBtn}
                    onClick={() => setShowManagerPrompt(false)}
                    disabled={isRequestingManager}
                  >
                    Скасувати
                  </button>
                  <button
                    type="button"
                    className={css.managerSendBtn}
                    onClick={handleRequestFromManager}
                    disabled={isRequestingManager}
                  >
                    {isRequestingManager ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Надсилання...
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Підтвердити та надіслати
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={css.footer}>
            <button
              type="button"
              className={css.requestManagerBtn}
              onClick={() => setShowManagerPrompt((prev) => !prev)}
              disabled={isSaving || isRequestingManager}
              title="Надіслати запит менеджеру в Telegram для заповнення"
            >
              <Send size={15} />
              Надіслати менеджеру
            </button>
            <button className={css.cancelBtn} onClick={onClose} disabled={isSaving || isRequestingManager}>
              Скасувати
            </button>
            <button
              className={css.submitBtn}
              onClick={handleSave}
              disabled={isSaving || isRequestingManager || !npSelection?.isValid}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Збереження...
                </>
              ) : (
                <>
                  <Box size={16} />
                  {delivery.status === "Нова Пошта"
                    ? "Зберегти зміни НП"
                    : "Перевести на Нову Пошту"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
