"use client";

import BackBtn from "@/components/BackBtn/BackBtn";
import { getContracts } from "@/lib/api";
import Link from "next/link";
import css from "./OrdersList.module.css";
import clsx from "clsx";
import { getInitData } from "@/lib/getInitData";
import { useState, useEffect } from "react";
import OrderCommentBadge from "@/components/Orders/OrderCommentBadge/OrderCommentBadge";
import OrderCommentModal from "@/components/Orders/OrderCommentModal/OrderCommentModal";
import { useQuery } from "@tanstack/react-query";

type Props = {
  params: Promise<{ client: number }>;
};

export default function FilteredOrders({ params }: Props) {
  const [clientId, setClientId] = useState<number | null>(null);
  const initData = getInitData() || "";
  const [commentModalData, setCommentModalData] = useState<{
    orderRef: string;
  } | null>(null);

  useEffect(() => {
    params.then((p) => setClientId(p.client));
  }, [params]);

  const { data: contracts } = useQuery({
    queryKey: ["contracts", clientId, initData],
    queryFn: () => getContracts({ client: clientId!, initData }),
    enabled: !!clientId && !!initData,
  });

  if (!contracts) {
    return <div style={{ padding: "20px" }}>Завантаження...</div>;
  }

  return (
    <>
      <ul className={css.list}>
        {contracts.map((item) => (
          <li key={item.contract_supplement} className={css.item}>
            <div className={css.itemWrapper}>
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
              <div className={css.commentBadgeWrapper}>
                <OrderCommentBadge
                  orderRef={item.contract_supplement}
                  onClick={() =>
                    setCommentModalData({
                      orderRef: item.contract_supplement,
                    })
                  }
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      {/* <BackBtn /> */}

      {commentModalData && (
        <OrderCommentModal
          orderRef={commentModalData.orderRef}
          commentType="order"
          onClose={() => setCommentModalData(null)}
        />
      )}
    </>
  );
}
