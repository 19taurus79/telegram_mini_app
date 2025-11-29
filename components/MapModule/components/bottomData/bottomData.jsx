import { useApplicationsStore } from "../../store/applicationsStore";
import { useMapControlStore } from "../../store/mapControlStore";
import { useDisplayAddressStore } from "../../store/displayAddress";
import css from "./bottomData.module.css";

export default function BottomData({ onEditClient }) {
  const { selectedClient } = useApplicationsStore();
  const { areApplicationsVisible, areClientsVisible } = useMapControlStore();
  const { addressData } = useDisplayAddressStore();

  // Режим отображения заявок
  if (areApplicationsVisible) {
    // Если выбран клиент с заявками - показываем его
    if (selectedClient && selectedClient.orders) {
       // Продолжаем выполнение блока
    } else if (selectedClient && !selectedClient.orders && areClientsVisible) {
       // Если выбран контрагент (без заявок) и включен режим контрагентов - пропускаем этот блок
       // чтобы сработал следующий if (areClientsVisible)
    } else {
      return (
        <div className={css.container}>
          <p className={css.emptyMessage}>Оберіть клієнта на карті для перегляду заявок</p>
        </div>
      );
    }

    if (selectedClient && selectedClient.orders) {
    // Группируем заявки по номеру договора
    const groupedOrders = {};
    selectedClient.orders.forEach(order => {
      const contractNum = order.contract_supplement || 'Без номера';
      if (!groupedOrders[contractNum]) {
        groupedOrders[contractNum] = [];
      }
      groupedOrders[contractNum].push(order);
    });
      console.log("groupedOrders",groupedOrders);
      console.log("selectedClient",selectedClient);
    return (
      <div className={css.container}>
        <h2 className={css.title}>
          {selectedClient.client}
        </h2>
        <h3>{selectedClient.orders[0].manager}</h3>
        <p className={css.subtitle}>
          {`${selectedClient.address.region} обл., ${selectedClient.address.area} район, ${selectedClient.address.commune} громада, ${selectedClient.address.city}`}
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
  }

  // Режим отображения контрагентов
  if (areClientsVisible) {
    if (!selectedClient) {
      return (
        <div className={css.container}>
          <p className={css.emptyMessage}>Оберіть контрагента на карті для перегляду інформації</p>
        </div>
      );
    }

    return (
      <div className={css.container}>
        <h2 className={css.title}>{selectedClient.client}</h2>
        <div className={css.addressInfo}>
            <p><strong>Адреса:</strong> {selectedClient.region} обл., {selectedClient.area} район, {selectedClient.commune} громада, {selectedClient.city}</p>
            <p><strong>Менеджер:</strong> {selectedClient.manager}</p>
            <p><strong>Контактна особа:</strong> {selectedClient.representative}</p>
            <p><strong>Телефон:</strong> <a href={`tel:${selectedClient.phone1}`} style={{ textDecoration: 'underline', color: 'inherit' }}>{selectedClient.phone1}</a></p>
            {selectedClient.phone2 && selectedClient.phone2 !== "Не вказано" && <p><strong>Телефон 2:</strong> <a href={`tel:${selectedClient.phone2}`} style={{ textDecoration: 'underline', color: 'inherit' }}>{selectedClient.phone2}</a></p>}
            {selectedClient.email && <p><strong>Email:</strong> {selectedClient.email}</p>}
        </div>
        {onEditClient && (
          <button 
            className={css.editButton} 
            onClick={() => onEditClient(selectedClient)}
          >
            Редагувати
          </button>
        )}
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
