"use client";
import BackBtn from "@/components/BackBtn/BackBtn";
import { getRemainsById, getTotalSumOrderByProduct } from "@/lib/api";
import css from "./RemainsList.module.css";
import OrdersByProduct from "@/components/OrdersByProduct/OrderByProduct";
import { getInitData } from "@/lib/getInitData";
// type Props = {
//   params: Promise<{ slug: string[] }>;
// };
type Props = {
  params: Promise<{ id: string }>;
};

export default async function filteredRemains({ params }: Props) {
  const id = await params;
  const initData = await getInitData();
  console.log(id);
  const remains = await getRemainsById({ productId: id.id, initData });
  const remainsSummary = remains.reduce(
    (acc, item) => {
      acc.buh += item.buh;
      acc.skl += item.skl;

      return acc;
    },
    { buh: 0, skl: 0 }
  );
  const sumOrder = await getTotalSumOrderByProduct({
    product: id.id,
    initData,
  });
  console.log("sumorder", sumOrder);
  const seedBusiness = ["Насіння", "Власне виробництво насіння"];

  return (
    <>
      <ul className={css.remainsList}>
        <h2>Номенклатура: {remains[0].nomenclature}</h2>
        <h3>Бух облік: {remainsSummary.buh}</h3>
        <h3>Складський облік: {remainsSummary.skl}</h3>
        {remainsSummary.buh > remainsSummary.skl ? (
          <h3 className={css.warning}>
            Увага! Бух облік більший за складський облік! Схоже що{" "}
            {remainsSummary.buh - remainsSummary.skl} ще десь в дорозі!
          </h3>
        ) : (
          <h3 className={css.success}>
            Все в порядку ! Вся номенклатура на складі !
          </h3>
        )}
        {/* <h3>Під всі заяки потрібно: {sumOrder[0].sum}</h3> */}
        {sumOrder[0].total_orders === 0 ? (
          <h3>
            Немає жодної заявки на цю номенклатуру, тому весь залишок вільний
          </h3>
        ) : (
          <h3>Під всі заявки потрібно: {sumOrder[0].total_orders}</h3>
        )}
        {/* Якщо немає жодної заявки, то виводимо попередження */}

        {sumOrder[0].total_orders > remainsSummary.buh ? (
          <h3 className={css.warning}>
            Увага! Для виконання всіх заявок не вистачає&nbsp;
            {sumOrder[0].total_orders - remainsSummary.buh} !
          </h3>
        ) : sumOrder[0].total_orders !== 0 ? (
          <h3 className={css.success}>
            Все в порядку! Замовленної кількості вистачає для виконання всіх
            заявок !
          </h3>
        ) : null}
        {remainsSummary.buh > sumOrder[0].total_orders ? (
          <h3 className={css.success}>
            Вільного залишку: {remainsSummary.buh - sumOrder[0].total_orders}
          </h3>
        ) : (
          <h3 className={css.warning}>
            Вільного залишку немає, всі залишки під заявки !
          </h3>
        )}

        {remains.map((item) => (
          <li key={item.id} className={css.remainsItem}>
            {/* <p>Номенклатура: {item.nomenclature}</p> */}
            <p>Партия: {item.nomenclature_series}</p>
            <p>Бух: {item.buh}</p>
            <p>Склад: {item.skl}</p>
            {seedBusiness.includes(item.line_of_business) && (
              <>
                <p>МТН: {item.mtn}</p>
                <p>Схожість: {item.germination}</p>
                <p>Країна походження: {item.origin_country}</p>
                <p>Рік урожаю: {item.crop_year}</p>
                <p>Вага мішку: {item.weight}</p>
              </>
            )}
            <br />
          </li>
        ))}
      </ul>
      <BackBtn />
      {sumOrder[0].total_orders !== 0 && <OrdersByProduct product={id.id} />}
    </>
  );
}
