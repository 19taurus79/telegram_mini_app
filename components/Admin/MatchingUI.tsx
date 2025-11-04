'use client';

import { MatchingData, MovedItem, NoteItem } from '@/types/types';
import { useState, useMemo } from 'react';
import styles from './MatchingUI.module.css';
import axios from 'axios'; // Import axios
import toast from 'react-hot-toast'; // Import toast

interface MatchingUIProps {
  data: MatchingData;
}

interface Matches {
  [leftoverId: string]: {
    movedIndex: number | null;
    noteIndices: number[];
  };
}

const MatchingUI: React.FC<MatchingUIProps> = ({ data }) => {
  const { session_id, leftovers } = data;
  const [matches, setMatches] = useState<Matches>(
    Object.keys(leftovers).reduce((acc, key) => ({ ...acc, [key]: { movedIndex: null, noteIndices: [] } }), {})
  );
  const [hiddenLeftovers, setHiddenLeftovers] = useState<string[]>([]);

  const handleMatchChange = (
    leftoverId: string,
    type: 'moved' | 'note',
    index: number
  ) => {
    setMatches(prev => {
      const newMatches = { ...prev };
      if (type === 'moved') {
        newMatches[leftoverId] = {
          ...newMatches[leftoverId],
          movedIndex: newMatches[leftoverId].movedIndex === index ? null : index,
        };
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

  const handleSubmit = async (leftoverId: string) => {
    const currentMatch = matches[leftoverId];
    if (currentMatch.movedIndex === null || currentMatch.noteIndices.length === 0) {
      toast.error('Пожалуйста, выберите перемещение и хотя бы один заказ для сопоставления.');
      return;
    }

    const payload = {
      session_id: session_id,
      request_id: leftoverId,
      selected_moved_indices: [currentMatch.movedIndex],
      selected_notes_indices: currentMatch.noteIndices,
    };

    try {
      const response = await axios.post(`/process/${session_id}/manual_match`, payload);
      console.log('Сопоставление успешно отправлено:', response.data);
      toast.success('Сопоставление успешно отправлено!');
      setHiddenLeftovers(prev => [...prev, leftoverId]);
    } catch (error) {
      console.error('Ошибка при отправке сопоставления:', error);
      toast.error('Ошибка при отправке сопоставления. Пожалуйста, попробуйте еще раз.');
    }
  };

  const sums = useMemo(() => {
    return Object.entries(matches).reduce((acc, [leftoverId, match]) => {
      const leftover = leftovers[leftoverId];
      const movedSum = match.movedIndex !== null 
        ? leftover.current_moved.find(m => m.index === match.movedIndex)?.Перемещено || 0
        : 0;
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
    </div>
  );
};

export default MatchingUI;
