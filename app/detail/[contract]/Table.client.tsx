"use client";
import { useDelivery } from "@/store/Delivery";
// import { useDelivery } from "@/context/DeliveryContext";
import css from "./Detail.module.css";
type Detail = {
  details: {
    product: string;
    quantity: number;
    client: string;
    manager: string;
    order: string;
    id: string;
  }[];
};

function TableOrderDetail({ details }: Detail) {
  // const { handleRowClick, onDeliveryArr } = useDelivery();
  const { delivery, setDelivery } = useDelivery();
  const isSelected = (id: string) => delivery.some((el) => el.id === id);

  console.log("delivery", delivery);
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
            <tr
              key={item.id}
              // onClick={() => handleRowClick(item)}
              onClick={() => setDelivery(item)}
              style={isSelected(item.id) ? { color: "green" } : {}}
            >
              {" "}
              <td>{item.product}</td>
              <td className={css.centr}>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableOrderDetail;
