"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import styles from "./Modal.module.css";

type Props = {
  children: React.ReactNode;
  onClose?: () => void;
};

const Modal = ({ children, onClose }: Props) => {
  const router = useRouter();

  const close = () => {
      if (onClose) {
          onClose();
      } else {
          router.back();
      }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "auto"; // Or ""
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, router]); // eslint-disable-next-line react-hooks/exhaustive-deps

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
