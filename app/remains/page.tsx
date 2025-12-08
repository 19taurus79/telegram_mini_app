"use client";

import { useState, useEffect } from "react";
import { getProductOnWarehouse } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import css from "./Remains.module.css";
import DetailsRemains from "@/components/DetailsRemains/DetailsRemains";
import DetailsOrdersByProduct from "@/components/DetailsOrdersByProduct/DetailsOrdersByProduct";
import DetailsMovedProducts from "@/components/DetailsMovedProduts/DetailsMovedProducts";
import { useInitData } from "@/store/InitData";
import type { InitData } from "@/store/InitData";
import RemainsDashboard from "@/components/Remains/RemainsDashboard/RemainsDashboard";

const DESKTOP_BREAKPOINT = 768;

function Remains() {
  const { selectedGroup, searchValue } = useFilter();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const initData = useInitData((state: InitData) => state.initData);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", selectedGroup, searchValue, initData],
    queryFn: () =>
      getProductOnWarehouse({
        group: selectedGroup || null,
        searchValue: searchValue || null,
        initData: initData || "",
      }),
    enabled: !!initData,
    placeholderData: keepPreviousData,
  });

  const [isMobile, setIsMobile] = useState(false);

  // Check generic mobile state for dashboard layout
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleProductClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    productId: string
  ) => {
    if (window.innerWidth >= DESKTOP_BREAKPOINT) {
      event.preventDefault();
      setSelectedProductId(productId);
    }
  };

  const renderProductList = () => {
    if (isLoading) {
      return <p>Завантаження продуктів...</p>;
    }

    if (isError) {
      return <p>Помилка завантаження: {error.message}</p>;
    }

    if (!data || data.length === 0) {
      return <p>Продуктів не знайдено.</p>;
    }

    // Повертаємо повну структуру з класами, як було раніше
    return (
      <ul>
        {data.map((item) => (
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
    );
  };

  return (
    <RemainsDashboard
      isMobile={isMobile}
      productList={renderProductList()}
      detailsRemains={<DetailsRemains selectedProductId={selectedProductId} />}
      detailsOrders={<DetailsOrdersByProduct selectedProductId={selectedProductId} />}
      detailsMoved={<DetailsMovedProducts selectedProductId={selectedProductId} />}
    />
  );
}

export default Remains;
