import BackBtn from "@/components/BackBtn/BackBtn";
import { getContracts } from "@/lib/api";
import Link from "next/link";

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
      <ul>
        {contracts.map((item) => (
          <li key={item.contract_supplement}>
            <Link href={`/detail/${item.contract_supplement}`}>
              {item.contract_supplement}
            </Link>
          </li>
        ))}
      </ul>
      <BackBtn />
    </>
  );
}
