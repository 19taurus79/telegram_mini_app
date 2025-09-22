"use client";

import { usePathname } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { useFilter } from "@/context/FilterContext";
import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { getUserByinitData } from "@/lib/api";
import { User } from "@/types/types";
import css from "./Header.module.css";
import Link from "next/link";

function Header() {
  const { searchValue, setSearchValue } = useFilter();
  const inputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname(); // Get the current path

  useLayoutEffect(() => {
    if (headerRef.current) {
      const height = headerRef.current.offsetHeight;
      document.documentElement.style.setProperty(
        "--header-height",
        `${height}px`
      );
    }
  }, [pathname]); // Rerun when path changes

  const updateSearchQuery = useDebouncedCallback(
    (value: string) => setSearchValue(value),
    300
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);

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
  //TODO: get initData from Telegram WebApp
  const [initData, setInitData] = useState<string | null>(null);

  useEffect(() => {
    const isDev = process.env.NEXT_PUBLIC_DEV === "true";
    if (isDev) {
      setInitData(
        "user=%7B%22id%22%3A548019148%2C%22first_name%22%3A%22%D0%A1%D0%B5%D1%80%D0%B3%D0%B5%D0%B9%22%2C%22last_name%22%3A%22%D0%9E%D0%BD%D0%B8%D1%89%D0%B5%D0%BD%D0%BA%D0%BE%22%2C%22username%22%3A%22OnyshchenkoSergey%22%2C%22language_code%22%3A%22uk%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2Fqf0qiya3lYZumE5ExiC55ONcmy-5vzP6pZzzBMV92vw.svg%22%7D&chat_instance=2337466967032439365&chat_type=private&auth_date=1756120426&signature=mdGQ7UJyhhHYjP3-AsE5tn6HFTGP2LGh1Y_DRkgQTZAkmAHy-pYlqcRtJXHxUrK15v0-Y6sp3ktT2rMwszthDA&hash=b2e3a2aa200dd954538a7d65de4dafeab9f4967ca7381bd2d8a746d4d28ad0a9"
      );
    } else if (
      typeof window !== "undefined" &&
      window.Telegram?.WebApp?.initData
    ) {
      setInitData(window.Telegram.WebApp.initData);
    } else {
      setInitData("");
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (initData) {
        const user = await getUserByinitData(initData);
        setUserData(user);
      }
    };
    fetchUser();
  }, [initData]);
  console.log("initData", initData);
  console.log("userData", userData);
  const handleNavClick = () => {
    setMenuOpen(false);
  };

  return (
    <header className={css.header} ref={headerRef}>
      <h2 className={css.logo}>Ерідон Харків</h2>

      <button
        className={css.navToggle}
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      {pathname !== "/" && (
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
      )}

      <nav className={`${css.nav} ${menuOpen ? css.navOpen : ""}`}>
        <ul className={css.navList}>
          <li>
            <Link href="/" onClick={handleNavClick}>
              Головна
            </Link>
          </li>
          <li>
            <Link href="/remains" onClick={handleNavClick}>
              Залишки на нашому складі
            </Link>
          </li>
          <li>
            <Link href="/av_stock" onClick={handleNavClick}>
              Залишки на інших складах
            </Link>
          </li>
          <li>
            <Link href="/orders" onClick={handleNavClick}>
              Заявки
            </Link>
          </li>
          <li>
            <Link href="/delivery" onClick={handleNavClick}>
              Доставка
            </Link>
          </li>

          <li>
            <Link href="/events" onClick={handleNavClick}>
              Події
            </Link>
          </li>
          {userData?.is_admin && (
            <>
              <li>
                <Link href="/tasks" onClick={handleNavClick}>
                  Задачи
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}

export default Header;
