"use client";

// import { useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getMovedDataByProduct } from "@/lib/api";
import css from "./DetailsMovedProducts.module.css";

export default function DetailsMovedProducts({
  selectedProductId,
}: {
  selectedProductId: string | null;
}) {
  // const [sortDirection, setSortDirection] = useState<
  //   "ascending" | "descending" | null
  // >(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["movedProducts", selectedProductId],
    queryFn: () => getMovedDataByProduct(selectedProductId!),
    enabled: !!selectedProductId,
    placeholderData: keepPreviousData,
  });

  // const sortedData = useMemo(() => {
  //   if (!data) return [];
  //   if (sortDirection === null) return data;
  //
  //   return [...data].sort((a, b) => {
  //     const dateA = new Date(a.date).getTime();
  //     const dateB = new Date(b.date).getTime();
  //     if (dateA < dateB) {
  //       return sortDirection === "ascending" ? -1 : 1;
  //     }
  //     if (dateA > dateB) {
  //       return sortDirection === "ascending" ? 1 : -1;
  //     }
  //     return 0;
  //   });
  // }, [data, sortDirection]);

  // const handleSort = () => {
  //   if (sortDirection === null) {
  //     setSortDirection("ascending");
  //   } else if (sortDirection === "ascending") {
  //     setSortDirection("descending");
  //   } else {
  //     setSortDirection(null);
  //   }
  // };

  if (!selectedProductId) {
    return (
      <div className={css.container}>
        {/* Пустий блок, коли товар не вибрано */}
      </div>
    );
  }

  if (isLoading) {
    return <div className={css.container}>Завантаження переміщень...</div>;
  }

  if (isError) {
    return <div className={css.container}>Помилка: {error.message}</div>;
  }

  return (
    <div className={css.container}>
      <h3>Переміщення по товару:</h3>
      {data && data.length > 0 ? (
        <table className={css.table}>
          <thead>
            <tr>
              <th>Доповнення</th>
              <th>Клієнт</th>
              <th>Менеджер</th>
              <th>Партія</th>
              {/*<th onClick={handleSort} className={css.sortableHeader}>*/}
              {/*  Дата{" "}*/}
              {/*  {sortDirection === "ascending"*/}
              {/*    ? "↑"*/}
              {/*    : sortDirection === "descending"*/}
              {/*    ? "↓"*/}
              {/*    : ""}*/}
              {/*</th>*/}
              <th>Кількість</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                <td>{item.contract}</td>
                <td>{item.client}</td>
                <td>{item.manager}</td>
                <td>{item.party_sign_y}</td>
                {/*<td>{new Date(item.date).toLocaleDateString()}</td>*/}
                <td>{item.qt_moved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>По цьому товару немає переміщень.</p>
      )}
    </div>
  );
}
