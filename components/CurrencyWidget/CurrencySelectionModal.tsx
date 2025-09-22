"use client";

import { useState, useEffect } from 'react';
import css from './CurrencySelectionModal.module.css';

interface Rate {
  rate: number;
  cc: string;
  txt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allCurrencies: Rate[];
  selectedCurrencies: string[];
  onSave: (selection: string[]) => void;
}

const CurrencySelectionModal = ({ isOpen, onClose, allCurrencies, selectedCurrencies, onSave }: Props) => {
  const [currentSelection, setCurrentSelection] = useState(selectedCurrencies);

  useEffect(() => {
    setCurrentSelection(selectedCurrencies);
  }, [selectedCurrencies]);

  if (!isOpen) {
    return null;
  }

  const handleCheckboxChange = (cc: string) => {
    setCurrentSelection(prev => 
      prev.includes(cc) ? prev.filter(c => c !== cc) : [...prev, cc]
    );
  };

  const handleSave = () => {
    onSave(currentSelection);
  };

  return (
    <div className={css.backdrop} onClick={onClose}>
      <div className={css.modal} onClick={e => e.stopPropagation()}>
        <div className={css.header}>
          <h4>Оберіть валюти</h4>
          <button onClick={onClose} className={css.closeButton}>&times;</button>
        </div>
        <div className={css.listContainer}>
          {allCurrencies.map(currency => (
            <label key={currency.cc} className={css.listItem}>
              <input 
                type="checkbox" 
                checked={currentSelection.includes(currency.cc)}
                onChange={() => handleCheckboxChange(currency.cc)}
              />
              {currency.txt} ({currency.cc})
            </label>
          ))}
        </div>
        <div className={css.footer}>
          <button onClick={handleSave} className={css.saveButton}>Зберегти</button>
        </div>
      </div>
    </div>
  );
};

export default CurrencySelectionModal;
