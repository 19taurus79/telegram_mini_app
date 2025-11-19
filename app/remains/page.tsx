"use client";

import { getProductOnWarehouse } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import css from "./Remains.module.css";
import { getInitData } from "@/lib/getInitData";
import DetailsRemains from "@/components/DetailsRemains/DetailsRemains";
import { useState } from "react";
import DetailsOrdersByProduct from "@/components/DetailsOrdersByProduct/DetailsOrdersByProduct";
import DetailsMovedProducts from "@/components/DetailsMovedProduts/DetailsMovedProducts";

function Remains() {
  const { selectedGroup, searchValue } = useFilter();
  // Правильное использование useState с деструктуризацией массива и типизацией
  const [selectedProductId, setSelectedProductId] = useState<string>(
    ""
  );
  const initData = getInitData();

  const { data } = useQuery({
    queryKey: ["products", selectedGroup, searchValue],
    queryFn: () =>
      getProductOnWarehouse({
        group: selectedGroup,
        searchValue: searchValue,
        initData,
      }),
    placeholderData: keepPreviousData,
  });

  const handleProductClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    productId: string
  ) => {
    // Проверяем ширину экрана в браузере
    if (window.innerWidth >= 768) {
      // 768px - условная граница десктопа
      // Если экран широкий (десктоп):
      // 1. Отменяем стандартное поведение ссылки (переход на другую страницу)
      event.preventDefault();
      // 2. Обновляем состояние, чтобы правая панель обновилась
      setSelectedProductId(productId);
    }
    // Если экран узкий (мобильный), мы ничего не делаем.
    // Link сработает как обычная ссылка и перейдет на страницу /remains/[id].
  };

  return (
    <div className={css.wrapper}>
      <ul className={css.listContainer}>
        {data?.map((item) => (
          <li className={css.listItemButton} key={item.id}>
            <Link
              href={`/remains/${item.id}`}
              className={css.link}
              onClick={(e) => handleProductClick(e, item.id)}
            >
              {item.product}
            </Link>
          </li>
        ))}
      </ul>
      <DetailsRemains selectedProductId={selectedProductId} />
        <DetailsOrdersByProduct selectedProductId={selectedProductId} />
        <DetailsMovedProducts selectedProductId={selectedProductId}/>
    </div>
  );
}

export default Remains;
