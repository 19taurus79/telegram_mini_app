"use client";

import { useState } from "react";
import styles from "./SideBar.module.css";
import { SlidersHorizontal, X } from "lucide-react";

type Props = {
  children: React.ReactNode;
  sidebar: React.ReactNode;
};

export default function SectionLayout({ children, sidebar }: Props) {
  const [visible, setVisible] = useState(false);

  const handleSidebarClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.tagName === "A" ||
      target.closest("li")
    ) {
      setVisible(false);
    }
  };

  return (
    <section className={styles.sectionLayout}>
      <div className={styles.content}>{children}</div>

      <button
        className={styles.toggleBtn}
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Close sidebar" : "Open sidebar"}
      >
        {visible ? <X size={20} /> : <SlidersHorizontal size={20} />}
      </button>

      <aside
        className={`${styles.sidebar} ${!visible ? styles.sidebarHidden : ""}`}
        onClick={handleSidebarClick}
      >
        {sidebar}
      </aside>
    </section>
  );
}
