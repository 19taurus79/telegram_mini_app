"use client";

import { useState } from "react";
import { Remains } from "@/types/types";
import css from "./RemainsCard.module.css";
import { ChevronDown } from "lucide-react"; // Make sure to install lucide-react or use another icon

export default function RemainsCard({ item }: { item: Remains }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  // Список полей для деталей
  // Можно настроить отображение полей в зависимости от line_of_business (як в оригіналі)
  const isSeed = ["Насіння", "Власне виробництво насіння"].includes(item.line_of_business);

  return (
    <div className={`${css.card} ${isOpen ? css.expanded : ""}`} onClick={toggleOpen}>
      <div className={css.header}>
        <div className={css.partyInfo}>
          <div className={css.partyName}>{item.nomenclature_series}</div>
          <div className={css.counts}>
            <div className={css.countItem}>
              <span className={css.label}>Бух</span>
              <span className={css.value}>{item.buh}</span>
            </div>
            <div className={css.countItem}>
                <span className={css.label}>/</span>
            </div>
            <div className={css.countItem}>
              <span className={css.label}>Скл</span>
              <span className={css.value}>{item.skl}</span>
            </div>
             {item.storage > 0 && (
                <>
                <div className={css.countItem}>
                    <span className={css.label}>/</span>
                </div>
                <div className={css.countItem}>
                    <span className={css.label}>Збер</span>
                    <span className={css.value}>{item.storage}</span>
                </div>
                </>
             )}
          </div>
        </div>
        <ChevronDown 
            size={20} 
            className={css.expandIcon} 
        />
      </div>

      <div className={`${css.detailsWrapper} ${isOpen ? css.open : ""}`}>
        <div className={css.detailsContent}>
            <div className={css.details}>
                {/* Завжди показуємо партію, хоча вона і e назві, але тут детальніше */}
                <div className={css.detailRow}>
                    <span className={css.detailLabel}>Партія</span>
                    <span>{item.nomenclature_series}</span>
                </div>
                
                {isSeed && (
                    <>
                         <div className={css.detailRow}>
                            <span className={css.detailLabel}>МТН</span>
                            <span>{item.mtn}</span>
                        </div>
                        <div className={css.detailRow}>
                            <span className={css.detailLabel}>Схожість</span>
                            <span>{item.germination}</span>
                        </div>
                        <div className={css.detailRow}>
                            <span className={css.detailLabel}>Країна</span>
                            <span>{item.origin_country}</span>
                        </div>
                         <div className={css.detailRow}>
                            <span className={css.detailLabel}>Рік врожаю</span>
                            <span>{item.crop_year}</span>
                        </div>
                         <div className={css.detailRow}>
                            <span className={css.detailLabel}>Вага (од)</span>
                            <span>{item.weight}</span>
                        </div>
                    </>
                )}
                
                {!isSeed && (
                    <>
                        <div className={css.detailRow}>
                            <span className={css.detailLabel}>Активна речовина</span>
                            <span>{item.active_substance || '-'}</span>
                        </div>
                        <div className={css.detailRow}>
                            <span className={css.detailLabel}>Сертифікат</span>
                            <span>{item.certificate || '-'}</span>
                        </div>
                        {item.certificate_start_date && (
                            <div className={css.detailRow}>
                                <span className={css.detailLabel}>Дата початку</span>
                                <span>{item.certificate_start_date}</span>
                            </div>
                        )}
                        {item.certificate_end_date && (
                            <div className={css.detailRow}>
                                <span className={css.detailLabel}>Дата закінчення</span>
                                <span>{item.certificate_end_date}</span>
                            </div>
                        )}
                        <div className={css.detailRow}>
                            <span className={css.detailLabel}>К-сть на палеті</span>
                            <span>{item.quantity_per_pallet || '-'}</span>
                        </div>
                        <div className={css.detailRow}>
                            <span className={css.detailLabel}>Вага (од)</span>
                            <span>{item.weight || '-'}</span>
                        </div>
                    </>
                )}
                 {/* Інші поля, якщо потрібно */}
                 {/* <div className={css.detailRow}>
                    <span className={css.detailLabel}>ID</span>
                    <span style={{fontSize: '0.7em', wordBreak: 'break-all'}}>{item.id}</span>
                </div> */}
            </div>
        </div>
      </div>
    </div>
  );
}
