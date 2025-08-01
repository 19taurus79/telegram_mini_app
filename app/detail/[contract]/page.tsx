import BackBtn from "@/components/BackBtn/BackBtn";
import { getOrdersDetailsById } from "@/lib/api";
import TableOrderDetail from "./Table.client";
import React from "react";
import DeliveryBtn from "@/components/DeliveryBtn/DeliveryBtn";
import css from "./Detail.module.css";
import { getInitData } from "@/lib/getInitData";
//TODO: переписать по новым данным, которые приходят из API
type Props = {
  params: Promise<{ contract: string }>;
}; //Для получения деталей контракта

export default async function filteredOrdersDetail({ params }: Props) {
  const { contract } = await params; // Получаем параметры из промиса, которые были переданы в URL, чтобы получить детали контракта
  // const newData = await getOrdersDetailsById({
  //   orderId: contract.contract,
  // });
  // console.log("newData", newData);
  const originalList = await getOrdersDetailsById({
    orderId: contract,
    initData: await getInitData(),
  });
  // const originalList = await getOrdersDetailsById({
  //   orderId: contract.contract,
  // });
  console.log("contract details", originalList);
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
      parts.push(`${item.buying_season.trim()} рік`); // Добавлено " рік"
    }

    // Объединяем все части пробелами
    const combinedName = parts.join(" ");

    return {
      product: combinedName, // Собираем название продукта из номенклатуры, ознаки партії и року закупівлі
      quantity: item.different,
      manager: item.manager,
      order: item.contract_supplement,
      client: item.client,
      id: item.contract_supplement + item.nomenclature,
      product_id: item.product,
      orders_q: item.orders_q,
      moved_q: item.moved_q,
      party: item.party,
      buh: item.buh,
      skl: item.skl,
      qok: item.qok,
    };
  });
  console.log("details", details);
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
