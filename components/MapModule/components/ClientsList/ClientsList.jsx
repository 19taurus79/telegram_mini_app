import css from "./ClientsList.module.css";
import { useRef } from "react";
import ManagerFilter from "../ManagerFilter/ManagerFilter";
import { useApplicationsStore } from "../../store/applicationsStore";

export default function ClientsList({ clients, onClose, onFlyTo, onClientSelect, onAddClient }) {
  const letterRefs = useRef({});
  const { 
    selectedManagers, 
    deliveries,
    multiSelectedItems,
    selectionType,
    toggleMultiSelectedItem
  } = useApplicationsStore();

  // Filter clients based on selected managers
  const filteredClients = selectedManagers.length > 0
    ? clients.filter(client => selectedManagers.includes(client.manager))
    : clients;

  // Украинский алфавит
  const alphabet = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'.split('');

  // Группируем клиентов по первой букве
  const sortedClients = [...filteredClients].sort((a, b) => {
    const clientA = a.client || "";
    const clientB = b.client || "";
    return clientA.localeCompare(clientB, 'uk');
  });
  
  const groupedByLetter = {};
  sortedClients.forEach(item => {
    const clientName = item.client || "";
    const firstLetter = clientName.length > 0 ? clientName[0].toUpperCase() : "#";
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
        // Получаем позицию элемента относительно начала контейнера
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Вычисляем на сколько нужно прокрутить
        const scrollOffset = elementRect.top - containerRect.top + container.scrollTop;
        
        container.scrollTo({
          top: scrollOffset - 10, // Небольшой отступ сверху
          behavior: 'smooth'
        });
      }
    }
  };

  const handleItemClick = (item, e) => {
    const isMultiClick = e && (e.ctrlKey || e.metaKey);
    if (isMultiClick) {
      toggleMultiSelectedItem(item, 'clients');
    } else {
      console.log('Client clicked:', item.latitude, item.longitude);
      if (onFlyTo) {
        onFlyTo(item.latitude, item.longitude);
      }
      if (onClose) onClose();
      if (onClientSelect) onClientSelect(item);
    }
  };

  const isMultiSelected = (item) => {
    return selectionType === 'clients' && multiSelectedItems.some(i => i.client === item.client);
  };

  return (
    <div className={css.container}>
      <ManagerFilter />
      <div className={css.header}>
        <h3>Список контрагентів ({filteredClients.length})</h3>
        {onAddClient && (
          <button className={css.addButton} onClick={onAddClient}>
            + Додати клієнта
          </button>
        )}
      </div>
      
      {/* Алфавитный указатель */}
      <div className={css.alphabetIndex}>
        {alphabet
          .filter(letter => groupedByLetter[letter]) // Показываем только буквы с данными
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
            {items.map((item, index) => (
          <div 
            key={`${item.client}-${index}`} 
            className={`${css.item} ${isMultiSelected(item) ? css.itemSelected : ''}`}
            onClick={(e) => handleItemClick(item, e)}
          >
            <div className={css.clientName}>
              {item.client}
              {deliveries.some(d => d.client === item.client) && <span title="Вже у доставці"> 🚚</span>}
            </div>
            <div className={css.address}>
              {item.region} обл., {item.city}
            </div>
            <div className={css.details}>
              Менеджер: {item.manager}
            </div>
          </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
