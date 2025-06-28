import BackBtn from "@/components/BackBtn/BackBtn";
import { getContractDetails } from "@/lib/api";
import TableOrderDetail from "./Table.client";
import React from "react";
// import css from "./Detail.module.css";
// type Props = {
//   params: Promise<{ slug: string[] }>;
// };
type Props = {
  params: Promise<{ contract: string }>;
};

export default async function filteredOrdersDetail({ params }: Props) {
  const contract = await params;

  //   console.log(client.client);
  //   const remains = await getRemainsById({ productId: id.id });
  const originalList = await getContractDetails({
    contract: contract.contract,
  });
  console.log(originalList);
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
      product: combinedName,
      quantity: item.different,
      manager: item.manager,
      order: item.contract_supplement,
      client: item.client,
      id: item.contract_supplement + item.nomenclature,
    };
  });

  // console.log(transformedList);
  return (
    <>
      <TableOrderDetail details={details} />
      <BackBtn />
    </>
  );
}
