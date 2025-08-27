"use client";
// import { useState } from "react";
import ModalTaskEvent from "../ModalForTaskEvents/Modal";
import css from "./TaskAddBtn.module.css";
import TaskAddBtnMenu from "../TaskAddBtnMenu/TaskBtnMenu";
import { useEventsModalStore } from "@/store/FormAndMenuTogls";
export default function TaskAddBtn() {
  // const [isModalOpen, setModalOpen] = useState(false);
  const { isOpen, closeModal, openModal } = useEventsModalStore();
  return (
    <>
      <button className={css.button} onClick={() => openModal()}>
        +
      </button>
      <ModalTaskEvent isOpen={isOpen} onClose={() => closeModal()}>
        <TaskAddBtnMenu />
      </ModalTaskEvent>
    </>
  );
}
