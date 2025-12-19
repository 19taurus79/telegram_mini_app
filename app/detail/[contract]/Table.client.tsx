"use client";
import { useDelivery } from "@/store/Delivery";
import css from "./Detail.module.css";
import {
  getIdRemainsByParty,
} from "@/lib/api";

import { useRouter } from "next/navigation";
import { getInitData } from "@/lib/getInitData";
import React from "react";
type Detail = {
  details: {
    orders_q: number;
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
  console.log("delivery", delivery);
  return (
    <div className={css.listContainer}>
      {/* Header */}
      <div className={css.listHeader}>
        <div className={css.headerCellProduct}>Номенклатура</div>
        <div className={css.headerCellQuantity}>Кількість</div>
      </div>

      {/* List of Cards */}
      {details.map((item) => (
        <div
          key={item.id}
          className={`${css.productCard} ${
            isSelected(item.id) ? css.selected : ""
          }`}
        >
          {/* Main Product Row */}
          <div className={css.cardRow}>
            <div
              className={css.cardCellProduct}
              onClick={() => setDelivery(item)}
            >
              <span>{item.product}</span>
            </div>
            <div
              className={`${css.cardCellQuantity} ${css.centr}`}
              style={
                item.qok === "2"
                  ? { color: "green" }
                  : item.qok === "1"
                  ? { color: "orange" }
                  : { color: "red" }
              }
            >
              {item.quantity}
            </div>
          </div>

          {/* Party Rows */}
          {item.parties &&
            item.parties.length > 0 &&
            item.parties.some((p) => p.moved_q > 0) && (
              <div className={css.partySection}>
                {item.parties.map(
                  (party, index) =>
                    party.moved_q > 0 && (
                      <div
                        className={`${css.cardRow} ${css.partyRow}`}
                        key={index}
                      >
                        <div
                          className={`${css.cardCellProduct} ${css.party}`}
                          onClick={() => HandleClick(party)}
                        >
                          {party.party}
                        </div>
                        <div
                          className={`${css.cardCellQuantity} ${css.qParty}`}
                        >
                          {party.moved_q}
                        </div>
                      </div>
                    )
                )}
              </div>
            )}
        </div>
      ))}
    </div>
  );
}

export default TableOrderDetail;
