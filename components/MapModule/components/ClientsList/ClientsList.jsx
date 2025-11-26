import css from "./ClientsList.module.css";
import { useRef } from "react";

export default function ClientsList({ clients, onClose, onFlyTo, onClientSelect }) {
  const letterRefs = useRef({});

  // Украинский алфавит
  const alphabet = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'.split('');

  // Группируем клиентов по первой букве
  const sortedClients = [...clients].sort((a, b) => a.client.localeCompare(b.client, 'uk'));
  
  const groupedByLetter = {};
  sortedClients.forEach(item => {
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
    console.log('Client clicked:', item.latitude, item.longitude);
    if (onFlyTo) {
      onFlyTo(item.latitude, item.longitude);
    }
    if (onClose) onClose();
    if (onClientSelect) onClientSelect(item);
  };

  return (
    <div className={css.container}>
      <div className={css.header}>
        <h3>Список контрагентів ({clients.length})</h3>
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
            className={css.item}
            onClick={() => handleItemClick(item)}
          >
            <div className={css.clientName}>{item.client}</div>
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
