"use client";

import { useEffect, useState } from 'react';

// Basic print styles
const printStyles = `
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
.print-container { padding: 20px; color: #333; }
.print-group { page-break-before: always; } /* Page break before each new delivery statement */
.print-group:first-child { page-break-before: auto; }
.print-delivery-header { border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 15px; }
.print-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.print-table th, .print-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
.print-table th { background-color: #f5f5f5; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-container { padding: 0; }
  @page { size: A4; margin: 15mm; }
}
`;

// Define a more specific type to avoid 'any'
interface PrintItem {
  orderRef?: string;
  order?: string;
  product: string;
  quantity: number;
  parties?: { party: string; moved_q: number }[];
}

interface PrintDelivery {
    manager: string;
    client: string;
    items: PrintItem[];
}

interface PrintData {
    deliveries: PrintDelivery[];
    printDate: string;
}

export default function StatementView() {
  const [data, setData] = useState<PrintData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('statementPrintData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setData(parsedData);
        sessionStorage.removeItem('statementPrintData');
      } else {
        setError("Нет данных для печати.");
      }
    } catch (e) {
      console.error("Failed to parse print data:", e);
      setError("Ошибка чтения данных для печати.");
    }
  }, []);

  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (error) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>{error}</div>;
  }

  if (!data) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Подготовка документа к печати...</div>;
  }

  return (
    <>
      <style>{printStyles}</style>
      <div className="print-container">
        {data.deliveries.map((delivery, dIdx) => (
          <div key={dIdx} className="print-group">
            <div style={{ textAlign: 'center', borderBottom: '2px solid #333', marginBottom: '20px', paddingBottom: '10px' }}>
              <h2 style={{ margin: 0 }}>Відомість доставки</h2>
              <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>Дата: {new Date().toLocaleDateString('uk-UA')}</div>
            </div>
            <div className="print-delivery-header">
              <div><strong>Менеджер:</strong> {delivery.manager}</div>
              <div><strong>Клієнт:</strong> {delivery.client}</div>
              <div><strong>Дата доставки:</strong> {new Date(data.printDate).toLocaleDateString('uk-UA')}</div>
            </div>
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Заявка</th>
                  <th style={{ width: '40%' }}>Товар</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>К-сть</th>
                  <th>Партії</th>
                </tr>
              </thead>
              <tbody>
                {delivery.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.orderRef || item.order}</td>
                    <td style={{ fontWeight: 500 }}>{item.product}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {item.parties?.map(p => `${p.party} (${p.moved_q})`).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
}
