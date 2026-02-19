"use client";

import { useEffect, useState } from 'react';

const printStyles = `
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 20px; color: #333; }
table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
h2 { text-align: center; }
h3 { margin-top: 20px; margin-bottom: 10px; background: #f5f5f5; padding: 5px; font-size: 14px; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4; margin: 15mm; }
}
`;

interface OrderItem {
  id: string; // Assuming id is used for key
  contract_supplement: string;
  nomenclature: string;
  different: number;
}

interface ClientData {
  client: string;
  manager: string;
  totalWeight: number;
  count: number;
  orders: OrderItem[];
}

interface ManagerGroupedData {
  manager: string;
  clients: ClientData[];
  totalWeight: number;
  totalCount: number;
}

interface SelectionSummary {
  groupedData: ManagerGroupedData[];
  totalWeight: number;
  totalCount: number;
  totalClients: number;
}

export default function PrintView() {
  const [summary, setSummary] = useState<SelectionSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('printData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setSummary(parsedData);
        sessionStorage.removeItem('printData');
      } else {
        setError("Нет данных для печати. Пожалуйста, вернитесь на карту и попробуйте снова.");
      }
    } catch (e) {
      console.error("Failed to parse print data:", e);
      setError("Произошла ошибка при чтении данных для печати.");
    }
  }, []); // Run only once

  useEffect(() => {
    if (summary) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [summary]);

  if (error) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>{error}</div>;
  }

  if (!summary) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка документа для печати...</div>;
  }
  
  const selectionSummary = summary;

  return (
    <>
      <style>{printStyles}</style>
      <div id="print-view">
        <h2>Зведення по виділенню</h2>
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px', textAlign: 'center' }}>
            Всього клієнтів: <strong>{selectionSummary.totalClients}</strong> | 
            Всього заявок: <strong>{selectionSummary.totalCount}</strong> | 
            Загальна вага: <strong>{selectionSummary.totalWeight.toFixed(2)} кг</strong>
        </div>
        {selectionSummary.groupedData.map(managerData => (
        <div key={managerData.manager}>
            <h3>{managerData.manager}</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
                <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Клієнт</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Деталі замовлення</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Всього</th>
                </tr>
            </thead>
            <tbody>
                {managerData.clients.map(client => (
                <tr key={client.client}>
                    <td style={{ border: '1px solid #ddd', padding: '8px', verticalAlign: 'top' }}>
                    <strong>{client.client}</strong>
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={{ borderBottom: '1px solid #eee', textAlign: 'left', fontSize: '0.9em' }}>Доповнення</th>
                            <th style={{ borderBottom: '1px solid #eee', textAlign: 'left', fontSize: '0.9em' }}>Товар</th>
                            <th style={{ borderBottom: '1px solid #eee', textAlign: 'left', fontSize: '0.9em' }}>К-ть</th>
                        </tr>
                        </thead>
                        <tbody>
                        {client.orders.map(order => (
                            <tr key={order.id}>
                            <td style={{ padding: '4px', fontSize: '0.9em' }}>{order.contract_supplement}</td>
                            <td style={{ padding: '4px', fontSize: '0.9em' }}>{order.nomenclature}</td>
                            <td style={{ padding: '4px', fontSize: '0.9em' }}>{order.different}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', verticalAlign: 'top' }}>
                    <div>К-ть: {client.count}</div>
                    <div>Вага: {client.totalWeight.toFixed(2)}</div>
                    </td>
                </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                <td colSpan="2" style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold', textAlign: 'right' }}>Всього по менеджеру:</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>
                    <div>{managerData.totalCount} шт</div>
                    <div>{managerData.totalWeight.toFixed(2)} кг</div>
                </td>
                </tr>
            </tfoot>
            </table>
        </div>
        ))}
      </div>
    </>
  );
}
