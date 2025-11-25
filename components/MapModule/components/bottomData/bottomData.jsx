import { useApplicationsStore } from "../../store/applicationsStore";
import css from "./bottomData.module.css";

export default function BottomData() {
  const { selectedClient } = useApplicationsStore();
  
  if (!selectedClient) {
    return (
      <div className={css.container}>
        <p className={css.emptyMessage}>Оберіть клієнта на карті для перегляду заявок</p>
      </div>
    );
  }

  // Группируем заявки по номеру договора
  const groupedOrders = {};
  selectedClient.orders.forEach(order => {
    const contractNum = order.contract_supplement || 'Без номера';
    if (!groupedOrders[contractNum]) {
      groupedOrders[contractNum] = [];
    }
    groupedOrders[contractNum].push(order);
  });

  return (
    <div className={css.container}>
      <h2 className={css.title}>
        {selectedClient.client}
      </h2>
      <p className={css.subtitle}>
        {selectedClient.address.city}, {selectedClient.address.area}
      </p>
      <p className={css.orderCount}>
        Всього заявок: {selectedClient.count}
      </p>
      
      <div className={css.ordersContainer}>
        {Object.entries(groupedOrders).map(([contractNum, orders]) => (
          <div key={contractNum} className={css.contractGroup}>
            <h3 className={css.contractNumber}>Договір: {contractNum}</h3>
            <ul className={css.ordersList}>
              {orders.map((order, index) => (
                <li key={index} className={css.orderItem}>
                  <div className={css.productName}>{order.nomenclature}</div>
                  <div className={css.orderDetails}>
                    <span>Кількість: {order.different}</span>
                    {/* {order.manufacturer && <span> • {order.manufacturer}</span>} */}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
