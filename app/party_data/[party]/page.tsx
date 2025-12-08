import BackBtn from "@/components/BackBtn/BackBtn";
import { getPartyData } from "@/lib/api";
import css from "./DataList.module.css";
import { getInitData } from "@/lib/getInitData";
type Props = {
  params: Promise<{ party: string }>;
};

export default async function PartyData({ params }: Props) {
  const party = await params;
  const initData = await getInitData();
  //   const decodedParam = decodeURIComponent(party.party);
  //   console.log("decoded", decodedParam);
  const data = await getPartyData({ party: party.party, initData });
  return (
    <>
      {/* <div>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div> */}
      {data.map((item) => (
        <ul key={item.crop_year} className={css.list}>
          <li className={css.listItem}>МТН: {item.mtn}</li>
          <li className={css.listItem}>Схожість: {item.germination}</li>
          <li className={css.listItem}>Рік урожаю: {item.crop_year}</li>
          <li className={css.listItem}>
            Країна походження: {item.origin_country}
          </li>
          <li className={css.listItem}>Вага одиниці: {item.weight}</li>
        </ul>
      ))}
      <BackBtn />
    </>
  );
}
