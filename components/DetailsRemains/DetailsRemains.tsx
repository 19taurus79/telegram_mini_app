"use client";

import { useEffect, useMemo } from "react";
import css from "./DetailsRemains.module.css";
import { getOrdersTiersByProduct, getRemainsById } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDetailsDataStore } from "@/store/DetailsDataStore";
import { useInitData } from "@/store/InitData";
import RemainsCard from "@/components/Remains/RemainsCard";
import Loader from "@/components/Loader/Loader";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export default function DetailsRemains({
  selectedProductId,
  filterParties,
}: {
  selectedProductId: string | null;
  filterParties?: string[];
}) {

  const formatNumber = (num: number) => {
    const options = {
      maximumFractionDigits: 2,
      minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    };
    return num.toLocaleString("ru-RU", options);
  };

  const initData = useInitData((state) => state.initData);
  const setRemains = useDetailsDataStore((state) => state.setRemains);

  const {
    data: rawRemainsData,
    isError: isRemainsError,
    isFetching: isRemainsFetching,
  } = useQuery({
    queryKey: ["remainsById", selectedProductId, initData],
    queryFn: () =>
      getRemainsById({ productId: selectedProductId!, initData: initData! }),
    enabled: !!selectedProductId && !!initData,
    placeholderData: keepPreviousData,
  });

  const remainsData = useMemo(() => {
    if (!rawRemainsData) return null;
    if (!filterParties || filterParties.length === 0) return rawRemainsData;
    
    return rawRemainsData.filter(item => 
      filterParties.includes(item.nomenclature_series)
    );
  }, [rawRemainsData, filterParties]);

  const { data: ordersTiersData, isFetching: isOrdersTiersFetching } = useQuery({
    queryKey: ["ordersTiersByProduct", selectedProductId, initData],
    queryFn: () =>
      getOrdersTiersByProduct({
        product: selectedProductId!,
        initData: initData!,
      }),
    enabled: !!selectedProductId && !!initData,
    placeholderData: keepPreviousData,
  });

  // Tier 1: затверджено
  const ordersQ       = ordersTiersData?.orders_q                ?? 0;
  // Tier 2: продукція затверджена
  const ordersQProd   = ordersTiersData?.orders_q_product_confirmed ?? 0;
  // Всього
  const totalOrdered  = ordersTiersData?.orders_q_total          ?? 0;

  const totalBuh = remainsData?.reduce((sum, item) => sum + item.buh, 0) || 0;
  const totalSkl = remainsData?.reduce((sum, item) => sum + item.skl, 0) || 0;
  const totalStorage = remainsData?.reduce((sum, item) => sum + item.storage, 0) || 0;

  // Вільний залишок (відносно Tier 1 — затверджено)
  const availableStock = totalBuh - ordersQ;
  // Вільний залишок після врахування обох тирів
  const availableStockFull = totalBuh - totalOrdered;

  const groupedRemains = useMemo(() => {
    if (!remainsData) return {};
    return remainsData.reduce((groups, item) => {
      const warehouse = item.warehouse || "Інше";
      if (!groups[warehouse]) {
        groups[warehouse] = [];
      }
      groups[warehouse].push(item);
      return groups;
    }, {} as Record<string, typeof remainsData>);
  }, [remainsData]);

  useEffect(() => {
    setRemains(remainsData ?? null);
  }, [remainsData, setRemains]);

  if (!selectedProductId) {
    return (
      <div className={css.container}>
        <p>Оберіть товар зі списку, щоб побачити деталі.</p>
      </div>
    );
  }

  if (isRemainsFetching || isOrdersTiersFetching) {
    return <Loader />;
  }

  if (isRemainsError) {
    return (
      <div className={css.container}>
        Для вибраного товару не знайдено даних по залишках.
      </div>
    );
  }

  const productName = remainsData && remainsData.length > 0
    ? `${remainsData[0].nomenclature} ${remainsData[0].party_sign} ${remainsData[0].buying_season}`
    : ` `;

  return (
    <div className={css.container}>
      <div className={css.header}>
        {/* Сховати стандартний заголовок на мобільних */}
        {typeof window !== "undefined" && window.innerWidth >= 768 && (
          <>
            <h3>Деталі по товару: {productName}</h3>
            <br />
            <h4>
              Всього по Бух: {formatNumber(totalBuh)} | Складу: {formatNumber(totalSkl)}
              {totalStorage > 0 && ` | На збереганні: ${formatNumber(totalStorage)}`}
              <br />
              Під заявками: {formatNumber(totalOrdered)} | Вільний залишок: {formatNumber(Math.max(0, availableStock))}
            </h4>
          </>
        )}

        <div className={css.mobileOnly}>
          {/* Bento Tiles Grid */}
          <div className={css.tilesGrid}>
            <div className={css.tile}>
              <span className={css.tileLabel}>Бух</span>
              <span className={css.tileValue}>{formatNumber(totalBuh)}</span>
            </div>
            <div className={css.tile}>
              <span className={css.tileLabel}>Склад</span>
              <span className={css.tileValue}>{formatNumber(totalSkl)}</span>
            </div>
            <div className={css.tile}>
              <span className={css.tileLabel}>Вільний</span>
              <span className={`${css.tileValue} ${availableStock < 0 ? css.deficit : ''}`}>
                {formatNumber(availableStock)}
              </span>
            </div>
            <div className={css.tile}>
              <span className={css.tileLabel}>Затверджено</span>
              <span className={css.tileValue}>{formatNumber(ordersQ)}</span>
            </div>
          </div>

          {/* Надписи-попередження */}
          {totalBuh > totalSkl ? (
            <div className={css.warning}>
              <AlertTriangle size={18} />
              <span>Бух облік більший за складський. Товар в дорозі!</span>
            </div>
          ) : (
            <div className={css.success}>
              <CheckCircle2 size={18} />
              <span>Вся номенклатура на складі.</span>
            </div>
          )}

          {ordersQ > 0 && (
            <div className={totalSkl < ordersQ ? css.warning : css.success}>
              {totalSkl < ordersQ ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span>
                {totalSkl < ordersQ 
                  ? `Нестача для покриття (Затверджено): ${formatNumber(ordersQ - totalSkl)}` 
                  : "Весь затверджений попит покритий залишком."}
              </span>
            </div>
          )}
        </div>
      </div>

      {remainsData && remainsData.length > 0 ? (
        <div className={css.warehouseGroups}>
          {Object.entries(groupedRemains).map(([warehouse, items]) => (
            <div key={warehouse} className={css.warehouseGroup}>
              <h4 className={css.warehouseTitle}>{warehouse}</h4>
              <div className={css.partiesContainer}>
                {items.map((item) => (
                  <RemainsCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>Немає даних по залишках.</p>
      )}
    </div>
  );
}
