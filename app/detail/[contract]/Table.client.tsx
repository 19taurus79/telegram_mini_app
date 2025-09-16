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
import React from "react";

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
    // moved_q: number;
    // party: string;
    buh: number;
    skl: number;
    qok: string;
    product: string;
    quantity: number;
    client: string;
    manager: string;
    order: string;
    id: string;
    product_id: string;
    parties: [
      {
        party: string;
        moved_q: number;
      },
    ];
  }[];
};
function TableOrderDetail({ details }: Detail) {
  const { delivery, setDelivery } = useDelivery();

  const isSelected = (id: string) => delivery.some((el) => el.id === id);

  console.log("details", details);

  const router = useRouter();
  const HandleClick = async ({ party }: { party: string }) => {
    const initData = await getInitData();
    const remainsId = await getIdRemainsByParty({ party, initData });
    console.log("remainsId", remainsId);
    // debugger;
    router.push(`/party_data/${remainsId[0].id}`);
  };
  // debugger;
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
            <React.Fragment key={item.id}>
              <tr
                key={item.id}
                style={isSelected(item.id) ? { color: "green" } : {}}
              >
                <td onClick={() => setDelivery(item)}>
                  <span>{item.product}</span>
                  <br />
                </td>
                <td
                  className={css.centr}
                  style={
                    item.qok === "2"
                      ? { color: "green" } // ✅ Если 'qok' равен "2", цвет зелёный
                      : item.qok === "1"
                        ? { color: "orange" } // ✅ Иначе, если 'qok' равен "1", цвет оранжевый
                        : { color: "red" } // ✅ Иначе, цвет красный
                  }
                >
                  {item.quantity}
                </td>
              </tr>
              {item.parties && item.parties[0].moved_q > 0 && (
                <>
                  {item.parties.map((party, index) => (
                    <tr key={index}>
                      <td
                        className={css.party}
                        onClick={() => HandleClick(party)}
                      >
                        {party.party}
                      </td>
                      <td className={css.qParty}>{party.moved_q}</td>
                    </tr>
                  ))}
                </>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableOrderDetail;
