"use client";
import { useDelivery } from "@/store/Delivery";
// import { useDelivery } from "@/context/DeliveryContext";
import css from "./Detail.module.css";
// import { useEffect, useState } from "react";
import {
  // getEnoughRemains,
  // getGroupRemainsById,
  getIdRemainsByParty,
  // getMovedData,
  // getTotalSumOrderByProduct,
} from "@/lib/api";
import {} from // EnoughtRemains,
// GroupRemains,
// MergedData,
// MovedData,
// TotalOrder,
"@/types/types";
import { useRouter } from "next/navigation";
import { getInitData } from "@/lib/getInitData";

// type Detail = {
//   details: {
//     product: string;
//     quantity: number;
//     client: string;
//     manager: string;
//     order: string;
//     id: string;
//     product_id: string;
//     moved?: MovedData;
//   }[];
// };
type Detail = {
  details: {
    orders_q: number;
    moved_q: number;
    party: string;
    buh: number;
    skl: number;
    qok: boolean;
    product: string;
    quantity: number;
    client: string;
    manager: string;
    order: string;
    id: string;
    product_id: string;
  }[];
};
function TableOrderDetail({ details }: Detail) {
  // const { handleRowClick, onDeliveryArr } = useDelivery();
  const { delivery, setDelivery } = useDelivery();
  // const [totalOrder, setTotalOrder] = useState<TotalOrder[]>([]);
  // const [remains, setRemains] = useState<GroupRemains[]>([]);
  // const [enough, setEnough] = useState<EnoughtRemains[]>([]);
  // const [moved, setMoved] = useState<MovedData[]>([]);
  const isSelected = (id: string) => delivery.some((el) => el.id === id);
  // useEffect(() => {
  // const uniqueProducts = [...new Set(details.map((d) => d.product_id))];

  // async function fetchTotalOrderForProducts(products: string[]) {
  //   const promises = products.map((product) =>
  //     getTotalSumOrderByProduct({ product })
  //   );
  //   const results = await Promise.all(promises);
  //   const flattenedResults = results.flat();
  //   setTotalOrder(flattenedResults);
  // }

  // if (uniqueProducts.length > 0) {
  //   fetchTotalOrderForProducts(uniqueProducts);
  // }
  // async function getEnaugh() {
  //   const enoughRemains = await getEnoughRemains();
  //   setEnough(enoughRemains);
  // }
  // async function fetchRemainsForProducts(products: string[]) {
  //   const promises = products.map((product) =>
  //     getGroupRemainsById({ productId: product })
  //   );
  //   const results = await Promise.all(promises);
  //   const flattenedResults = results.flat();
  //   setRemains(flattenedResults);
  // }
  //   async function fetchMovedData(order: string) {
  //     const movedData = await getMovedData({ order });
  //     setMoved(movedData);
  //   }
  //   if (uniqueProducts.length > 0) {
  //     fetchRemainsForProducts(uniqueProducts);
  //     getEnaugh();
  //     fetchMovedData(details[0].order);
  //   }
  // }, [details]);
  // const mergedData = [...details, ...totalOrder, ...remains].reduce(
  //   (acc, item) => {
  //     const id = item.product_id;
  //     if (!acc[id]) {
  //       acc[id] = { id } as Partial<MergedData>;
  //     }
  //     Object.assign(acc[id], item);
  //     return acc;
  //   },
  //   {} as Record<string, Partial<MergedData>>
  // );
  // console.log("uniqueProducts", uniqueProducts);
  console.log("details", details);
  // console.log("delivery", delivery);
  // console.log("totalOrder", totalOrder);
  // console.log("remains", remains);
  // console.log("mergedData", mergedData);
  // console.log("enough", enough);
  // console.log("moved", moved);
  const router = useRouter();
  const HandleClick = async ({ party }: { party: string }) => {
    const initData = await getInitData();
    const remainsId = await getIdRemainsByParty({ party, initData });
    console.log("remainsId", remainsId);
    // const encodedParty = encodeURIComponent(party);
    router.push(`/party_data/${remainsId[0].id}`);
  };

  return (
    <div className={css.tableContainer}>
      <table className={css.table}>
        <thead>
          <tr>
            <th>Номенклатура</th>

            <th>Кількість</th>
          </tr>
        </thead>
        <tbody>
          {details.map((item) => (
            <>
              <tr
                key={item.id}
                style={isSelected(item.id) ? { color: "green" } : {}}
              >
                {" "}
                <td>
                  <span onClick={() => setDelivery(item)}>{item.product}</span>
                  <br />
                </td>
                <td
                  className={css.centr}
                  style={item.qok ? { color: "green" } : {}}
                >
                  {item.quantity}
                </td>
              </tr>
              {item.party && (
                <tr>
                  <td className={css.party} onClick={() => HandleClick(item)}>
                    {item.party}
                  </td>
                  <td className={css.qParty}>{item.moved_q}</td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableOrderDetail;
