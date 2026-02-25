import css from "./ApplicationsList.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";
import { useRef, useEffect, useState } from "react";
import ManagerFilter from "../ManagerFilter/ManagerFilter";
import LineOfBusinessFilter from "../LineOfBusinessFilter/LineOfBusinessFilter";
import { ChevronDown } from "lucide-react";

export default function ApplicationsList({ onClose, onFlyTo, onAddClient }) {
  const { applications, unmappedApplications, setSelectedClient, selectedManager, selectedLoB, deliveries } = useApplicationsStore();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const letterRefs = useRef({});

  const cleanClient = (c) => (c || "").trim().toLowerCase();

  const getProductName = (item) => {
    const parts = [item.nomenclature];
    if (item.party_sign && item.party_sign.trim() !== "") {
      parts.push(item.party_sign.trim());
    }
    if (item.buying_season && item.buying_season.trim() !== "") {
      parts.push(item.buying_season.trim());
    }
    return parts.join(" ").trim();
  };

  const isInDelivery = (order, deliveries) => {
    if (!deliveries || deliveries.length === 0) return false;
    const currentName = getProductName(order);
    const sClient = (order.client || "").trim().toLowerCase();
    
    return deliveries.some(d => {
      const dClient = (d.client || "").trim().toLowerCase();
      return dClient === sClient && 
             ["Створено", "В роботі", "created"].includes(d.status) &&
             d.items?.some(di => 
               di.order_ref?.trim() === order.contract_supplement?.trim() && 
               di.product?.trim() === currentName
             );
    });
  };

  const getDeliveryStatus = (item) => {
    // Check if any order of this client is in delivery
    const hasAnyInDelivery = item.orders?.some(order => isInDelivery(order, deliveries));
    return hasAnyInDelivery ? 'full' : null;
  };

  const renderClientName = (item) => {
    const status = getDeliveryStatus(item);
    return (
      <div className={css.clientName}>
        {item.client}
        {status === 'full' && <span title="Вже у доставці"> 🚚</span>}
      </div>
    );
  };

  const filterItem = (item) => {
    const matchesManager = !selectedManager || (item.address?.manager === selectedManager || item.orders?.[0]?.manager === selectedManager);
    const matchesLoB = !selectedLoB || item.orders?.some(order => order.line_of_business === selectedLoB);
    return matchesManager && matchesLoB;
  };

  const filteredApplications = applications.filter(filterItem);
  const filteredUnmappedApplications = unmappedApplications.filter(filterItem).sort((a, b) => a.client.localeCompare(b.client, 'uk'));

  // Украинский алфавит
  const alphabet = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'.split('');

  // Группируем клиентов по первой букве
  const sortedApplications = filteredApplications.sort((a, b) => a.client.localeCompare(b.client, 'uk'));
  
  const groupedByLetter = {};
  sortedApplications.forEach(item => {
    const firstLetter = item.client[0].toUpperCase();
    if (!groupedByLetter[firstLetter]) {
      groupedByLetter[firstLetter] = [];
    }
    groupedByLetter[firstLetter].push(item);
  });

  const scrollToLetter = (letter) => {
    if (letterRefs.current[letter]) {
      const element = letterRefs.current[letter];
      const container = element.closest(`.${css.list}`);
      
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const scrollOffset = elementRect.top - containerRect.top + container.scrollTop;
        
        container.scrollTo({
          top: scrollOffset - 10,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleItemClick = (item) => {
    setSelectedClient(item);
    if (onFlyTo) {
      onFlyTo(item.address.latitude, item.address.longitude);
    }
    if (onClose) onClose();
  };

  return (
    <div className={css.container}>
      <div className={css.accordionContainer}>
        <div 
          className={css.accordionHeader} 
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
        >
          <span>Фільтри</span>
          <ChevronDown className={`${css.accordionIcon} ${isFiltersOpen ? css.open : ''}`} size={18} />
        </div>
        <div className={`${css.accordionContent} ${isFiltersOpen ? css.open : ''}`}>
          <div className={css.filterLabel}>Менеджер</div>
          <ManagerFilter />
          <div className={css.filterLabel}>Вид діяльності</div>
          <LineOfBusinessFilter />
        </div>
      </div>
      <div className={css.header}>
        <h3>Список заявок ({filteredApplications.length}) | Без адреси: {filteredUnmappedApplications.length}</h3>
      </div>
      
      {/* Алфавитный указатель */}
      <div className={css.alphabetIndex}>
        {alphabet
          .filter(letter => groupedByLetter[letter])
          .map(letter => (
          <button
            key={letter}
            className={css.letterBtn}
            onClick={() => scrollToLetter(letter)}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className={css.list}>
        {Object.entries(groupedByLetter).map(([letter, items]) => (
          <div key={letter}>
            <div 
              ref={el => letterRefs.current[letter] = el}
              className={css.letterHeader}
            >
              {letter}
            </div>
            {items.map((item) => (
              <div 
                key={item.client} 
                className={css.item}
                onClick={() => handleItemClick(item)}
              >
                {renderClientName(item)}
                <div className={css.address}>
                  {item.address.city}, {item.address.area}
                </div>
                <div className={css.count}>
                  Заявок: {item.count}
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Секция для заявок без адреса */}
        {filteredUnmappedApplications.length > 0 && (
          <div className={css.unmappedSection}>
            <div className={css.letterHeader} style={{ backgroundColor: '#ffebee', color: '#d32f2f' }}>
              Без адреси ({filteredUnmappedApplications.length})
            </div>
            {filteredUnmappedApplications.map((item) => (
              <div 
                key={item.client} 
                className={css.item}
                style={{ borderLeft: '4px solid #f44336', cursor: 'pointer' }}
                onClick={() => {
                  if (onAddClient) {
                    onAddClient({
                      client: item.client,
                      manager: item.orders?.[0]?.manager || ""
                    });
                    if (onClose) onClose();
                  }
                }}
                title="Натисніть, щоб додати адресу клієнта"
              >
                {renderClientName(item)}
                <div className={css.clientName}>{item.orders[0]?.manager}</div>
                <div className={css.address} style={{ fontStyle: 'italic', color: '#666' }}>
                  Адреса не знайдена в довіднику
                </div>
                <div className={css.count}>
                  Заявок: {item.count}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
