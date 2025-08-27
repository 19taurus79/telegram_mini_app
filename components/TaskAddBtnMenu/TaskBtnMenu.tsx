"use client";
// import { useState } from "react";
import TaskForm from "../TaskAddForms/TaskAddsForms";
import css from "./TaskMenu.module.css";
import { useFormStore, useMenuStore } from "@/store/FormAndMenuTogls";
export default function TaskAddBtnMenu() {
  // const [taskForm, setForm] = useState("");
  // const [isOpenMenu, setIsOpenMenu] = useState(true);
  const { menuIsOpen, toggleMenu, setFormType } = useMenuStore();
  const { toggleForm, formIsOpen } = useFormStore();
  const handleOpenMenu = (form: string) => {
    setFormType(form);
    toggleMenu();
    toggleForm();
  };
  console.log("menuIsOpen", menuIsOpen);
  console.log("formIsOpen", formIsOpen);
  return (
    <>
      {menuIsOpen && (
        <ul className={css.buttonList}>
          <li>
            <button onClick={() => handleOpenMenu("NP")}>
              Замовити товар новою поштою
            </button>
          </li>
          <li>
            <button>Замовити товар по домові</button>
          </li>
          <li>
            <button>Оформити самовивіз</button>
          </li>
          <li>
            <button>Довільна форма</button>
          </li>
          {/* <li>5</li> */}
        </ul>
      )}
      {formIsOpen && <TaskForm />}
    </>
  );
}
