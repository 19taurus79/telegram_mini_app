import BackBtn from "@/components/BackBtn/BackBtn";
import { getContractDetails } from "@/lib/api";

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
  const details = await getContractDetails({ contract: contract.contract });
  return (
    <>
      <ul>
        {details.map((item, index) => (
          <li key={index}>
            <p>Номенклатура: {item.nomenclature}</p>
            <p>Ознака партії: {item.party_sign}</p>
            <p>Рік закупівлі: {item.buying_season}</p>
            <p>Кількість: {item.different}</p>
            <br />
          </li>
        ))}
      </ul>
      <BackBtn />
    </>
  );
}
