import css from "./DeliveriesList.module.css";
import { useState } from "react";
import { useApplicationsStore } from "../../store/applicationsStore";
import { useMapControlStore } from "../../store/mapControlStore";
import StatusFilter from "../StatusFilter/StatusFilter";
import ManagerFilter from "../ManagerFilter/ManagerFilter";
import { getStatusColor } from "../../statusUtils";

export default function DeliveriesList({ deliveries, onClose, onFlyTo, onSelectDelivery }) {
  const { selectedManager } = useApplicationsStore();
  const { selectedStatuses } = useMapControlStore();
  const [expandedDates, setExpandedDates] = useState(new Set());

  const toggleDateExpansion = (date) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // 1. Фильтрация
  const filteredDeliveries = deliveries.filter(d => {
    const statusMatch = Array.isArray(selectedStatuses) && selectedStatuses.includes(d.status);
    const managerMatch = !selectedManager || d.manager === selectedManager;
    return statusMatch && managerMatch;
  });

  // 2. Новая группировка и сортировка
  const grouping = {};
  filteredDeliveries.forEach(item => {
    const status = item.status || "Без статусу";
    const date = item.delivery_date || "Без дати";
    const manager = item.manager || "Без менеджера";

    if (!grouping[status]) grouping[status] = { dates: {} };
    if (!grouping[status].dates[date]) grouping[status].dates[date] = { managers: {} };
    if (!grouping[status].dates[date].managers[manager]) grouping[status].dates[date].managers[manager] = { items: [] };
    
    grouping[status].dates[date].managers[manager].items.push(item);
  });

  const sortedGrouping = Object.entries(grouping).map(([status, statusData]) => {
    const sortedDates = Object.entries(statusData.dates)
      .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
      .map(([date, dateData]) => {
        let dateWeight = 0;
        const dateClients = new Set();
        
        const managers = Object.entries(dateData.managers).map(([manager, managerData]) => {
          const managerWeight = managerData.items.reduce((sum, i) => sum + (i.total_weight || 0), 0);
          const managerClients = new Set(managerData.items.map(i => i.client));

          dateWeight += managerWeight;
          managerData.items.forEach(i => dateClients.add(i.client));
          
          return { manager, ...managerData, totalWeight: managerWeight, uniqueClientsCount: managerClients.size };
        });

        return { date, managers, totalWeight: dateWeight, uniqueClientsCount: dateClients.size };
      });

    const statusWeight = sortedDates.reduce((sum, d) => sum + d.totalWeight, 0);
    const statusClients = new Set(sortedDates.flatMap(d => d.managers.flatMap(m => m.items.map(i => i.client))));

    return { status, dates: sortedDates, totalWeight: statusWeight, uniqueClientsCount: statusClients.size };
  });

  const handleItemClick = (item) => {
    if (onSelectDelivery) onSelectDelivery(item);
    if (onFlyTo) onFlyTo(item.latitude, item.longitude);
    if (onClose) onClose();
  };

  const [areFiltersVisible, setAreFiltersVisible] = useState(true);

  return (
    <div className={css.container}>
      <div className={css.collapsibleHeader} onClick={() => setAreFiltersVisible(prev => !prev)}>
        <span>Фільтри</span>
        <span className={`${css.accordionToggle} ${areFiltersVisible ? css.rotated : ''}`}>▼</span>
      </div>

      {areFiltersVisible && (
        <div className={css.filtersContainer}>
          <ManagerFilter />
          <StatusFilter />
        </div>
      )}
      <div className={css.header}>
        <h3>Доставки ({filteredDeliveries.length})</h3>
      </div>
      
      <div className={css.list}>
        {sortedGrouping.map(({ status, dates, totalWeight, uniqueClientsCount }) => (
          <div key={status} className={css.statusSection}>
            <div className={css.statusHeader} style={{ backgroundColor: getStatusColor(status) }}>
              <span className={css.statusTitle}>{status}</span>
              <div className={css.statusAggregates}>
                <span>👥 {uniqueClientsCount}</span>
                <span>⚖️ {totalWeight.toFixed(2)} кг</span>
              </div>
            </div>

            {dates.map(({ date, managers, totalWeight: dateWeight, uniqueClientsCount: dateClientsCount }) => {
              const isExpanded = expandedDates.has(date);
              return (
                <div key={date} className={css.dateSection}>
                  <div className={css.dateHeader} onClick={() => toggleDateExpansion(date)}>
                    <span className={css.dateTitle}>
                      <span className={css.accordionToggle}>{isExpanded ? '▼' : '▶'}</span>
                      {date}
                    </span>
                    <div className={css.dateAggregates}>
                      <span>👥 {dateClientsCount}</span>
                      <span>⚖️ {dateWeight.toFixed(2)} кг</span>
                    </div>
                  </div>

                  {isExpanded && managers.map(({ manager, items, totalWeight: managerWeight, uniqueClientsCount: managerClientsCount }) => (
                    <div key={manager} className={css.managerSection}>
                      <div className={css.managerHeader}>
                        <span className={css.managerName}>{manager}</span>
                        <div className={css.managerAggregates}>
                          <span>{managerClientsCount} к.</span>
                          <span>{managerWeight.toFixed(2)} кг</span>
                        </div>
                      </div>

                      <div className={css.itemsList}>
                        {items.map((item, idx) => (
                          <div 
                            key={`${item.id}-${idx}`} 
                            className={css.item}
                            onClick={() => handleItemClick(item)}
                          >
                            <div className={css.clientName}>
                              {item.client}
                            </div>
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
              );
            })}
          </div>
        ))}

        {filteredDeliveries.length === 0 && (
          <div className={css.empty}>Немає доставок за обраними фільтрами</div>
        )}
      </div>
    </div>
  );
}

