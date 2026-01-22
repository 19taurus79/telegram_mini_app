"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import BackBtn from "@/components/BackBtn/BackBtn";
import css from "./AvRemainsList.module.css";
import { getAvRemainsById } from "@/lib/api";

type Props = {
  params: Promise<{ id: string }>;
};

export default function AvStockPage({ params }: Props) {
  const [id, setId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const { data: remains, isLoading, isError } = useQuery({
    queryKey: ["avRemains", id],
    queryFn: () => getAvRemainsById(id!),
    enabled: !!id,
  });

  if (!id || isLoading) {
    return <div className={css.container}>Завантаження...</div>;
  }

  if (isError || !remains || remains.length === 0) {
    return <div className={css.container}>Помилка завантаження даних</div>;
  }

  return (
    <>
      <div className={css.container}>
        <h2 className={css.heading}>{remains[0].nomenclature} вільно по РУ</h2>
        <ul className={css.table}>
          {remains.map((item) => (
            <li key={item.id} className={css.row}>
              <span className={css.cell_division}>{item.division}</span>
              <span className={css.cell_available}>{item.available}</span>
            </li>
          ))}
        </ul>
      </div>
      <BackBtn />
    </>
  );
}
