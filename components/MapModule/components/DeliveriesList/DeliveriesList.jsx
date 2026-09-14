import css from "./DeliveriesList.module.css";
import { useState } from "react";
import { useApplicationsStore } from "../../store/applicationsStore";
import { useMapControlStore } from "../../store/mapControlStore";
import StatusFilter from "../StatusFilter/StatusFilter";
import ManagerFilter from "../ManagerFilter/ManagerFilter";
import LineOfBusinessFilter from "../LineOfBusinessFilter/LineOfBusinessFilter";
import { filterDelivery } from "../../utils/filterUtils";
import { getStatusColor } from "../../statusUtils";
import { getInitData } from "@/lib/getInitData";
import { batchUpdateDeliveries } from "@/lib/api";
import toast from "react-hot-toast";
import { Download, Printer } from "lucide-react";
import ExportPrintModal from "../ExportPrintModal/ExportPrintModal";
import BatchTTNModal from "../BatchTTNModal/BatchTTNModal";
import SendAccountantConfirmModal from "../SendAccountantConfirmModal/SendAccountantConfirmModal";
import { isNPDelivery, isCODelivery } from "@/lib/utils/deliveryUtils";

export default function DeliveriesList({ deliveries, onClose, onFlyTo, onSelectDelivery, isMobile = false }) {
  const { 
    applications,
    selectedLoBs,
    selectedManagers,
    selectedDeliveries,
    setSelectedDeliveries,
    setIsEditDeliveryModalOpen,
    toggleSelectedDelivery,
    updateDeliveries,
    clearSelectedDeliveries
  } = useApplicationsStore();
  const { selectedStatuses, selectedDates, toggleDate } = useMapControlStore();
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [isBatchStatusModalOpen, setIsBatchStatusModalOpen] = useState(false);
  const [isBatchDateModalOpen, setIsBatchDateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [newBatchDate, setNewBatchDate] = useState("");
  const [batchTtnModalData, setBatchTtnModalData] = useState(null);
  const [sendAccountantPromptData, setSendAccountantPromptData] = useState(null);

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
  const filteredDeliveries = deliveries.filter(d => 
    filterDelivery(d, selectedStatuses, selectedManagers, selectedDates, selectedLoBs, applications)
  );

  // Для списка (аккордеонов) мы фильтруем по статусу, менеджеру и видам деятельности, но НЕ по дате, 
  // чтобы все даты оставались видимыми в интерфейсе
  const listDeliveries = deliveries.filter(d => 
    filterDelivery(d, selectedStatuses, selectedManagers, [], selectedLoBs, applications)
  );

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

  const handleBatchUpdate = async (status, date, ttnData = null) => {
    if (selectedDeliveries.length === 0) return;
    
    const ids = selectedDeliveries.map(d => d.id);
    const coDeliveries = selectedDeliveries.filter(d => isCODelivery(d));

    // Якщо статус змінюється на "Виконано", перевіряємо наявність доставок Нової Пошти
    if (status === "Виконано" && !ttnData) {
      const npDeliveries = selectedDeliveries.filter(d => isNPDelivery(d));
      if (npDeliveries.length > 0) {
        setIsBatchStatusModalOpen(false);
        setBatchTtnModalData({
          deliveries: selectedDeliveries,
          npDeliveries: npDeliveries,
          status: status,
          date: date
        });
        return;
      }
    }

    const loadingToast = toast.loading(`Пакетне оновлення ${ids.length} доставок...`);
    
    try {
      const initData = getInitData();
      const res = await batchUpdateDeliveries(ids, status, date, initData, ttnData?.ttnMap, ttnData?.commonTtn);
      
      if (res && res.warnings && res.warnings.length > 0) {
        res.warnings.forEach(warn => toast(warn, { icon: '⚠️', duration: 6000 }));
      }

      if (res && res.status === "ok") {
        toast.success(`Оновлено ${ids.length} доставок`, { id: loadingToast });
        
        const updatedDeliveries = deliveries
          .filter(d => ids.includes(d.id))
          .map(d => {
            const newTtn = ttnData?.commonTtn || (ttnData?.ttnMap && (ttnData.ttnMap[d.id] || ttnData.ttnMap[String(d.id)])) || d.ttn;
            const wasCO = isCODelivery(d);
            return {
              ...d,
              ...(status ? { status } : {}),
              ...(date ? { delivery_date: date } : {}),
              ...(newTtn ? { ttn: newTtn } : {}),
              ...(wasCO ? { isCO: true } : {})
            };
          });
          
        updateDeliveries(updatedDeliveries);
        // Не очищуємо вибір, щоб користувач бачив результат
        setIsBatchStatusModalOpen(false);
        setIsBatchDateModalOpen(false);

        // Якщо оновлювалися доставки Нової Пошти з ТТН, пропонуємо загальну відомість бухгалтеру
        if (ttnData?.updatedNPDeliveries && ttnData.updatedNPDeliveries.length > 0) {
          const completedNPDeliveries = updatedDeliveries.filter(d => isNPDelivery(d));
          const allClients = Array.from(new Set(completedNPDeliveries.map(d => d.client).filter(Boolean))).join(", ");
          const allTtns = Array.from(new Set(completedNPDeliveries.map(d => d.ttn).filter(Boolean))).join(", ");
          setSendAccountantPromptData({
            deliveries: completedNPDeliveries,
            delivery: completedNPDeliveries[0],
            client: allClients,
            ttn: allTtns,
            count: completedNPDeliveries.length,
            isCO: false
          });
        } else if (status === "Виконано" && coDeliveries.length > 0) {
          // Якщо оновлювалися доставки з ЦО (без ТТН)
          const completedCODeliveries = updatedDeliveries.filter(d => coDeliveries.some(cd => cd.id === d.id));
          const allClients = Array.from(new Set(completedCODeliveries.map(d => d.client).filter(Boolean))).join(", ");
          setSendAccountantPromptData({
            deliveries: completedCODeliveries,
            delivery: completedCODeliveries[0],
            client: allClients,
            isCO: true,
            count: completedCODeliveries.length
          });
        }
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
              <LineOfBusinessFilter />
            </div>
          )}
        </>
      )}
      <div className={css.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px' }}>Доставки ({filteredDeliveries.length})</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className={css.actionBtn}
            onClick={() => setIsExportModalOpen(true)}
            title="Експорт в Excel або Друк відфільтрованих доставок"
          >
            <Download size={14} /> / <Printer size={14} />
          </button>

          {selectedDeliveries.length > 1 && (
            <>
              <button 
                className={`${css.batchBtn} ${css.batchBtnGreen}`}
                onClick={() => setIsBatchStatusModalOpen(true)}
              >
                🔄 Статус
              </button>
              <button 
                className={`${css.batchBtn} ${css.batchBtnBlue}`}
                onClick={() => { setIsBatchDateModalOpen(true); setNewBatchDate(""); }}
              >
                📅 Дата
              </button>
              <button 
                className={`${css.batchBtn} ${css.batchBtnPurple}`}
                onClick={() => clearSelectedDeliveries()}
              >
                Скинути
              </button>
            </>
          )}
        </div>
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
                style={{ background: 'var(--warning-color)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer' }}
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
                style={{ flex: 1, padding: '10px', background: 'var(--action-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
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

      <BatchTTNModal
        isOpen={!!batchTtnModalData}
        npDeliveries={batchTtnModalData?.npDeliveries || []}
        onClose={() => setBatchTtnModalData(null)}
        onSubmit={(ttnData) => {
          if (batchTtnModalData) {
            const prev = batchTtnModalData;
            setBatchTtnModalData(null);
            handleBatchUpdate(prev.status, prev.date, ttnData);
          }
        }}
      />

      <SendAccountantConfirmModal
        isOpen={!!sendAccountantPromptData}
        isCO={sendAccountantPromptData?.isCO}
        ttn={sendAccountantPromptData?.ttn}
        clientName={sendAccountantPromptData?.client || sendAccountantPromptData?.delivery?.client}
        deliveriesCount={sendAccountantPromptData?.deliveries?.length || (sendAccountantPromptData?.delivery ? 1 : 0)}
        onConfirm={() => {
          if (sendAccountantPromptData) {
            const list = sendAccountantPromptData.deliveries || (sendAccountantPromptData.delivery ? [sendAccountantPromptData.delivery] : []);
            setSelectedDeliveries(list.map(d => ({ ...d, status: "Виконано" })));
            setIsEditDeliveryModalOpen(true);
            setSendAccountantPromptData(null);
          }
        }}
        onCancel={() => setSendAccountantPromptData(null)}
      />

      <ExportPrintModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        dataType="deliveries"
        deliveriesData={filteredDeliveries}
        filtersInfo={{
          managers: selectedManagers,
          lobs: selectedLoBs,
          statuses: selectedStatuses,
          dates: selectedDates
        }}
      />
    </div>
  );
}

