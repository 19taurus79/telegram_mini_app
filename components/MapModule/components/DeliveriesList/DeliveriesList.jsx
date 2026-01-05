import css from "./DeliveriesList.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";
import { useMapControlStore } from "../../store/mapControlStore";
import StatusFilter from "../StatusFilter/StatusFilter";
import ManagerFilter from "../ManagerFilter/ManagerFilter";
import { getStatusColor } from "../../statusUtils";

export default function DeliveriesList({ deliveries, onClose, onFlyTo, onSelectDelivery }) {
  const { selectedManager } = useApplicationsStore();
  const { selectedStatuses } = useMapControlStore();

  // 1. Фильтрация
  const filteredDeliveries = deliveries.filter(d => {
    const statusMatch = Array.isArray(selectedStatuses) && selectedStatuses.includes(d.status);
    const managerMatch = !selectedManager || d.manager === selectedManager;
    return statusMatch && managerMatch;
  });

  // 2. Группировка: Статус -> Менеджер -> Список
  const grouping = {};
  filteredDeliveries.forEach(item => {
    const status = item.status || "Без статусу";
    const manager = item.manager || "Без менеджера";

    if (!grouping[status]) {
      grouping[status] = {
        totalWeight: 0,
        uniqueClientsCount: 0,
        managers: {}
      };
    }

    if (!grouping[status].managers[manager]) {
      grouping[status].managers[manager] = {
        totalWeight: 0,
        items: []
      };
    }

    grouping[status].managers[manager].items.push(item);
    grouping[status].managers[manager].totalWeight += item.total_weight || 0;
    grouping[status].totalWeight += item.total_weight || 0;
  });

  // 3. Подсчет уникальных клиентов (контрагентов) для каждого уровня
  Object.values(grouping).forEach(statusGroup => {
    const statusClients = new Set();
    Object.values(statusGroup.managers).forEach(managerGroup => {
      const managerClients = new Set(managerGroup.items.map(i => i.client));
      managerGroup.uniqueClientsCount = managerClients.size;
      managerGroup.items.forEach(i => statusClients.add(i.client));
    });
    statusGroup.uniqueClientsCount = statusClients.size;
  });

  const handleItemClick = (item) => {
    if (onSelectDelivery) onSelectDelivery(item);
    if (onFlyTo) onFlyTo(item.latitude, item.longitude);
    if (onClose) onClose();
  };

  return (
    <div className={css.container}>
      <div className={css.filtersContainer}>
        <ManagerFilter />
        <StatusFilter />
      </div>
      <div className={css.header}>
        <h3>Доставки ({filteredDeliveries.length})</h3>
      </div>
      
      <div className={css.list}>
        {Object.entries(grouping).map(([status, statusGroup]) => (
          <div key={status} className={css.statusSection}>
            <div className={css.statusHeader} style={{ backgroundColor: getStatusColor(status) }}>
              <span className={css.statusTitle}>{status}</span>
              <div className={css.statusAggregates}>
                <span>👥 {statusGroup.uniqueClientsCount}</span>
                <span>⚖️ {statusGroup.totalWeight.toFixed(2)} кг</span>
              </div>
            </div>

            {Object.entries(statusGroup.managers).map(([manager, managerGroup]) => (
              <div key={manager} className={css.managerSection}>
                <div className={css.managerHeader}>
                  <span className={css.managerName}>{manager}</span>
                  <div className={css.managerAggregates}>
                    <span>{managerGroup.uniqueClientsCount} к.</span>
                    <span>{managerGroup.totalWeight.toFixed(2)} кг</span>
                  </div>
                </div>

                <div className={css.itemsList}>
                  {managerGroup.items.map((item, idx) => (
                    <div 
                      key={`${item.id}-${idx}`} 
                      className={css.item}
                      onClick={() => handleItemClick(item)}
                    >
                      <div className={css.clientName}>{item.client}</div>
                      <div className={css.itemDetails}>
                        <span className={css.address}>{item.address}</span>
                        <span className={css.itemWeight}>{item.total_weight?.toFixed(2)} кг</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        {filteredDeliveries.length === 0 && (
          <div className={css.empty}>Немає доставок за обраними фільтрами</div>
        )}
      </div>
    </div>
  );
}
