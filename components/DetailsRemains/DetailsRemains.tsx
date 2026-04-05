"use client";

import { useEffect, useMemo } from "react";
import css from "./DetailsRemains.module.css";
import { getOrdersTiersByProduct, getRemainsById } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDetailsDataStore } from "@/store/DetailsDataStore";
import { useInitData } from "@/store/InitData";
import RemainsCard from "@/components/Remains/RemainsCard";

import Loader from "@/components/Loader/Loader";

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

  const totalStorage =
    remainsData?.reduce((sum, item) => sum + item.storage, 0) || 0;

  // Вільний залишок (відносно Tier 1 — затверджено)
  const availableStock = totalBuh - ordersQ;
  // Вільний залишок після врахування обох тирів
  const availableStockFull = totalBuh - totalOrdered;



  // Групуємо залишки по складах

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



  // Записуємо дані в стор при їх оновленні

  useEffect(() => {

    setRemains(remainsData ?? null);

  }, [remainsData, setRemains]);



  // УМОВНІ RETURN ПІСЛЯ ВСІХ ХУКІВ

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



  return (

    <div className={css.container}>

      <div className={css.header}>

        <h3>

          Деталі по товару:{" "}

          {remainsData && remainsData.length > 0

            ? `${remainsData[0].nomenclature} ${remainsData[0].party_sign} ${remainsData[0].buying_season}`

            : ` `}

        </h3>

        <br />

        <h4>

          Всього по Бух: {formatNumber(totalBuh)} | Складу:{" "}

          {formatNumber(totalSkl)} |{" "}

          {totalStorage > 0 &&

            `На збереганні: ${formatNumber(totalStorage)} |`}{" "}

          Під заявками:{" "}
          <span title="Статус: затверджено" style={{ color: 'var(--color-success, #10b981)', fontWeight: 600 }}>
            {formatNumber(ordersQ)}
          </span>
          {ordersQProd > 0 && (
            <>
              {" "}+{" "}
              <span title="Статус: продукція затверджена" style={{ color: 'var(--color-warning, #f59e0b)', fontWeight: 600 }}>
                {formatNumber(ordersQProd)}
              </span>
            </>
          )}
          {" "}={" "}{formatNumber(totalOrdered)}
          {" "}| Вільний залишок:{" "}
          {formatNumber(Math.max(0, availableStock))}

          {availableStock < 0 && (

            <span className={css.deficit}>

              {" "}

              | Нестача (затверджено): {formatNumber(-availableStock)}

            </span>

          )}
          {availableStock >= 0 && availableStockFull < 0 && (
            <span className={css.deficit}>
              {" "}| Нестача (з прод. затв.): {formatNumber(-availableStockFull)}
            </span>
          )}

        </h4>



        <div className={css.mobileOnly}>

          {/* Надписи-попередження */}

          {totalBuh > totalSkl ? (

            <p className={css.warning}>

              ⚠️ Увага! Бух облік більший за складський облік! Схоже що{" "}

              {formatNumber(totalBuh - totalSkl)} ще десь в дорозі!

            </p>

          ) : (

            <p className={css.success}>

              ✓ Все в порядку! Вся номенклатура на складі!

            </p>

          )}



          {totalOrdered === 0 ? (

            <p className={css.info}>

              ℹ️ Немає жодної заявки на цю номенклатуру, тому весь залишок

              вільний

            </p>

          ) : (

            <>

              {totalOrdered > totalBuh ? (

                <p className={css.warning}>

                  ⚠️ Нестача для &quot;затверджено&quot;:{" "}
                  {formatNumber(Math.max(0, ordersQ - totalBuh))}
                  {ordersQProd > 0 && ` (+ прод. затв.: ${formatNumber(ordersQProd)})`}

                </p>

              ) : availableStockFull < 0 ? (

                <p className={css.warning}>

                  ✓ «Затверджено» покрито, але для «продукція затверджена» не вистачає{" "}
                  {formatNumber(-availableStockFull)}

                </p>

              ) : (

                <p className={css.success}>

                  ✓ Все в порядку! Залишок покриває всі заявки (обидва рівні)!

                </p>

              )}



              {availableStock > 0 ? (

                <p className={css.success}>

                  ✓ Вільного залишку: {formatNumber(availableStock)}

                </p>

              ) : (

                <p className={css.warning}>

                  ⚠️ Вільного залишку немає, всі залишки під заявки!

                </p>

              )}

            </>

          )}

        </div>

      </div>



      {remainsData && remainsData.length > 0 ? (

        <>

          {/* Групування по складах */}

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

        </>

      ) : (

        <p>Немає даних по залишках.</p>

      )}

    </div>

  );

}
