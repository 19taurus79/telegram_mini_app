'use client';

import { MatchingData, MovedItem, NoteItem } from '@/types/types';
import { useState, useMemo, useEffect } from 'react';
import styles from './MatchingUI.module.css';
import axios from 'axios';
import toast from 'react-hot-toast';

// Определяем пропсы для компонента.
interface MatchingUIProps {
  // 'data' содержит session_id и объект leftovers для сопоставления.
  data: MatchingData;
  // Функция обратного вызова, которая будет вызвана, когда все элементы будут сопоставлены.
  onAllMatched: () => void;
}

// Структура для хранения выбранных сопоставлений.
interface Matches {
  [leftoverId: string]: {
    movedIndex: number | null; // Индекс выбранного элемента 'перемещения'.
    noteIndices: number[]; // Массив индексов выбранных элементов 'заказа'.
  };
}

/**
 * MatchingUI - компонент для ручного сопоставления данных.
 * Позволяет пользователю выбирать элементы из двух списков и отправлять сопоставления по одному.
 */
const MatchingUI: React.FC<MatchingUIProps> = ({ data, onAllMatched }) => {
  const { session_id, leftovers } = data;

  // Состояние для хранения текущих выборов пользователя для каждого блока сопоставления.
  const [matches, setMatches] = useState<Matches>(
    // Инициализируем состояние пустыми значениями для каждого leftover.
    Object.keys(leftovers).reduce((acc, key) => ({ ...acc, [key]: { movedIndex: null, noteIndices: [] } }), {})
  );
  // Состояние для хранения ID сопоставленных блоков, чтобы скрыть их из UI.
  const [hiddenLeftovers, setHiddenLeftovers] = useState<string[]>([]);
  // Флаг, чтобы убедиться, что финальное уведомление и колбэк вызываются только один раз.
  const [allMatched, setAllMatched] = useState(false);

  // Хук для отслеживания завершения всех сопоставлений.
  useEffect(() => {
    const totalLeftovers = Object.keys(leftovers).length;
    // Проверяем, если количество скрытых блоков равно общему количеству и процесс еще не был отмечен как завершенный.
    if (totalLeftovers > 0 && hiddenLeftovers.length === totalLeftovers && !allMatched) {
      toast.success('Все элементы успешно сопоставлены!');
      setAllMatched(true);
      onAllMatched(); // Вызываем колбэк родительского компонента для запуска следующего этапа.
    }
  }, [hiddenLeftovers, leftovers, allMatched, onAllMatched]);

  /**
   * Обработчик выбора/снятия выбора с элемента.
   * @param leftoverId - ID текущего блока сопоставления.
   * @param type - Тип элемента ('moved' или 'note').
   * @param index - Индекс выбранного элемента.
   */
  const handleMatchChange = (
    leftoverId: string,
    type: 'moved' | 'note',
    index: number
  ) => {
    setMatches(prev => {
      const newMatches = { ...prev };
      if (type === 'moved') { // Логика для 'перемещений' (одиночный выбор).
        newMatches[leftoverId] = {
          ...newMatches[leftoverId],
          movedIndex: newMatches[leftoverId].movedIndex === index ? null : index, // Повторный клик снимает выбор.
        };
      } else { // Логика для 'заказов' (множественный выбор).
        const currentNotes = newMatches[leftoverId].noteIndices;
        if (currentNotes.includes(index)) {
          // Если элемент уже выбран, удаляем его из массива (снятие выбора).
          newMatches[leftoverId] = {
            ...newMatches[leftoverId],
            noteIndices: currentNotes.filter(i => i !== index),
          };
        } else {
          // Если элемент не выбран, добавляем его в массив.
          newMatches[leftoverId] = {
            ...newMatches[leftoverId],
            noteIndices: [...currentNotes, index],
          };
        }
      }
      return newMatches;
    });
  };

  /**
   * Обработчик отправки сопоставления для одного блока.
   * @param leftoverId - ID блока, для которого отправляется сопоставление.
   */
  const handleSubmit = async (leftoverId: string) => {
    const currentMatch = matches[leftoverId];
    // Проверка, что выбраны оба типа элементов.
    if (currentMatch.movedIndex === null || currentMatch.noteIndices.length === 0) {
      toast.error('Пожалуйста, выберите перемещение и хотя бы один заказ для сопоставления.');
      return;
    }

    // Формируем тело запроса согласно требованиям бэкенда.
    const payload = {
      session_id: session_id,
      request_id: leftoverId,
      selected_moved_indices: [currentMatch.movedIndex],
      selected_notes_indices: currentMatch.noteIndices,
    };

    try {
      // Отправляем сопоставление на бэкенд.
      await axios.post(`/process/${session_id}/manual_match`, payload);
      toast.success('Сопоставление успешно отправлено!');
      // Добавляем ID в список скрытых, чтобы запустить анимацию скрытия.
      setHiddenLeftovers(prev => [...prev, leftoverId]);
    } catch (error) {
      console.error('Ошибка при отправке сопоставления:', error);
      toast.error('Ошибка при отправке сопоставления. Пожалуйста, попробуйте еще раз.');
    }
  };

  // Мемоизированный расчет сумм для выбранных элементов.
  const sums = useMemo(() => {
    return Object.entries(matches).reduce((acc, [leftoverId, match]) => {
      const leftover = leftovers[leftoverId];
      // Сумма для выбранного элемента 'перемещения'.
      const movedSum = match.movedIndex !== null 
        ? leftover.current_moved.find(m => m.index === match.movedIndex)?.Перемещено || 0
        : 0;
      // Сумма для всех выбранных элементов 'заказа'.
      const notesSum = match.noteIndices.reduce((sum, noteIndex) => {
        const note = leftover.current_notes.find(n => n.index === noteIndex);
        return sum + (note?.Количество_в_примечании || 0);
      }, 0);
      
      acc[leftoverId] = { movedSum, notesSum };
      return acc;
    }, {} as { [key: string]: { movedSum: number, notesSum: number } });
  }, [matches, leftovers]);

  return (
    <div className={styles.container}>
      {Object.entries(leftovers).map(([leftoverId, leftover]) => (
        <div 
          key={leftoverId} 
          className={`${styles.leftoverContainer} ${hiddenLeftovers.includes(leftoverId) ? styles.hidden : ''}`}>
          <h3 className={styles.productTitle}>{leftover.product}</h3>
          <div className={styles.columns}>
            <div className={styles.column}>
              <h3>Перемещения</h3>
              {leftover.current_moved.map((item: MovedItem) => (
                <div 
                  key={item.index} 
                  className={`${styles.item} ${matches[leftoverId]?.movedIndex === item.index ? styles.selected : ''}`}
                  onClick={() => handleMatchChange(leftoverId, 'moved', item.index)}
                >
                  <p><strong>Номенклатура:</strong> {item.Номенклатура}</p>
                  <p><strong>Перемещено:</strong> {item.Перемещено}</p>
                  <p><strong>Партія:</strong> {item['Партія номенклатури']}</p>
                </div>
              ))}
            </div>
            <div className={styles.column}>
              <h3>Заказы</h3>
              {leftover.current_notes.map((item: NoteItem) => (
                <div 
                  key={item.index} 
                  className={`${styles.item} ${matches[leftoverId]?.noteIndices.includes(item.index) ? styles.selected : ''}`}
                  onClick={() => handleMatchChange(leftoverId, 'note', item.index)}
                >
                  <p><strong>Договор:</strong> {item.Договор}</p>
                  <p><strong>Количество:</strong> {item.Количество_в_примечании}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.summary}>
            Сумма по заказам: {sums[leftoverId]?.notesSum || 0} / Перемещено: {sums[leftoverId]?.movedSum || 0}
          </div>
          <button onClick={() => handleSubmit(leftoverId)} className={styles.submitBtn}>
            Сохранить сопоставления для {leftoverId}
          </button>
        </div>
      ))}
      {/* Кнопка для возврата к форме загрузки появляется только после сопоставления всех элементов. */}
      {allMatched && (
        <button onClick={onAllMatched} className={styles.submitBtn} style={{ marginTop: '20px' }}>
          Завершить и загрузить остальные файлы
        </button>
      )}
    </div>
  );
};

export default MatchingUI;
