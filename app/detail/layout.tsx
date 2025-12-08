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
  children: React.ReactNode;
  delivery: React.ReactNode;
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
      <div>
        {React.isValidElement(children)
          ? React.cloneElement(children as ReactElement<ChildProps>, { updateDelivery })
          : children}
      </div>
      {/* </SideBar> */}
      {/* <div>{delivery}</div> */}
      <div>
        {React.isValidElement(delivery)
          ? React.cloneElement(delivery as ReactElement<DeliveryComponentProps>, {
              deliveryArr,
            })
          : delivery}
      </div>
    </section>
  );
};

export default RemainsLayout;
