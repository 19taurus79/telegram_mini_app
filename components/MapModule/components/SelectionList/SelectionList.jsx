import css from './SelectionList.module.css';

export default function SelectionList({ items, onClose, type }) {
  if (!items || items.length === 0) return null;

  const title = type === 'clients' ? 'Выбранные контрагенты' : 'Выбранные заявки';

  return (
    <div className={css.overlay} onClick={onClose}>
      <div className={css.modal} onClick={(e) => e.stopPropagation()}>
        <div className={css.header}>
          <h2>{title}</h2>
          <button className={css.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={css.stats}>
          <strong>Всего найдено:</strong> {items.length}
        </div>
        <div className={css.content}>
          {type === 'clients' ? (
            <div className={css.list}>
              {items.map((client, index) => (
                <div key={index} className={css.item}>
                  <div className={css.itemHeader}>
                    <strong>{client.client}</strong>
                  </div>
                  <div className={css.itemDetails}>
                    <div>📍 {client.city}, {client.area}</div>
                    {client.manager && <div>👤 Менеджер: {client.manager}</div>}
                    {client.representative && <div>👨‍💼 Контактна особа: {client.representative}</div>}
                    {client.phone1 && <div>📞 {client.phone1}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={css.list}>
              {items.map((app, index) => (
                <div key={index} className={css.item}>
                  <div className={css.itemHeader}>
                    <strong>{app.client}</strong>
                  </div>
                  <div className={css.itemDetails}>
                    <div>📍 {app.address?.city}, {app.address?.area}</div>
                    <div>📦 Кількість заявок: {app.count}</div>
                    {app.totalQuantity && <div>📊 Загальна кількість: {app.totalQuantity}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={css.footer}>
          <button className={css.exportBtn} onClick={() => {
            // Экспорт в CSV
            const csvContent = type === 'clients' 
              ? generateClientsCSV(items)
              : generateApplicationsCSV(items);
            downloadCSV(csvContent, `selection_${type}_${new Date().toISOString().split('T')[0]}.csv`);
          }}>
            📥 Экспорт в CSV
          </button>
        </div>
      </div>
    </div>
  );
}

function generateClientsCSV(clients) {
  const headers = ['Клиент', 'Город', 'Район', 'Менеджер', 'Контактное лицо', 'Телефон'];
  const rows = clients.map(c => [
    c.client || '',
    c.city || '',
    c.area || '',
    c.manager || '',
    c.representative || '',
    c.phone1 || ''
  ]);
  
  return [headers, ...rows].map(row => row.join(';')).join('\n');
}

function generateApplicationsCSV(applications) {
  const headers = ['Клиент', 'Город', 'Район', 'Количество заявок', 'Общее количество'];
  const rows = applications.map(a => [
    a.client || '',
    a.address?.city || '',
    a.address?.area || '',
    a.count || 0,
    a.totalQuantity || 0
  ]);
  
  return [headers, ...rows].map(row => row.join(';')).join('\n');
}

function downloadCSV(content, filename) {
  const BOM = '\uFEFF'; // UTF-8 BOM для корректного отображения кириллицы в Excel
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
