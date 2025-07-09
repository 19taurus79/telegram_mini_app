import BackBtn from "@/components/BackBtn/BackBtn";
import { getRemainsById } from "@/lib/api";
import css from "./RemainsList.module.css";
// type Props = {
//   params: Promise<{ slug: string[] }>;
// };
type Props = {
  params: Promise<{ id: string }>;
};

export default async function filteredRemains({ params }: Props) {
  const id = await params;

  console.log(id);
  const remains = await getRemainsById({ productId: id.id });
  return (
    <>
      <ul className={css.remainsList}>
        <h2>Номенклатура: {remains[0].nomenclature}</h2>
        {remains.map((item) => (
          <li key={item.id} className={css.remainsItem}>
            {/* <p>Номенклатура: {item.nomenclature}</p> */}
            <p>Партия: {item.nomenclature_series}</p>
            <p>Бух: {item.buh}</p>
            <p>Склад: {item.skl}</p>
            <br />
          </li>
        ))}
      </ul>
      <BackBtn />
    </>
  );
}
