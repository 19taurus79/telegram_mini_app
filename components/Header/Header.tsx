"use client";

import Link from "next/link";
import css from "./Header.module.css";
import { useDebouncedCallback } from "use-debounce";
import { useFilter } from "@/context/FilterContext";
import { useRef, useState } from "react";

function Header() {
  const { searchValue, setSearchValue } = useFilter();
  const inputRef = useRef<HTMLInputElement>(null);

  const updateSearchQuery = useDebouncedCallback(
    (value: string) => setSearchValue(value),
    300
  );

  const [menuOpen, setMenuOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSearchQuery(e.target.value);
  };

  const handleClear = () => {
    setSearchValue("");
    updateSearchQuery(""); // для синхронизации
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleNavClick = () => {
    setMenuOpen(false);
  };

  return (
    <header className={css.header}>
      <h2 className={css.logo}>Ерідон Харків</h2>

      <button
        className={css.navToggle}
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      <div className={css.searchWrapper}>
        <input
          ref={inputRef}
          type="text"
          className={css.searchInput}
          placeholder="Пошук..."
          onChange={handleInputChange}
        />
        {searchValue && (
          <button
            className={css.clearBtn}
            onClick={handleClear}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <nav className={`${css.nav} ${menuOpen ? css.navOpen : ""}`}>
        <ul className={css.navList}>
          <li>
            <Link href="/" onClick={handleNavClick}>
              Головна
            </Link>
          </li>
          <li>
            <Link href="/remains" onClick={handleNavClick}>
              Залишки
            </Link>
          </li>
          <li>
            <Link href="/orders" onClick={handleNavClick}>
              Заявки
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
