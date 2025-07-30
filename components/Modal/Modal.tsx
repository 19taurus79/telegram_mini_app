"use client";

import { useRouter } from "next/navigation";
import React from "react";
import styles from "./Modal.module.css";

type Props = {
  children: React.ReactNode;
};

const Modal = ({ children }: Props) => {
  const router = useRouter();

  const close = () => router.back();

  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      close();
    }
  };

  return (
    <div
      onClick={onBackdropClick}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modalContent}>
        {children}
        <button
          onClick={close}
          className={styles.closeButton}
          aria-label="Close modal"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Modal;
