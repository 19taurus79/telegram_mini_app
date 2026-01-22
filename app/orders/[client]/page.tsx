"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import BackBtn from "@/components/BackBtn/BackBtn";
import { getContracts } from "@/lib/api";
import Link from "next/link";
import css from "./OrdersList.module.css";
import clsx from "clsx";

type Props = {
  params: Promise<{ client: number }>;
};

export default function FilteredOrders({ params }: Props) {
  const [clientId, setClientId] = React.useState<number | null>(null);

  React.useEffect(() => {
    params.then((p) => setClientId(p.client));
  }, [params]);

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts", clientId],
    queryFn: () => getContracts(clientId!),
    enabled: !!clientId,
  });

  if (!clientId || isLoading) {
    return <div className={css.list}>Завантаження...</div>;
  }

  if (!contracts || contracts.length === 0) {
    return <div className={css.list}>Контракти не знайдено</div>;
  }

  return (
    <>
      <ul className={css.list}>
        {contracts.map((item) => (
          <li key={item.contract_supplement} className={css.item}>
            <Link
              href={`/detail/${item.contract_supplement}`}
              className={css.link}
            >
              {item.contract_supplement}
              <span className={css.businessSpan}>{item.line_of_business}</span>
              <span
                className={clsx(
                  item.document_status === "затверджено" && css.statusOk,
                  item.document_status === "створено менеджером" &&
                    css.statusWaiting,
                  item.document_status === "продукція затверджена" &&
                    css.statusWaiting,
                  item.document_status === "до розгляду" && css.statusWaiting,
                  item.document_status === "розглядається" && css.statusWaiting,
                  item.document_status === "відхилено" && css.statusFailed
                )}
              >
                {item.document_status}
              </span>
              <span
                className={clsx(
                  css.businessSpan,
                  item.delivery_status?.includes("Так")
                    ? css.statusOk
                    : css.statusFailed
                )}
              >
                До постачання: {item.delivery_status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <BackBtn />
    </>
  );
}
