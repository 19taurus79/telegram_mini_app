import css from "./DeliveriesList.module.css";
import { useState } from "react";
import { useApplicationsStore } from "../../store/applicationsStore";
import { useMapControlStore } from "../../store/mapControlStore";
import StatusFilter from "../StatusFilter/StatusFilter";
import ManagerFilter from "../ManagerFilter/ManagerFilter";
import { getStatusColor } from "../../statusUtils";
import { getInitData } from "@/lib/getInitData";
import { batchUpdateDeliveries } from "@/lib/api";
import toast from "react-hot-toast";

export default function DeliveriesList({ deliveries, onClose, onFlyTo, onSelectDelivery, isMobile = false }) {
  const { 
    selectedManagers,
    selectedDeliveries,
    toggleSelectedDelivery,
    updateDeliveries,
    clearSelectedDeliveries
  } = useApplicationsStore();
  const { selectedStatuses, selectedDates, toggleDate } = useMapControlStore();
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [isBatchStatusModalOpen, setIsBatchStatusModalOpen] = useState(false);
  const [isBatchDateModalOpen, setIsBatchDateModalOpen] = useState(false);
  const [newBatchDate, setNewBatchDate] = useState("");

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

  const handleDateClick = (date, e) => {
    e.preventDefault();
    e.stopPropagation();
    const isMulti = e.ctrlKey || e.metaKey;
    toggleDate(date, isMulti);
  };

  // 1. Фильтрация
  const filteredDeliveries = deliveries.filter(d => {
    const statusMatch = Array.isArray(selectedStatuses) && selectedStatuses.includes(d.status);
    const managerMatch = selectedManagers.length === 0 || selectedManagers.includes(d.manager);
    const dateMatch = selectedDates.length === 0 || selectedDates.includes(d.delivery_date || "Без дати");
    return statusMatch && managerMatch && dateMatch;
  });

  // Для списка (аккордеонов) мы фильтруем по статусу и менеджеру, но НЕ по дате, 
  // чтобы все даты оставались видимыми в интерфейсе
  const listDeliveries = deliveries.filter(d => {
    const statusMatch = Array.isArray(selectedStatuses) && selectedStatuses.includes(d.status);
    const managerMatch = selectedManagers.length === 0 || selectedManagers.includes(d.manager);
    return statusMatch && managerMatch;
  });

  // 2. Новая группировка и сортировка (используем listDeliveries)
  const grouping = {};
  listDeliveries.forEach(item => {
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

  const handleItemClick = (item, e) => {
    const isMultiClick = e && (e.ctrlKey || e.metaKey);
    if (isMultiClick) {
      e.preventDefault();
      e.stopPropagation();
      toggleSelectedDelivery(item);
    } else {
      if (onSelectDelivery) onSelectDelivery(item);
      if (onFlyTo) {
        // Fallback to Korotych warehouse if coordinates are empty/zero (for pickups)
        let lat = parseFloat(item.latitude);
        let lng = parseFloat(item.longitude);
        if (!lat && !lng) {
          lat = 49.97291981610772;
          lng = 35.984822605914864;
        }
        onFlyTo(lat, lng);
      }
      if (onClose) onClose();
    }
  };

  const handleBatchUpdate = async (status, date) => {
    if (selectedDeliveries.length === 0) return;
    
    const ids = selectedDeliveries.map(d => d.id);
    const loadingToast = toast.loading(`Пакетне оновлення ${ids.length} доставок...`);
    
    try {
      const initData = getInitData();
      const res = await batchUpdateDeliveries(ids, status, date, initData);
      
      if (res && res.status === "ok") {
        toast.success(`Оновлено ${ids.length} доставок`, { id: loadingToast });
        
        const updatedDeliveries = deliveries
          .filter(d => ids.includes(d.id))
          .map(d => ({
            ...d,
            ...(status ? { status } : {}),
            ...(date ? { delivery_date: date } : {})
          }));
          
        updateDeliveries(updatedDeliveries);
        // Не очищуємо вибір, щоб користувач бачив результат
        setIsBatchStatusModalOpen(false);
        setIsBatchDateModalOpen(false);
      } else {
        toast.error("Помилка при пакетному оновленні", { id: loadingToast });
      }
    } catch (e) {
      console.error("Batch update error:", e);
      toast.error("Помилка при пакетному оновленні", { id: loadingToast });
    }
  };

  const isMultiSelected = (item) => {
    return selectedDeliveries.some(i => i.id === item.id);
  };

  const [areFiltersVisible, setAreFiltersVisible] = useState(true);

  return (
    <div className={css.container}>
      {!isMobile && (
        <>
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
        </>
      )}
      <div className={css.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Доставки ({filteredDeliveries.length})</h3>
        {selectedDeliveries.length > 1 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={css.batchBtn} 
              style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
              onClick={() => setIsBatchStatusModalOpen(true)}
            >
              ✓ Статус (гр.)
            </button>
            <button 
              className={css.batchBtn} 
              style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
              onClick={() => { setIsBatchDateModalOpen(true); setNewBatchDate(""); }}
            >
              📅 Дата (гр.)
            </button>
            <button 
              className={css.batchBtn} 
              style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
              onClick={() => clearSelectedDeliveries()}
            >
              Скинути
            </button>
          </div>
        )}
      </div>

      {isBatchStatusModalOpen && (
        <div 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.5)', zIndex: 9999, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setIsBatchStatusModalOpen(false)}
        >
          <div 
            style={{ 
              background: 'var(--card-bg, #1a1a1a)', padding: '24px', borderRadius: '20px', 
              width: '90%', maxWidth: '320px', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: 300 }}>Статус для {selectedDeliveries.length} дост.</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer' }}
                onClick={() => handleBatchUpdate("Виконано", null)}
              >
                ✓ Виконано
              </button>
              <button 
                style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer' }}
                onClick={() => handleBatchUpdate("В роботі", null)}
              >
                ⚡ В роботі
              </button>
              <button 
                style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer' }}
                onClick={() => handleBatchUpdate("Доставка з ЦО на клієнта", null)}
              >
                🏢 Доставка з ЦО
              </button>
              <button 
                style={{ background: '#94a2b8', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer' }}
                onClick={() => handleBatchUpdate("Створено", null)}
              >
                📄 Створено
              </button>
            </div>
            <button 
              style={{ width: '100%', marginTop: '20px', padding: '10px', background: 'transparent', border: '1px solid #444', color: '#888', borderRadius: '8px', cursor: 'pointer' }}
              onClick={() => setIsBatchStatusModalOpen(false)}
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {isBatchDateModalOpen && (
        <div 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.5)', zIndex: 9999, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setIsBatchDateModalOpen(false)}
        >
          <div 
            style={{ 
              background: 'var(--card-bg, #1a1a1a)', padding: '24px', borderRadius: '20px', 
              width: '90%', maxWidth: '320px', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: 300 }}>Дата для {selectedDeliveries.length} дост.</h4>
            <input 
              type="date" 
              value={newBatchDate}
              onChange={(e) => setNewBatchDate(e.target.value)}
              style={{ width: '100%', padding: '10px', background: '#333', border: '1px solid #444', borderRadius: '8px', color: 'white', marginBottom: '20px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                style={{ flex: 1, padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => handleBatchUpdate(null, newBatchDate)}
              >
                Оновити
              </button>
              <button 
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #444', color: '#888', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => setIsBatchDateModalOpen(false)}
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className={css.list}>
        {sortedGrouping.map(({ status, dates, totalWeight, uniqueClientsCount }) => (
          <div key={status} className={css.statusSection} style={{ '--status-color': getStatusColor(status) }}>
            <div className={css.statusHeader}>
              <span className={css.statusTitle}>{status}</span>
              <div className={css.statusAggregates}>
                <span>👥 {uniqueClientsCount}</span>
                <span>⚖️ {totalWeight.toFixed(2)} кг</span>
              </div>
            </div>

            {dates.map(({ date, managers, totalWeight: dateWeight, uniqueClientsCount: dateClientsCount }) => {
              const isExpanded = expandedDates.has(date);
              const isDateFiltered = selectedDates.includes(date);
              return (
                <div key={date} className={css.dateSection}>
                  <div 
                    className={`${css.dateHeader} ${isDateFiltered ? css.dateHeaderSelected : ''}`} 
                    onClick={() => toggleDateExpansion(date)}
                  >
                    <span className={css.dateTitle}>
                      <span className={css.accordionToggle}>{isExpanded ? '▼' : '▶'}</span>
                      <span className={css.dateLabel}>{date}</span>
                      <button 
                        className={css.calendarBtn}
                        onClick={(e) => handleDateClick(date, e)}
                        title="Фільтрувати за цією датою (Ctrl для множинного вибору)"
                      >
                        📅
                      </button>
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
                            className={`${css.item} ${isMultiSelected(item) ? css.itemSelected : ''}`}
                            onClick={(e) => handleItemClick(item, e)}
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

