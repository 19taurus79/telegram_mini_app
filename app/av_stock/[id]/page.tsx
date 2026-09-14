import css from "./AvRemainsList.module.css";
import { getAvRemainsById } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import AvRemainsListClient from "./AvRemainsListClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AvStockPage({ params }: Props) {
  const id = await params;
  const initData = await getInitData();
  const remains = await getAvRemainsById({ productId: id.id, initData });
  console.log("av stock remains", remains);
  const title =
    remains && remains.length > 0
      ? `${remains[0].nomenclature} вільно по РУ`
      : "Залишки товару відсутні";
  return (
    <>
      <div className={css.pageContent}>
        <div className={css.container}>
          <h2 className={css.heading}>{title}</h2>
          <AvRemainsListClient remains={remains || []} />
        </div>
      </div>
      {/* <BackBtn /> */}
    </>
  );
}
