import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Send, Mail, MessageSquare, ExternalLink, Loader2, CheckCircle2, AlertCircle, FileText, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { getInitData } from "@/lib/getInitData";
import { getAccountants, getAccountantForManager, sendDeliveryToAccountant } from "@/lib/api";
import css from "./SendAccountantDialog.module.css";

export default function SendAccountantDialog({
  isOpen,
  delivery,
  deliveries = [],
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

  // Групування позицій замовлень по доповненнях і клієнтах
  const groupedOrders = useMemo(() => {
    const activeItems = (items || []).filter(i => (parseFloat(i.quantity) || 0) > 0);
    const groups = {};

    activeItems.forEach(it => {
      const orderRef = (it.orderRef || it.order_ref || it.order || "—").toString().trim();
      const client = (it.client || delivery?.client || "Не вказано").toString().trim();
      const manager = (it.manager || delivery?.manager || "").toString().trim();
      const address = (it.address || delivery?.address || "").toString().trim();

      const key = `${client}___${orderRef}`;
      const itemComment = (it.comment || "").toString().trim();

      if (!groups[key]) {
        groups[key] = {
          order_ref: orderRef,
          client,
          manager,
          address,
          comment: itemComment,
          items: []
        };
      } else if (!groups[key].comment && itemComment) {
        groups[key].comment = itemComment;
      }

      const parties = (it.parties || [])
        .map(p => ({
          party: String(p.party),
          warehouse: p.warehouse ? String(p.warehouse) : "",
          moved_q: parseFloat((p.party_quantity !== "" && p.party_quantity !== undefined) ? p.party_quantity : p.moved_q) || 0
        }))
        .filter(p => p.moved_q > 0);

      groups[key].items.push({
        product: String(it.product),
        nomenclature: String(it.nomenclature || it.product),
        quantity: parseFloat(it.quantity) || 0,
        weight: parseFloat(it.weight) || 0,
        line_of_business: it.line_of_business ? String(it.line_of_business) : undefined,
        parties
      });
    });

    return Object.values(groups);
  }, [items, delivery]);

  // Унікальні клієнти, доповнення та провідний менеджер
  const uniqueClients = useMemo(() => {
    return Array.from(new Set(groupedOrders.map(o => o.client).filter(c => c && c !== "Не вказано")));
  }, [groupedOrders]);

  const uniqueOrderRefs = useMemo(() => {
    return Array.from(new Set(groupedOrders.map(o => o.order_ref).filter(r => r && r !== "—")));
  }, [groupedOrders]);

  const leadManager = useMemo(() => {
    for (const o of groupedOrders) {
      if (o.manager) return o.manager;
    }
    return delivery?.manager || "";
  }, [groupedOrders, delivery?.manager]);

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

        // Шукаємо закріпленого бухгалтера для менеджера замовлення
        let preselectedId = "";

        if (leadManager) {
          const mgrRes = await getAccountantForManager(leadManager, initData);
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
  }, [isOpen, leadManager]);

  const currentAccountant = useMemo(() => {
    return accountants.find(a => String(a.id) === String(selectedAccountantId)) || null;
  }, [accountants, selectedAccountantId]);

  // Генерація посилання mailto для відкриття поштової програми (Outlook, Thunderbird тощо)
  const handleOpenMailClient = () => {
    if (!currentAccountant?.email) {
      toast.error("У обраного бухгалтера не вказано Email");
      return;
    }

    const ttn = (delivery?.ttn || "").trim();
    const isNp = Boolean(ttn && ttn !== "Не вказано");
    const date = delivery?.delivery_date || delivery?.date || new Date().toLocaleDateString("uk-UA");

    const clientPart = uniqueClients.length > 0 
      ? uniqueClients.slice(0, 2).join(", ") + (uniqueClients.length > 2 ? ` (+${uniqueClients.length - 2})` : "")
      : (delivery?.client || "");

    const orderPart = uniqueOrderRefs.length > 0
      ? ` [Доп: ${uniqueOrderRefs.slice(0, 2).join(", ")}${uniqueOrderRefs.length > 2 ? "..." : ""}]`
      : "";

    const mgrPart = leadManager ? ` | Менеджер: ${leadManager}` : "";
    const subject = isNp 
      ? `[Нова Пошта] Відомість: ${clientPart}${orderPart} | ТТН ${ttn}${mgrPart}`
      : `[Доставка] Відомість: ${clientPart}${orderPart} | Дата: ${date}${mgrPart}`;

    const typeStr = isNp ? "Нова Пошта" : "Доставка / Самовивіз";
    const ttnLine = isNp ? `- ТТН Нова Пошта: ${ttn}\n` : "";

    const orderBlocks = groupedOrders.map(ord => {
      const mgrLine = ord.manager ? `- Менеджер: ${ord.manager}\n` : "";
      const addrLine = ord.address ? `- Адреса: ${ord.address}\n` : "";
      const commentLine = ord.comment ? `- Примітка заявки: ${ord.comment}\n` : "";

      const itemsLines = ord.items.map(it => {
        const prod = it.nomenclature || it.product || "";
        const qty = it.quantity || 0;
        const pStrs = (it.parties || []).map(p => {
          if (p.warehouse) {
            return `${p.party} — ${p.moved_q} шт (склад: ${p.warehouse})`;
          }
          return `${p.party}: ${p.moved_q} шт`;
        });
        const partyPart = pStrs.length > 0 ? ` [Партії: ${pStrs.join(", ")}]` : "";
        return `  • ${prod} — ${qty} шт${partyPart}`;
      });

      const itemsText = itemsLines.length > 0 ? itemsLines.join("\n") : "  (товари не вказані)";

      return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 Клієнт: ${ord.client}
📄 Доповнення: #${ord.order_ref}
${mgrLine}${addrLine}${commentLine}Товари та складські партії:
${itemsText}`;
    });

    const allOrdersText = orderBlocks.length > 0 ? orderBlocks.join("\n\n") : "(замовлення відсутні)";

    let body = `Доброго дня!\n\nІнформація щодо відвантаження (${typeStr}):\n${ttnLine}- Дата: ${date}\n- Кількість заявок / доповнень: ${groupedOrders.length}\n\n${allOrdersText}\n`;

    if (comment.trim()) {
      body += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nКоментар для бухгалтера: ${comment.trim()}\n`;
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
        orders: groupedOrders,
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
              {uniqueClients.length > 1 ? (
                <>Клієнти: <strong>{uniqueClients.join(", ")}</strong></>
              ) : (
                <>Клієнт: <strong>{uniqueClients[0] || delivery?.client || "Не вказано"}</strong></>
              )}
              {delivery?.ttn && <> · ТТН: <strong>{delivery.ttn}</strong></>}
            </div>
            {uniqueOrderRefs.length > 0 && (
              <div className={css.ordersSummary}>
                <span className={css.ordersSummaryLabel}>Доповнення ({uniqueOrderRefs.length}):</span>
                <div className={css.ordersBadges}>
                  {uniqueOrderRefs.map(ref => (
                    <span key={ref} className={css.orderRefBadge}>#{ref}</span>
                  ))}
                </div>
              </div>
            )}
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
            {/* Блок попереднього перегляду складу відомості */}
            {groupedOrders.length > 0 && (
              <div className={css.ordersPreviewBox}>
                <div className={css.ordersPreviewHeader}>
                  Склад відомості ({groupedOrders.length} {groupedOrders.length === 1 ? "заявка" : "заявки/доповнення"}):
                </div>
                <div className={css.ordersList}>
                  {groupedOrders.map((ord, idx) => (
                    <div key={idx} className={css.orderItemPreview}>
                      <div className={css.orderItemRow}>
                        <span className={css.orderItemClient} title={ord.client}>
                          🏢 {ord.client}
                        </span>
                        <span className={css.orderItemRef}>#{ord.order_ref}</span>
                      </div>
                      <div className={css.orderItemSub}>
                        <span>{ord.items.length} {ord.items.length === 1 ? "товар" : "товари"}</span>
                        {ord.manager && <span>· Менеджер: {ord.manager}</span>}
                      </div>
                      {ord.items.some(i => i.parties && i.parties.length > 0) && (
                        <div style={{ marginTop: "4px", fontSize: "11px", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "2px" }}>
                          {ord.items.map((i, iIdx) => (
                            <div key={iIdx}>
                              <span style={{ color: "#cbd5e1" }}>{i.product}: </span>
                              {i.parties && i.parties.length > 0 ? (
                                i.parties.map((p, pIdx) => (
                                  <span key={pIdx} style={{ marginRight: "6px" }}>
                                    <code>{p.party}</code> ({p.moved_q} шт{p.warehouse ? ` · ${p.warehouse}` : ""})
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontStyle: "italic", color: "#64748b" }}>партія не призначена</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {ord.comment && (
                        <div style={{ fontSize: "11px", color: "#f59e0b", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span>💬</span>
                          <span>{ord.comment}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
