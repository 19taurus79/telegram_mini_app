import BackBtn from "@/components/BackBtn/BackBtn";
import css from "./AvRemainsList.module.css";
import { getAvRemainsById } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
type Props = {
  params: Promise<{ id: string }>;
};
export default async function AvStockPage({ params }: Props) {
  const id = await params;
  const initData = await getInitData();
  const remains = await getAvRemainsById({ productId: id.id, initData });
  console.log("av stock remains", remains);
  return (
    <>
      <div className={css.container}>
        <h2 className={css.heading}>{remains[0].nomenclature} вільно по РУ</h2>
        <ul className={css.table}>
          {remains.map((item) => (
            <li key={item.id} className={css.row}>
              <span className={css.cell_division}>{item.division}</span>
              <span className={css.cell_available}>{item.available}</span>
            </li>
          ))}
        </ul>
      </div>
      <BackBtn />
    </>
  );
}
