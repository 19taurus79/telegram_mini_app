"use client";

import css from "./DetailsRemains.module.css";
import { getInitData } from "@/lib/getInitData";
import { getRemainsById } from "@/lib/api";
import {keepPreviousData, useQuery} from "@tanstack/react-query";

export default function DetailsRemains({
  selectedProductId,
}: {
  selectedProductId: string | null;
}) {
  const initData = getInitData();

  const { data, isLoading, isError, error } = useQuery({
    // Ключ запиту тепер залежить від ID продукту, що забезпечує кешування та автоматичне оновлення.
    queryKey: ["remainsById", selectedProductId],
    // Функція запиту
    queryFn: () => getRemainsById({ productId: selectedProductId!, initData }),
    // Дуже важлива опція: запит буде виконано тільки якщо selectedProductId не є null або порожнім рядком.
    enabled: !!selectedProductId,
      placeholderData: keepPreviousData,
  });

  if (!selectedProductId) {
    return (
      <div className={css.container}>
        <p>Оберіть товар зі списку, щоб побачити деталі.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className={css.container}>Завантаження деталей...</div>;
  }

  if (isError) {
    return <div className={css.container}>Помилка: {error.message}</div>;
  }
    const totalBuh = data?.reduce((sum, item) => sum + item.buh, 0);
    const totalSkl = data?.reduce((sum, item) => sum + item.skl, 0);
  return (
    // <div className={css.container}>
    //   <h3>Деталі по товару:</h3>
    //   {data && data.length > 0 ? (
    //     <ul>
    //       {data.map((item, index) => (
    //         <li key={index}>
    //           Партія: {item.nomenclature_series}: <strong>Бух: {item.buh}   Склад: {item.skl}</strong>
    //         </li>
    //       ))}
    //     </ul>
    //   ) : (
    //     <p>Немає даних по залишках.</p>
    //   )}
    // </div>
    <div className={css.container}>
        <div className={css.header}>
        <h3>Деталі по товару: {data && data.length>0 ? `${data[0].nomenclature} ${data[0].party_sign} ${data[0].buying_season}`:" "}</h3>
        <br/>
            <h4>Всього по Бух : {totalBuh}  Складу : {totalSkl}</h4>
        </div>
        {data && data.length > 0 ? (
            <table className={css.table}>
                <thead>
                    <tr>
                        <th>Партія</th>
                        <th>Бух</th>
                        <th>Склад</th>
                    </tr>
                </thead>
                {data.map((item, index) => (
                    <tr key={index}>
                        <td>
                            <details className={css.details}>
                                <summary className={css.summary}>{item.nomenclature_series}</summary>
                                <div className={css.detailsContent}>
                                    <p><strong>Батьківський елемент:</strong> {item.parent_element}</p>
                                    <p><strong>Країна походження:</strong> {item.origin_country}</p>
                                    <p><strong>Рік врожаю:</strong> {item.crop_year}</p>
                                    <p><strong>Схожість:</strong> {item.germination}</p>
                                    <p><strong>МТН:</strong> {item.mtn}</p>
                                    <p><strong>Вага мішку:</strong> {item.weight}</p>
                                </div>
                            </details>
                        </td>
                        <td>{item.buh}</td>
                        <td>{item.skl}</td>
                    </tr>

                ))}
            </table>
        ) : (
            <p>Немає даних по залишках.</p>
        )}
    </div>
  );
}