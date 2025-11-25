import { useApplicationsStore } from "../../store/applicationsStore";
import { useMapControlStore } from "../../store/mapControlStore";
import { useDisplayAddressStore } from "../../store/displayAddress";
import css from "./bottomData.module.css";

export default function BottomData() {
  const { selectedClient } = useApplicationsStore();
  const { areApplicationsVisible } = useMapControlStore();
  const { addressData } = useDisplayAddressStore();

  // Режим отображения заявок
  if (areApplicationsVisible) {
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

  // Режим поиска адреса (стандартный)
  if (!addressData || Object.keys(addressData).length === 0) {
    return (
      <div className={css.container}>
        <p className={css.emptyMessage}>Оберіть адресу на карті або через пошук</p>
      </div>
    );
  }

  return (
    <div className={css.container}>
      <h2 className={css.title}>Обрана адреса</h2>
      <div className={css.addressInfo}>
        <p><strong>Адреса:</strong> {addressData.display_name}</p>
        {addressData.lat && <p><strong>Координати:</strong> {addressData.lat}, {addressData.lon}</p>}
        {/* Здесь можно добавить другие поля адреса, если они есть */}
      </div>
    </div>
  );
}
