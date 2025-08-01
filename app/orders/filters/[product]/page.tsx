import BackBtn from "@/components/BackBtn/BackBtn";
import { getOrdersByProduct, getProductDetailsById } from "@/lib/api";
import css from "./OrdersByProduct.module.css";
import React from "react";
import { getInitData } from "@/lib/getInitData";
type Props = {
  params: Promise<{ product: string }>;
};
export default async function OrdersByProduct({ params }: Props) {
  const product = await params;
  const orders = await getOrdersByProduct({
    product: product.product,
    initData: await getInitData(),
  });
  const initData = await getInitData();
  const productDetails = await getProductDetailsById({
    product: product.product,
    initData,
  });
  return (
    <div className={css.wrapper}>
      <div className={css.clientBlock}>
        <div className={css.clientHeader}>
          {/* <span className={css.clientTitle}>Номенклатура:</span> */}
          <span>{productDetails.product}</span>
        </div>
      </div>
      {/* <ul className={css.orderBlock}>
        {orders.map((item) => (
          <React.Fragment key={item.id}>
            <li key={`${item.id}-contract`}>{item.contract_supplement}</li>
            <li key={`${item.id}-manager`}>{item.manager}</li>
            <li key={`${item.id}-client`}>{item.client}</li>
            <li key={`${item.id}-quantity`}>{item.different}</li>
          </React.Fragment>
        ))}
      </ul> */}
      {orders.map((order) => (
        <div key={order.id} className={css.orderBlock}>
          {/* <div className={css.orderHeader}>
            <span className={css.clientTitle}>Менеджер:</span>
            <span>{order.manager}</span>
          </div> */}

          <div className={css.table}>
            <div className={css.rowHeader}>
              <div className={css.headerProduct}>{order.manager}</div>
              {/* <div className={css.headerQuantity}>Кількість</div> */}
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
