'use client';

import { MatchingData, MovedItem, NoteItem } from '@/types/types';
import { useState, useMemo, useEffect } from 'react';
import styles from './MatchingUI.module.css';
import axios from 'axios';
import toast from 'react-hot-toast';

interface MatchingUIProps {
  data: MatchingData;
  onAllMatched: () => void;
}

interface Matches {
  [leftoverId: string]: {
    movedIndices: number[];
    movedQuantities: { [index: number]: number };
    noteIndices: number[];
  };
}

const MatchingUI: React.FC<MatchingUIProps> = ({ data, onAllMatched }) => {
  const { session_id, leftovers } = data;

  const [matches, setMatches] = useState<Matches>(
    Object.keys(leftovers).reduce((acc, key) => ({ ...acc, [key]: { movedIndices: [], movedQuantities: {}, noteIndices: [] } }), {})
  );
  
  // Стан для успішно зіставлених елементів
  const [hiddenLeftovers, setHiddenLeftovers] = useState<string[]>([]);
  // Новий стан для пропущених елементів
  const [skippedLeftovers, setSkippedLeftovers] = useState<string[]>([]);

  // Обчислюємо видимі елементи, виключаючи і зіставлені, і пропущені
  const visibleLeftovers = useMemo(() => 
    Object.keys(leftovers).filter(key => !hiddenLeftovers.includes(key) && !skippedLeftovers.includes(key)),
    [leftovers, hiddenLeftovers, skippedLeftovers]
  );

  // Ефект, який спрацьовує, коли більше немає видимих елементів
  useEffect(() => {
    if (Object.keys(leftovers).length > 0 && visibleLeftovers.length === 0) {
      toast.success('Всі елементи оброблено!');
      onAllMatched();
    }
  }, [visibleLeftovers, leftovers, onAllMatched]);

  const handleMatchChange = (
    leftoverId: string,
    type: 'moved' | 'note',
    index: number
  ) => {
    setMatches(prev => {
      const newMatches = { ...prev };
      if (type === 'moved') {
        const currentMoved = newMatches[leftoverId].movedIndices;
        const currentQuantities = newMatches[leftoverId].movedQuantities;
        
        if (currentMoved.includes(index)) {
          // Deselecting
          const restQuantities = { ...currentQuantities };
          delete restQuantities[index];
          newMatches[leftoverId] = {
            ...newMatches[leftoverId],
            movedIndices: currentMoved.filter(i => i !== index),
            movedQuantities: restQuantities,
          };
        } else {
          // Selecting
          const item = leftovers[leftoverId].current_moved.find(m => m.index === index);
          newMatches[leftoverId] = {
            ...newMatches[leftoverId],
            movedIndices: [...currentMoved, index],
            movedQuantities: {
              ...currentQuantities,
              [index]: item ? item.Перемещено : 0
            },
          };
        }
      } else {
        const currentNotes = newMatches[leftoverId].noteIndices;
        if (currentNotes.includes(index)) {
          newMatches[leftoverId] = {
            ...newMatches[leftoverId],
            noteIndices: currentNotes.filter(i => i !== index),
          };
        } else {
          newMatches[leftoverId] = {
            ...newMatches[leftoverId],
            noteIndices: [...currentNotes, index],
          };
        }
      }
      return newMatches;
    });
  };

  const handleQuantityChange = (
    leftoverId: string,
    index: number,
    value: number
  ) => {
    setMatches(prev => ({
      ...prev,
      [leftoverId]: {
        ...prev[leftoverId],
        movedQuantities: {
          ...prev[leftoverId].movedQuantities,
          [index]: value
        }
      }
    }));
  };

  const handleSubmit = async (leftoverId: string) => {
    const currentMatch = matches[leftoverId];
    if (currentMatch.movedIndices.length === 0 || currentMatch.noteIndices.length === 0) {
      toast.error('Будь ласка, виберіть хоча б одне переміщення та хоча б одне замовлення для співставлення.');
      return;
    }

    const selectedMovedItems = currentMatch.movedIndices.map(index => {
      return {
        index: index,
        quantity: currentMatch.movedQuantities[index] || 0
      };
    });

    const payload = {
      request_id: leftoverId,
      selected_moved_items: selectedMovedItems,
      selected_notes_indices: currentMatch.noteIndices,
    };

    try {
      await axios.post(`/process/${session_id}/manual_match`, payload);
      toast.success('Співставлення успішно відправлено!');
      setHiddenLeftovers(prev => [...prev, leftoverId]);
    } catch (error) {
      console.error('Помилка при відправці співставлення:', error);
      toast.error('Помилка при відправці співставлення.');
    }
  };

  // Нова функція для пропуску одного елемента (тільки на фронтенді)
  const handleSkipItem = (leftoverId: string) => {
    setSkippedLeftovers(prev => [...prev, leftoverId]);
    toast.success(`Зіставлення для ${leftovers[leftoverId].product} пропущено.`);
  };

  // Нова функція для пропуску всіх видимих елементів
  const handleSkipAll = () => {
    setSkippedLeftovers(prev => [...prev, ...visibleLeftovers]);
    toast.success('Всі видимі зіставлення пропущені.');
  };

  const sums = useMemo(() => {
    return Object.entries(matches).reduce((acc, [leftoverId, match]) => {
      const leftover = leftovers[leftoverId];

      const movedSum = match.movedIndices.reduce((sum, movedIndex) => {
        return sum + (match.movedQuantities[movedIndex] || 0);
      }, 0);
      const notesSum = match.noteIndices.reduce((sum, noteIndex) => {
        const note = leftover.current_notes.find(n => n.index === noteIndex);
        return sum + (note?.Количество_в_примечании || 0);
      }, 0);
      
      acc[leftoverId] = { movedSum, notesSum };
      return acc;
    }, {} as { [key: string]: { movedSum: number, notesSum: number } });
  }, [matches, leftovers]);

  if (Object.keys(leftovers).length === 0) {
    return (
      <div className={styles.container}>
          <div className={styles.noMatchedWrapper}>
        <p>Немає елементів для ручного співставлення.</p>
        <button onClick={onAllMatched} className={styles.submitBtn} style={{ marginTop: '20px' }}>
          Продовжити завантаження
        </button>
          </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {Object.keys(leftovers).map((leftoverId) => {
        // Рендеримо компонент тільки якщо він не прихований і не пропущений
        if (hiddenLeftovers.includes(leftoverId) || skippedLeftovers.includes(leftoverId)) {
          return null;
        }
        const leftover = leftovers[leftoverId];
        return (
          <div key={leftoverId} className={styles.leftoverContainer}>
            <h3 className={styles.productTitle}>{leftover.product}</h3>
            <div className={styles.columns}>
              <div className={styles.column}>
                <h3>Перемещения</h3>
                {leftover.current_moved.map((item: MovedItem) => (
                  <div 
                    key={item.index} 
                    className={`${styles.item} ${matches[leftoverId]?.movedIndices.includes(item.index) ? styles.selected : ''}`}
                    onClick={() => handleMatchChange(leftoverId, 'moved', item.index)}
                  >
                    <p><strong>Номенклатура:</strong> {item.Номенклатура}</p>
                    <p><strong>Переміщено:</strong> {item.Перемещено}</p>
                    <p><strong>Партія:</strong> {item['Партія номенклатури']}</p>
                    {matches[leftoverId]?.movedIndices.includes(item.index) && (
                      <div className={styles.quantityInput} onClick={(e) => e.stopPropagation()}>
                        <label>Кількість для списання:</label>
                        <input
                          type="number"
                          value={matches[leftoverId].movedQuantities[item.index] || ''}
                          onChange={(e) => handleQuantityChange(leftoverId, item.index, parseFloat(e.target.value))}
                          className={styles.input}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className={styles.column}>
                <h3>Замовлення</h3>
                {leftover.current_notes.map((item: NoteItem) => (
                  <div 
                    key={item.index} 
                    className={`${styles.item} ${matches[leftoverId]?.noteIndices.includes(item.index) ? styles.selected : ''}`}
                    onClick={() => handleMatchChange(leftoverId, 'note', item.index)}
                  >
                    <p><strong>Доповнення:</strong> {item.Договор}</p>
                    <p><strong>Кількість:</strong> {item.Количество_в_примечании}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.summary}>
              Сума по заказах: {sums[leftoverId]?.notesSum || 0} / Переміщено: {sums[leftoverId]?.movedSum || 0}
            </div>
            <div className={styles.buttonGroup}>
              <button onClick={() => handleSubmit(leftoverId)} className={styles.submitBtn}>
                Зберегти
              </button>
              <button onClick={() => handleSkipItem(leftoverId)} className={styles.skipBtn}>
                Пропустить
              </button>
            </div>
          </div>
        )
      })}
      
      {visibleLeftovers.length > 0 && (
        <button onClick={handleSkipAll} className={styles.skipAllBtn}>
          Пропустить все
        </button>
      )}
    </div>
  );
};

export default MatchingUI;
