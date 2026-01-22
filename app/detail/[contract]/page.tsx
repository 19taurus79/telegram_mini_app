"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import BackBtn from "@/components/BackBtn/BackBtn";
import { getOrdersDetailsById } from "@/lib/api";
import TableOrderDetail from "./Table.client";
import DeliveryBtn from "@/components/DeliveryBtn/DeliveryBtn";
import css from "./Detail.module.css";

type Props = {
  params: Promise<{ contract: string }>;
};

export default function FilteredOrdersDetail({ params }: Props) {
  const [contract, setContract] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then((p) => setContract(p.contract));
  }, [params]);

  const { data: originalList, isLoading } = useQuery({
    queryKey: ["ordersDetails", contract],
    queryFn: () => getOrdersDetailsById(contract!),
    enabled: !!contract,
  });

  if (!contract || isLoading) {
    return <div>Завантаження...</div>;
  }

  if (!originalList || originalList.length === 0) {
    return <div>Дані не знайдено</div>;
  }

  const details = originalList.map((item) => {
    const parts = [];
    parts.push(item.nomenclature);
    
    if (item.party_sign && item.party_sign.trim() !== "") {
      parts.push(item.party_sign.trim());
    }
    
    if (item.buying_season && item.buying_season.trim() !== "") {
      parts.push(item.buying_season.trim());
    }
    
    const combinedName = parts.join(" ");
    
    return {
      product: combinedName,
      nomenclature: item.nomenclature,
      quantity: item.different,
      manager: item.manager,
      order: item.contract_supplement,
      client: item.client,
      id: item.contract_supplement + item.nomenclature,
      product_id: item.product,
      orders_q: item.orders_q,
      parties: item.parties,
      buh: item.buh,
      skl: item.skl,
      qok: item.qok,
    };
  });

  return (
    <>
      <TableOrderDetail details={details} />
      <div className={css.btnWrapper}>
        <BackBtn />
        <DeliveryBtn />
      </div>
    </>
  );
}
