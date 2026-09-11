import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, ArrowRight } from "lucide-react";
import css from "./SendAccountantConfirmModal.module.css";

export default function SendAccountantConfirmModal({
  isOpen,
  ttn,
  clientName,
  deliveriesCount = 1,
  onConfirm,
  onCancel,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  const isMultiple = deliveriesCount > 1;

  return createPortal(
    <div
      className={css.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className={css.modal}>
        <div className={css.header}>
          <div>
            <span className={css.badge}>📦 Нова Пошта</span>
            <h3 className={css.title}>
              {isMultiple
                ? `ТТН успішно збережено (${deliveriesCount} дост.)`
                : "ТТН успішно збережено"}
            </h3>
          </div>
          <button className={css.closeBtn} onClick={onCancel} title="Закрити">
            <X size={18} />
          </button>
        </div>

        <div className={css.body}>
          <div className={css.ttnCard}>
            <div>
              <div className={css.ttnLabel}>
                {isMultiple ? "ТТН Нової Пошти:" : "Номер декларації (ТТН):"}
              </div>
              <div className={css.ttnValue}>{ttn || "—"}</div>
            </div>
            {clientName && (
              <div style={{ textAlign: "right" }}>
                <div className={css.ttnLabel}>
                  {isMultiple ? "Клієнти:" : "Клієнт:"}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>{clientName}</div>
              </div>
            )}
          </div>

          <div className={css.question}>
            {isMultiple
              ? `Відправити зведені дані по цих ${deliveriesCount} доставках бухгалтеру?`
              : "Відправити дані по цій доставці бухгалтеру?"}
          </div>

          <div className={css.hint}>
            {isMultiple ? (
              <>При натисканні <strong>«Так»</strong> відкриється форма комплектації з усіма товарами цих доставок, де ви зможете обрати складські партії та надіслати загальну відомість на пошту або в Telegram бухгалтеру.</>
            ) : (
              <>При натисканні <strong>«Так»</strong> відкриється форма доставки, де ви зможете обрати складську партію та надіслати готову відомість на пошту або в Telegram бухгалтеру.</>
            )}
          </div>
        </div>

        <div className={css.actions}>
          <button type="button" className={css.cancelBtn} onClick={onCancel}>
            Ні, завершити
          </button>
          <button type="button" className={css.confirmBtn} onClick={onConfirm}>
            <span>{isMultiple ? "Так, перейти до відомості" : "Так, обрати партію"}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
