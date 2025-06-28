// import Delivery from "./@delivery/default";
"use client";

import React, { useState, ReactElement } from "react";

// type Props = {
//   children: ReactElement;
//   delivery: ReactElement;
// };
type DeliveryProps = {
  buying_season: "";
  client: string;
  contract_supplement: string;
  different: number;
  manager: string;
  nomenclature: string;
  party_sign: string;
};
// Пропсы для компонента children
type ChildProps = {
  updateDelivery: (newDelivery: DeliveryProps) => void;
};

// Пропсы для компонента delivery
type DeliveryComponentProps = {
  deliveryArr: DeliveryProps[];
};

type Props = {
  children: ReactElement<ChildProps>;
  delivery: ReactElement<DeliveryComponentProps>;
};
const RemainsLayout = ({ children, delivery }: Props) => {
  const [deliveryArr, setDeliveryArr] = useState<DeliveryProps[]>([]);
  const updateDelivery = (newDelivery: DeliveryProps) => {
    setDeliveryArr([...deliveryArr, newDelivery]);
  };
  return (
    <section>
      {/* <SideBar sidebar={sidebar}> */}
      {/* <div>{children}</div> */}
      <div>{children && React.cloneElement(children, { updateDelivery })}</div>
      {/* </SideBar> */}
      {/* <div>{delivery}</div> */}
      <div>{delivery && React.cloneElement(delivery, { deliveryArr })}</div>
    </section>
  );
};

export default RemainsLayout;
