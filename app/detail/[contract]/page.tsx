import { getOrdersDetailsById } from "@/lib/api";
import TableOrderDetail from "./Table.client";
import React from "react";
import { getServerInitData } from "@/lib/getServerInitData";

type Props = {
  params: Promise<{ contract: string }>;
}; //Для получения деталей контракта

export default async function filteredOrdersDetail({ params }: Props) {
  const { contract } = await params; // Получаем параметры из промиса, которые были переданы в URL, чтобы получить детали контракта
  const originalList = await getOrdersDetailsById({
    orderId: contract,
    initData: await getServerInitData(),
  });
  console.log("contract details", originalList);
  // debugger;
  const details = originalList.map((item) => {
    // Собираем все непустые части в массив
    const parts = [];

    // Номенклатура всегда добавляется
    parts.push(item.nomenclature);

    // Добавляем "ознака партії", если она не пустая и не состоит только из пробелов
    if (item.party_sign && item.party_sign.trim() !== "") {
      parts.push(item.party_sign.trim());
    }

    // Добавляем "рік закупівлі", если он не пустой и не состоит только из пробелов
    if (item.buying_season && item.buying_season.trim() !== "") {
      parts.push(item.buying_season.trim());
    }

    // Объединяем все части пробелами
    const combinedName = parts.join(" ");
    // debugger;
    return {
      product: combinedName, // Собираем название продукта из номенклатуры, ознаки партії и року закупівлі
      nomenclature: item.nomenclature,
      quantity: item.different,
      manager: item.manager,
      order: item.contract_supplement,
      client: item.client,
      id: item.contract_supplement + item.nomenclature,
      product_id: item.product,
      orders_q: item.orders_q,
      orders_q_total: item.orders_q_total,
      orders_q_product_confirmed: item.orders_q_product_confirmed,
      parties: item.parties,
      // moved_q: item.moved_q,
      // party: item.party,
      buh: item.buh,
      skl: item.skl,
      qok: item.qok,
      delivery_status: item.delivery_status,
      document_status: item.document_status,
      line_of_business: item.line_of_business,
      party_sign: item.party_sign,
      buying_season: item.buying_season,
    };
  });
  console.log("details", details);
  return (
    <>
      <TableOrderDetail details={details} />
    </>
  );
}
