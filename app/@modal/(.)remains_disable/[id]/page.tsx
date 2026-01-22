"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Modal from "@/components/Modal/Modal";
import { getRemainsById } from "@/lib/api";

type Props = {
  params: Promise<{ id: string }>;
};

export default function FilteredRemains({ params }: Props) {
  const [id, setId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const { data: remains, isLoading } = useQuery({
    queryKey: ["remains", id],
    queryFn: () => getRemainsById(id!),
    enabled: !!id,
  });

  if (!id || isLoading) {
    return <Modal><div>Завантаження...</div></Modal>;
  }

  if (!remains || remains.length === 0) {
    return <Modal><div>Дані не знайдено</div></Modal>;
  }

  return (
    <Modal>
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
    </Modal>
  );
}
