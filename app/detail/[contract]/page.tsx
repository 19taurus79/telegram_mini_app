import BackBtn from "@/components/BackBtn/BackBtn";
import { getContractDetails } from "@/lib/api";
import TableOrderDetail from "./Table.client";
import React from "react";

type Props = {
  params: Promise<{ contract: string }>;
}; //Для получения деталей контракта

export default async function filteredOrdersDetail({ params }: Props) {
  const contract = await params; // Получаем параметры из промиса, которые были переданы в URL, чтобы получить детали контракта

  const originalList = await getContractDetails({
    contract: contract.contract,
  });
  // Ответ сервера
  // [
  //   {
  //     nomenclature: "Тайгедер 72%, к.е. (20 л)",
  //     party_sign: " ",
  //     buying_season: "",
  //     different: 1200,
  //     client: "АГРОЛАТІНВЕСТ ТОВ Харків, ВІП",
  //     contract_supplement: "ТЕ-00052611",
  //     manager: "Гаража Денис Олександрович",
  //   },
  // ];
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
      product: combinedName, // Собираем название продукта из номенклатуры, ознаки партії и року закупівлі
      quantity: item.different,
      manager: item.manager,
      order: item.contract_supplement,
      client: item.client,
      id: item.contract_supplement + item.nomenclature,
    };
  });

  return (
    <>
      <TableOrderDetail details={details} />
      <BackBtn />
    </>
  );
}
