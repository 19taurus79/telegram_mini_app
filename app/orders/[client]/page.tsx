import BackBtn from "@/components/BackBtn/BackBtn";
import { getContracts } from "@/lib/api";
import Link from "next/link";
import css from "./OrdersList.module.css";
import clsx from "clsx";
import { getInitData } from "@/lib/getInitData";
// type Props = {
//   params: Promise<{ slug: string[] }>;
// };
type Props = {
  params: Promise<{ client: number }>;
};

export default async function filteredOrders({ params }: Props) {
  const client = await params;
  const initData = await getInitData();
  console.log(client.client);
  //   const remains = await getRemainsById({ productId: id.id });
  const contracts = await getContracts({ client: client.client, initData });

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
              <span className={css.businessSpan}>{item.line_of_business}</span>
              <span
                className={clsx(
                  item.document_status === "затверджено" && css.statusOk,
                  item.document_status === "створено менеджером" &&
                    css.statusWaiting,
                  item.document_status === "продукція затверджена" &&
                    css.statusWaiting,
                  item.document_status === "до розгляду" && css.statusWaiting,
                  item.document_status === "розглядається" && css.statusWaiting,

                  item.document_status === "відхилено" && css.statusFailed
                )}
              >
                {item.document_status}
              </span>
              <span
                className={clsx(
                  css.businessSpan,
                  item.delivery_status?.includes("Так")
                    ? css.statusOk
                    : css.statusFailed
                )}
              >
                До постачання: {item.delivery_status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <BackBtn />
    </>
  );
}
