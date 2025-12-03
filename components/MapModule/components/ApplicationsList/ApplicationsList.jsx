import css from "./ApplicationsList.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";
import { useRef, useEffect } from "react";
import ManagerFilter from "../ManagerFilter/ManagerFilter";

export default function ApplicationsList({ onClose, onFlyTo, onAddClient }) {
  const { applications, unmappedApplications, setSelectedClient, selectedManager } = useApplicationsStore();
  const letterRefs = useRef({});

  const filteredApplications = selectedManager 
    ? applications.filter(item => item.address?.manager === selectedManager)
    : applications;

  const filteredUnmappedApplications = (selectedManager
    ? unmappedApplications.filter(item => item.orders?.[0]?.manager === selectedManager)
    : unmappedApplications).sort((a, b) => a.client.localeCompare(b.client, 'uk'));

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

  const handleItemClick = (item) => {
    console.log('Item clicked:', item.address.latitude, item.address.longitude);
    setSelectedClient(item);
    if (onFlyTo) {
      console.log('Calling onFlyTo');
      onFlyTo(item.address.latitude, item.address.longitude);
    } else {
      console.log('onFlyTo is missing');
    }
    if (onClose) onClose();
  };
  console.log("Applications:",applications)
console.log("Unmapped applications:",unmappedApplications)
  return (
    <div className={css.container}>
      <ManagerFilter/>
      <div className={css.header}>
        <h3>Список заявок ({filteredApplications.length}) | Без адреси: {filteredUnmappedApplications.length}</h3>
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
            {items.map((item) => (
          <div 
            key={item.client} 
            className={css.item}
            onClick={() => handleItemClick(item)}
          >
            <div className={css.clientName}>{item.client}</div>
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
                <div className={css.clientName}>{item.client}</div>
                <div className={css.clientName}>{item.orders[0].manager}</div>
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
