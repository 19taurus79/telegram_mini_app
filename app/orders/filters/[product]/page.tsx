"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import BackBtn from "@/components/BackBtn/BackBtn";
import { getOrdersByProduct, getProductDetailsById } from "@/lib/api";
import css from "./OrdersByProduct.module.css";

type Props = {
  params: Promise<{ product: string }>;
};

export default function OrdersByProduct({ params }: Props) {
  const [productId, setProductId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then((p) => setProductId(p.product));
  }, [params]);

  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["ordersByProduct", productId],
    queryFn: () => getOrdersByProduct(productId!),
    enabled: !!productId,
  });

  const { data: productDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["productDetails", productId],
    queryFn: () => getProductDetailsById(productId!),
    enabled: !!productId,
  });

  if (!productId || isLoadingOrders || isLoadingDetails) {
    return <div className={css.wrapper}>Завантаження...</div>;
  }

  if (!orders || !productDetails) {
    return <div className={css.wrapper}>Дані не знайдено</div>;
  }

  return (
    <div className={css.wrapper}>
      <div className={css.clientBlock}>
        <div className={css.clientHeader}>
          <span>{productDetails.product}</span>
        </div>
      </div>
      {orders.map((order) => (
        <div key={order.id} className={css.orderBlock}>
          <div className={css.table}>
            <div className={css.rowHeader}>
              <div className={css.headerProduct}>{order.manager}</div>
            </div>

            <div className={css.row} key={order.id}>
              <div className={css.cell}>{order.client}</div>
              <div className={css.cell}>{order.contract_supplement}</div>
              <div className={css.cell}>{order.different}</div>
            </div>
          </div>
        </div>
      ))}
      <BackBtn />
    </div>
  );
}
