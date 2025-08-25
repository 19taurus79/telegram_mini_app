"use client";
import { useState } from "react";
import ModalTaskEvent from "../ModalForTaskEvents/Modal";
import css from "./TaskAddBtn.module.css";
import TaskAddBtnMenu from "../TaskAddBtnMenu/TaskBtnMenu";
export default function TaskAddBtn() {
  const [isModalOpen, setModalOpen] = useState(false);
  return (
    <>
      <button className={css.button} onClick={() => setModalOpen(true)}>
        +
      </button>
      <ModalTaskEvent isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <TaskAddBtnMenu />
      </ModalTaskEvent>
    </>
  );
}
