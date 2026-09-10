import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Send, Mail, MessageSquare, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getInitData } from "@/lib/getInitData";
import { getAccountants, getAccountantForManager, sendDeliveryToAccountant } from "@/lib/api";
import css from "./SendAccountantDialog.module.css";

export default function SendAccountantDialog({
  isOpen,
  delivery,
  items = [],
  onClose,
  onSuccess,
}) {
  const [mounted, setMounted] = useState(false);
  const [accountants, setAccountants] = useState([]);
  const [selectedAccountantId, setSelectedAccountantId] = useState("");
  const [channels, setChannels] = useState({ telegram: true, email: true });
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Завантаження бухгалтерів та дефолтного/закріпленого бухгалтера
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const initData = getInitData();
        const accRes = await getAccountants(initData);
        const list = accRes?.accountants || [];
        if (isSubscribed) setAccountants(list);

        // Шукаємо закріпленого бухгалтера для менеджера доставки
        const managerName = delivery?.manager || "";
        let preselectedId = "";

        if (managerName) {
          const mgrRes = await getAccountantForManager(managerName, initData);
          if (mgrRes?.accountant?.id) {
            preselectedId = mgrRes.accountant.id;
          }
        }

        if (!preselectedId && list.length > 0) {
          const defaultAcc = list.find(a => a.is_default);
          preselectedId = defaultAcc ? defaultAcc.id : list[0].id;
        }

        if (isSubscribed && preselectedId) {
          setSelectedAccountantId(preselectedId);
        }
      } catch (err) {
        console.error("Error loading accountants:", err);
        toast.error("Не вдалося завантажити список бухгалтерів");
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isSubscribed = false;
    };
  }, [isOpen, delivery?.manager]);

  const currentAccountant = useMemo(() => {
    return accountants.find(a => String(a.id) === String(selectedAccountantId)) || null;
  }, [accountants, selectedAccountantId]);

  // Генерація посилання mailto для відкриття поштової програми (Outlook, Thunderbird тощо)
  const handleOpenMailClient = () => {
    if (!currentAccountant?.email) {
      toast.error("У обраного бухгалтера не вказано Email");
      return;
    }

    const client = delivery?.client || "";
    const ttn = delivery?.ttn || "";
    const manager = delivery?.manager || "";
    const date = delivery?.delivery_date || delivery?.date || new Date().toLocaleDateString("uk-UA");

    const mgrPart = manager ? ` | Менеджер: ${manager}` : "";
    const subject = ttn 
      ? `[Нова Пошта] Відомість: ${client} | ТТН ${ttn}${mgrPart}`
      : `[Доставка] Відомість: ${client} | Дата: ${date}${mgrPart}`;

    const itemsLines = (items || [])
      .filter(i => (parseFloat(i.quantity) || 0) > 0)
      .map(it => {
        const prod = it.nomenclature || it.product || "";
        const orderRef = (it.order_ref || it.orderRef || it.order || "").toString().trim();
        const orderPart = orderRef && orderRef !== "—" ? ` [Доповнення: ${orderRef}]` : "";
        const qty = it.quantity || 0;
        const pStrs = (it.parties || [])
          .map(p => {
            const q = p.party_quantity !== "" && p.party_quantity !== undefined ? p.party_quantity : p.moved_q;
            return `${p.party}: ${q}`;
          });
        const partyPart = pStrs.length > 0 ? ` [Партії: ${pStrs.join(", ")}]` : "";
        return `• ${prod}${orderPart} — ${qty} шт${partyPart}`;
      });

    const itemsText = itemsLines.length > 0 ? itemsLines.join("\n") : "(товари не вказані)";

    const isNp = Boolean(ttn && ttn.trim() !== "" && ttn !== "Не вказано");
    const typeStr = isNp ? "Нова Пошта" : "Доставка / Самовивіз";
    const ttnLine = isNp ? `- ТТН Нова Пошта: ${ttn}\n` : "";
    let body = `Доброго дня!\n\nІнформація щодо відвантаження (${typeStr}):\n- Клієнт: ${client}\n- Менеджер: ${manager}\n${ttnLine}- Дата: ${date}\n- Адреса: ${delivery?.address || "—"}\n\nТовари та складські партії:\n${itemsText}\n`;
    if (comment.trim()) {
      body += `\nКоментар: ${comment.trim()}\n`;
    }
    body += `\n---\nЗгенеровано з додатку логістики`;

    const mailtoUrl = `mailto:${encodeURIComponent(currentAccountant.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
  };

  const handleSendAutomatic = async () => {
    if (!currentAccountant) {
      toast.error("Оберіть бухгалтера");
      return;
    }

    const activeChannels = [];
    if (channels.telegram) activeChannels.push("telegram");
    if (channels.email) activeChannels.push("email");

    if (activeChannels.length === 0) {
      toast.error("Оберіть хоча б один канал відправки (Telegram або Email)");
      return;
    }

    if (channels.telegram && (!currentAccountant.telegram_id || currentAccountant.telegram_id === 0)) {
      toast.error("У цього бухгалтера не вказано Telegram ID");
      return;
    }

    if (channels.email && !currentAccountant.email) {
      toast.error("У цього бухгалтера не вказано Email");
      return;
    }

    setIsSending(true);
    try {
      const initData = getInitData();
      const sanitizedItems = (items || []).map(it => ({
        product: String(it.product),
        nomenclature: String(it.nomenclature || it.product),
        quantity: parseFloat(it.quantity) || 0,
        manager: String(it.manager || delivery.manager || ""),
        client: String(it.client || delivery.client || ""),
        order_ref: String(it.orderRef || it.order || it.order_ref || ""),
        weight: parseFloat(it.weight) || 0,
        parties: (it.parties || []).map(p => ({
          party: String(p.party),
          moved_q: parseFloat((p.party_quantity !== "" && p.party_quantity !== undefined) ? p.party_quantity : p.moved_q) || 0
        })).filter(p => p.moved_q > 0),
        line_of_business: it.line_of_business ? String(it.line_of_business) : undefined
      }));

      const payload = {
        delivery_id: parseInt(delivery.id, 10),
        accountant_id: currentAccountant.id,
        channels: activeChannels,
        comment: comment.trim() || undefined,
        items: sanitizedItems,
        ttn: delivery.ttn || undefined
      };

      const res = await sendDeliveryToAccountant(payload, initData);

      if (res && res.status === "ok") {
        let msg = `Дані надіслано бухгалтеру (${currentAccountant.name})!`;
        if (res.telegram?.success) msg += " Telegram ✓";
        if (res.email?.success) msg += " Email ✓";
        if (res.email?.skipped) msg += " (Email: SMTP ще не налаштовано)";
        
        toast.success(msg, { duration: 5000 });

        if (res.warnings && res.warnings.length > 0) {
          res.warnings.forEach(w => toast(w, { icon: "⚠️" }));
        }

        onSuccess && onSuccess(res);
        onClose();
      } else {
        toast.error("Не вдалося надіслати дані");
      }
    } catch (err) {
      console.error("Error sending delivery to accountant:", err);
      const detail = err?.response?.data?.detail || "Помилка при відправці";
      toast.error(detail);
    } finally {
      setIsSending(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className={css.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSending) onClose();
      }}
    >
      <div className={css.modal}>
        <div className={css.header}>
          <div>
            <h3 className={css.title}>📨 Відправка даних бухгалтеру</h3>
            <div className={css.subtitle}>
              Клієнт: <strong>{delivery?.client}</strong> {delivery?.ttn && <>· ТТН: <strong>{delivery.ttn}</strong></>}
            </div>
          </div>
          <button className={css.closeBtn} onClick={onClose} disabled={isSending}>
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
            <Loader2 size={24} className="spin" style={{ animation: "spin 1s linear infinite", marginBottom: "8px" }} />
            <div>Завантаження даних бухгалтерії...</div>
          </div>
        ) : (
          <div>
            {/* Вибір бухгалтера */}
            <div className={css.formGroup}>
              <label className={css.label}>Оберіть бухгалтера:</label>
              <select
                className={css.select}
                value={selectedAccountantId}
                onChange={(e) => setSelectedAccountantId(e.target.value)}
                disabled={isSending}
              >
                {accountants.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.is_default ? "★ (за замовчуванням)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Картка поточного бухгалтера */}
            {currentAccountant && (
              <div className={css.accountantCard}>
                <div className={css.cardRow}>
                  <span className={css.cardLabel}>
                    <Mail size={14} /> Email:
                  </span>
                  <span className={currentAccountant.email ? css.valActive : css.valInactive}>
                    {currentAccountant.email ? `${currentAccountant.email} ✓` : "Не вказано ✗"}
                  </span>
                </div>
                <div className={css.cardRow}>
                  <span className={css.cardLabel}>
                    <MessageSquare size={14} /> Telegram:
                  </span>
                  <span className={currentAccountant.telegram_id ? css.valActive : css.valInactive}>
                    {currentAccountant.telegram_id
                      ? `ID ${currentAccountant.telegram_id} ${currentAccountant.telegram_username ? `(@${currentAccountant.telegram_username})` : ""} ✓`
                      : "Не вказано ✗"}
                  </span>
                </div>
              </div>
            )}

            {/* Канали відправки */}
            <div className={css.formGroup}>
              <label className={css.label}>Канали для відправки:</label>
              <div className={css.channelsGroup}>
                <label className={css.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={css.checkbox}
                    checked={channels.telegram}
                    onChange={(e) => setChannels(prev => ({ ...prev, telegram: e.target.checked }))}
                    disabled={isSending || !currentAccountant?.telegram_id}
                  />
                  <span>Telegram {currentAccountant?.telegram_id ? "" : "(недоступно)"}</span>
                </label>

                <label className={css.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={css.checkbox}
                    checked={channels.email}
                    onChange={(e) => setChannels(prev => ({ ...prev, email: e.target.checked }))}
                    disabled={isSending || !currentAccountant?.email}
                  />
                  <span>Email {currentAccountant?.email ? "" : "(недоступно)"}</span>
                </label>
              </div>
            </div>

            {/* Додатковий коментар */}
            <div className={css.formGroup}>
              <label className={css.label}>Коментар або примітка (необов&apos;язково):</label>
              <textarea
                className={css.textarea}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Вкажіть додаткову інформацію або побажання для бухгалтерії..."
                disabled={isSending}
              />
            </div>

            {/* Дії */}
            <div className={css.actions}>
              {currentAccountant?.email && (
                <button
                  type="button"
                  className={css.mailClientBtn}
                  onClick={handleOpenMailClient}
                  disabled={isSending}
                  title="Відкрити Outlook або вашу поштову програму за замовчуванням із заповненим текстом"
                >
                  <ExternalLink size={15} />
                  <span>Відкрити у поштовій програмі (Outlook / Mail)</span>
                </button>
              )}

              <div className={css.primaryActions}>
                <button
                  type="button"
                  className={css.cancelBtn}
                  onClick={onClose}
                  disabled={isSending}
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  className={css.sendBtn}
                  onClick={handleSendAutomatic}
                  disabled={isSending || (!channels.telegram && !channels.email)}
                >
                  {isSending ? (
                    <>
                      <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                      <span>Відправка...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Надіслати бухгалтеру</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
