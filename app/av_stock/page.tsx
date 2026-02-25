"use client";

import { useState } from "react";
import { getAllProduct } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useInitData } from "@/store/InitData";
import type { InitData } from "@/store/InitData";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import { Search, X } from "lucide-react";
import css from "./AvStock.module.css";

function AvStock() {
  const { selectedGroup } = useFilter();
  const [searchValue, setSearchValue] = useState("");
  const initData = useInitData((state: InitData) => state.initData);

  const { data } = useQuery({
    queryKey: ["products", selectedGroup, searchValue, initData],
    queryFn: () =>
      getAllProduct({
        group: selectedGroup,
        searchValue: searchValue,
        initData: initData ?? "",
      }),
    placeholderData: keepPreviousData,
    enabled: !!initData,
  });

  return (
    <div>
      {/* Вбудований пошук */}
      <div className={css.searchWrapper}>
        <input
          type="text"
          placeholder="Пошук товару..."
          className={css.searchInput}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        {searchValue ? (
          <button
            className={css.clearBtn}
            onClick={() => setSearchValue("")}
            aria-label="Очистити пошук"
          >
            <X size={16} />
          </button>
        ) : (
          <Search size={16} className={css.searchIcon} />
        )}
      </div>

      <ul className={css.listContainer}>
        {data?.map((item) => (
          <li key={item.id}>
            <Link href={`/av_stock/${item.id}`} className={`${css.listItemButton} ${css.link}`}>
              {item.product}
            </Link>
          </li>
        ))}
        {data?.length === 0 && (
          <li style={{ padding: "10px", opacity: 0.6 }}>Товарів не знайдено</li>
        )}
      </ul>
    </div>
  );
}

export default AvStock;
