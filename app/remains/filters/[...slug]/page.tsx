"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getRemainsById } from "@/lib/api";

type Props = {
  params: Promise<{ slug: string[] }>;
};

export default function FilteredRemains({ params }: Props) {
  const [productId, setProductId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then((p) => setProductId(p.slug[0]));
  }, [params]);

  const { data: remains, isLoading } = useQuery({
    queryKey: ["remains", productId],
    queryFn: () => getRemainsById(productId!),
    enabled: !!productId,
  });

  if (!productId || isLoading) {
    return <div>Завантаження...</div>;
  }

  if (!remains || remains.length === 0) {
    return <div>Дані не знайдено</div>;
  }

  return (
    <ul>
      {remains.map((item) => (
        <li key={item.id}>
          <p>Номенклатура: {item.nomenclature}</p>
          <p>Партия: {item.nomenclature_series}</p>
          <p>Бух: {item.buh}</p>
          <p>Склад: {item.skl}</p>
          <br />
        </li>
      ))}
    </ul>
  );
}
