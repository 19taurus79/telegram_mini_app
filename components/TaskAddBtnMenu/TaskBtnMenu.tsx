"use client";
import React from "react";
import {
  Package,
  Truck,
  Handshake,
  ArrowLeftRight,
  Car,
  FileText,
} from "lucide-react";
import TaskForm from "../TaskAddForms/TaskAddsForms";
import css from "./TaskMenu.module.css";
import {
  useFormStore,
  useMenuStore,
  TaskFormType,
} from "@/store/FormAndMenuTogls";

interface TaskMenuCard {
  type: TaskFormType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export default function TaskAddBtnMenu() {
  const { menuIsOpen, toggleMenu, setFormType } = useMenuStore();
  const { toggleForm, formIsOpen } = useFormStore();

  const handleOpenMenu = (form: TaskFormType) => {
    setFormType(form);
    toggleMenu();
    toggleForm();
  };

  const cards: TaskMenuCard[] = [
    {
      type: "NP",
      title: "Нова Пошта",
      subtitle: "Відправка замовлення через відділення або поштомат",
      icon: <Package size={22} className={css.cardIcon} />,
    },
    {
      type: "EXW",
      title: "Самовивіз (EXW)",
      subtitle: "Самовивіз товару транспортом покупця зі складу",
      icon: <Truck size={22} className={css.cardIcon} />,
    },
    {
      type: "PD",
      title: "По домовленості",
      subtitle: "Замовлення товару, якщо немає вільних залишків",
      icon: <Handshake size={22} className={css.cardIcon} />,
    },
    {
      type: "TR",
      title: "Переміщення",
      subtitle: "Внутрішнє переміщення між складами підрозділів",
      icon: <ArrowLeftRight size={22} className={css.cardIcon} />,
    },
    {
      type: "DL",
      title: "Автодоставка",
      subtitle: "Доставка автотранспортом на адресу клієнта",
      icon: <Car size={22} className={css.cardIcon} />,
    },
    {
      type: "FREE",
      title: "Довільна форма",
      subtitle: "Будь-яке інше завдання чи доручення логісту",
      icon: <FileText size={22} className={css.cardIcon} />,
    },
  ];

  return (
    <>
      {menuIsOpen && (
        <div className={css.menuContainer}>
          <div className={css.menuHeader}>
            <h3 className={css.menuTitle}>Оберіть тип завдання для логіста</h3>
            <p className={css.menuDescription}>
              Оберіть відповідний сценарій для заповнення логістичних даних
            </p>
          </div>
          <div className={css.bentoGrid}>
            {cards.map((card) => (
              <button
                key={card.type}
                type="button"
                className={css.bentoCard}
                onClick={() => handleOpenMenu(card.type)}
              >
                <div className={css.cardHeader}>
                  <div className={css.iconWrapper}>{card.icon}</div>
                  <span className={css.cardArrow}>→</span>
                </div>
                <div className={css.cardBody}>
                  <span className={css.cardTitle}>{card.title}</span>
                  <span className={css.cardSubtitle}>{card.subtitle}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {formIsOpen && <TaskForm />}
    </>
  );
}