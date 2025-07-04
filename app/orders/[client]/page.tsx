import BackBtn from "@/components/BackBtn/BackBtn";
import { getContracts } from "@/lib/api";
import Link from "next/link";
import css from "./OrdersList.module.css";
// type Props = {
//   params: Promise<{ slug: string[] }>;
// };
type Props = {
  params: Promise<{ client: string }>;
};

export default async function filteredOrders({ params }: Props) {
  const client = await params;

  console.log(client.client);
  //   const remains = await getRemainsById({ productId: id.id });
  const contracts = await getContracts({ client: client.client });
  return (
    <>
      <ul className={css.list}>
        {contracts.map((item) => (
          <li key={item.contract_supplement} className={css.item}>
            <Link
              href={`/detail/${item.contract_supplement}`}
              className={css.link}
            >
              {item.contract_supplement}
            </Link>
          </li>
        ))}
      </ul>
      <BackBtn />
    </>
  );
}
