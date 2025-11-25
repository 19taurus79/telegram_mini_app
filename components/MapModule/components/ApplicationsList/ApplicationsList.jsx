import css from "./ApplicationsList.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";
import { useRef, useEffect } from "react";

export default function ApplicationsList({ onClose, onFlyTo }) {
  const { applications, setSelectedClient } = useApplicationsStore();
  const letterRefs = useRef({});

  // Украинский алфавит
  const alphabet = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'.split('');

  // Группируем клиентов по первой букве
  const sortedApplications = applications.sort((a, b) => a.client.localeCompare(b.client, 'uk'));
  
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

  return (
    <div className={css.container}>
      <div className={css.header}>
        <h3>Список заявок ({applications.length})</h3>
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
      </div>
    </div>
  );
}
