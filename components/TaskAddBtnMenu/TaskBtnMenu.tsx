"use client";
import { useState } from "react";
import TaskForm from "../TaskAddForms/TaskAddsForms";
import css from "./TaskMenu.module.css";
export default function TaskAddBtnMenu() {
  const [taskForm, setForm] = useState("");
  const [isOpenMenu, setIsOpenMenu] = useState(true);
  const handleOpenMenu = (form: string) => {
    setForm(form);
    setIsOpenMenu(!isOpenMenu);
  };
  return (
    <>
      {isOpenMenu && (
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
      <TaskForm form_id={taskForm} />
    </>
  );
}
