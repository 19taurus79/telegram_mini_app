import * as XLSX from "xlsx";
import { ApplicationItem, DeliveryItem, OrderItem } from "./filterUtils";
import { formatQuantity } from "@/lib/utils/productUtils";

export interface FilterSummaryInfo {
  managers?: string[];
  lobs?: string[];
  statuses?: string[];
  dates?: string[];
}

/**
 * Универсальный парсинг веса с обработкой чисел, строк с запятыми и альтернативных полей
 */
export function parseWeight(val: unknown): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = String(val).replace(",", ".").trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Безопасный извлекатель веса для заказов и клиентов
 */
function getOrderWeight(ord: OrderItem, fallbackAppWeight?: unknown): number {
  const o = ord as Record<string, unknown>;
  const w = o.total_weight ?? o.totalWeight ?? o.weight ?? fallbackAppWeight;
  return parseWeight(w);
}

/**
 * Формирование точного полного адреса
 */
export function parseAddress(item: unknown): string {
  if (!item) return "—";
  const rec = item as Record<string, unknown>;

  let res = "—";
  if (typeof rec.address === "string" && rec.address.trim()) {
    res = rec.address.trim();
  } else if (rec.address && typeof rec.address === "object") {
    const addr = rec.address as Record<string, unknown>;
    const parts = [addr.city, addr.area, addr.address, addr.street, addr.full_address]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
    if (parts.length > 0) res = Array.from(new Set(parts)).join(", ");
  } else {
    const directParts = [rec.city, rec.area, rec.street, rec.house]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
    if (directParts.length > 0) res = Array.from(new Set(directParts)).join(", ");
  }

  return res.replace(/Безготковковий/gi, "Безготівковий");
}

/**
 * Извлечение комментариев / примечаний
 */
export function parseComment(item: unknown): string {
  if (!item) return "—";
  const rec = item as Record<string, unknown>;

  const fields = [rec.comment, rec.note, rec.order_comment, rec.remarks, rec.description];
  for (const f of fields) {
    if (typeof f === "string" && f.trim()) {
      return f.trim().replace(/Безготковковий/gi, "Безготівковий");
    }
  }
  return "—";
}

function formatFilterSummary(info?: FilterSummaryInfo): string {
  if (!info) return "Усі елементи списку";
  const parts: string[] = [];
  if (info.managers && info.managers.length > 0) {
    parts.push(`Менеджери: ${info.managers.join(", ")}`);
  }
  if (info.lobs && info.lobs.length > 0) {
    parts.push(`Вид діяльності: ${info.lobs.join(", ")}`);
  }
  if (info.statuses && info.statuses.length > 0) {
    parts.push(`Статуси: ${info.statuses.join(", ")}`);
  }
  if (info.dates && info.dates.length > 0) {
    parts.push(`Дати: ${info.dates.join(", ")}`);
  }
  return parts.length > 0 ? parts.join(" | ") : "Без додаткових фільтрів";
}

interface ApplicationRow {
  Менеджер: string;
  Клієнт: string;
  Адреса: string;
  "Номер заявки": string;
  "Вид діяльності": string;
  Товар: string;
  Деталі: string;
  Кількість: string;
  "Вага (кг)": number;
  "Коментар / Примітка": string;
}

interface ApplicationSummaryRow {
  Менеджер: string;
  "Кількість клієнтів": number;
  "Кількість позицій": number;
  "Загальна вага (кг)": number;
  "Загальна вага (т)": number;
}

/**
 * Экспорт отфильтрованных Заявок в Excel файл
 */
export function exportApplicationsToExcel(
  applications: ApplicationItem[],
  filtersInfo?: FilterSummaryInfo,
  filename: string = "export_applications.xlsx"
): void {
  if (!applications || applications.length === 0) return;

  const rows: ApplicationRow[] = [];
  const managerStats: Record<string, { clients: Set<string>; count: number; weight: number }> = {};

  applications.forEach((app) => {
    const clientName = app.client || "—";
    const addressStr = parseAddress(app);
    const defaultManager = (app.address?.manager || app.manager || "—") as string;
    const appComment = parseComment(app);
    const fallbackWeight = parseWeight(app.totalWeight || app.weight || app.total_weight);

    const orders: Array<OrderItem> = Array.isArray(app.orders) && app.orders.length > 0
      ? app.orders
      : [{
          contract_supplement: "—",
          line_of_business: "—",
          manager: defaultManager,
          nomenclature: "—",
          different: 0,
          total_weight: fallbackWeight,
          party_sign: "",
          buying_season: "",
          comment: appComment !== "—" ? appComment : "",
        }];

    orders.forEach((ord) => {
      const manager = (ord.manager || defaultManager) as string;
      const weight = getOrderWeight(ord, fallbackWeight);
      const partySign = typeof ord.party_sign === "string" ? ord.party_sign : "";
      const buyingSeason = typeof ord.buying_season === "string" ? ord.buying_season : "";
      const details = [partySign, buyingSeason].filter(Boolean).join(" ");
      const ordComment = parseComment(ord);
      const finalComment = ordComment !== "—" ? ordComment : appComment;

      rows.push({
        Менеджер: manager,
        Клієнт: clientName,
        Адреса: addressStr,
        "Номер заявки": (ord.contract_supplement || "—") as string,
        "Вид діяльності": (ord.line_of_business || "—") as string,
        Товар: (ord.nomenclature || "—") as string,
        Деталі: details || "—",
        Кількість: formatQuantity(ord.different),
        "Вага (кг)": Math.round(weight * 100) / 100,
        "Коментар / Примітка": finalComment,
      });

      if (!managerStats[manager]) {
        managerStats[manager] = { clients: new Set(), count: 0, weight: 0 };
      }
      managerStats[manager].clients.add(clientName);
      managerStats[manager].count += 1;
      managerStats[manager].weight += weight;
    });
  });

  const summaryRows: ApplicationSummaryRow[] = Object.entries(managerStats).map(([mgr, stat]) => ({
    Менеджер: mgr,
    "Кількість клієнтів": stat.clients.size,
    "Кількість позицій": stat.count,
    "Загальна вага (кг)": Math.round(stat.weight * 100) / 100,
    "Загальна вага (т)": Math.round((stat.weight / 1000) * 100) / 100,
  }));

  const wb = XLSX.utils.book_new();

  const wsDetails = XLSX.utils.json_to_sheet(rows);
  wsDetails["!cols"] = [
    { wch: 25 },
    { wch: 35 },
    { wch: 35 },
    { wch: 18 },
    { wch: 20 },
    { wch: 40 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetails, "Заявки");

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary["!cols"] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Підсумки по менеджерах");

  XLSX.writeFile(wb, filename);
}

interface DeliveryRow {
  Статус: string;
  "Дата доставки": string;
  Менеджер: string;
  Клієнт: string;
  Адреса: string;
  Товар: string;
  "Заявка / Ref": string;
  Кількість: string;
  "Вага (кг)": number;
  Партії: string;
  "Коментар / Примітка": string;
}

interface DeliverySummaryRow {
  Статус: string;
  "Дата доставки": string;
  "Кількість доставок": number;
  "Загальна вага (кг)": number;
  "Загальна вага (т)": number;
}

/**
 * Экспорт отфильтрованных Доставок в Excel файл
 */
export function exportDeliveriesToExcel(
  deliveries: DeliveryItem[],
  filtersInfo?: FilterSummaryInfo,
  filename: string = "export_deliveries.xlsx"
): void {
  if (!deliveries || deliveries.length === 0) return;

  const rows: DeliveryRow[] = [];
  const statusStats: Record<string, { count: number; weight: number }> = {};

  deliveries.forEach((d) => {
    const status = d.status || "Без статусу";
    const date = d.delivery_date || "Без дати";
    const manager = d.manager || "Невідомий";
    const client = d.client || "Невідомий";
    const addressStr = parseAddress(d);
    const dComment = parseComment(d);
    const items = Array.isArray(d.items) && d.items.length > 0 ? d.items : [];

    if (items.length === 0) {
      const weight = parseWeight(d.total_weight || d.weight);
      rows.push({
        Статус: status,
        "Дата доставки": date,
        Менеджер: manager,
        Клієнт: client,
        Адреса: addressStr,
        Товар: "—",
        "Заявка / Ref": "—",
        Кількість: "—",
        "Вага (кг)": Math.round(weight * 100) / 100,
        Партії: "—",
        "Коментар / Примітка": dComment,
      });
      const key = `${status}__${date}`;
      if (!statusStats[key]) statusStats[key] = { count: 0, weight: 0 };
      statusStats[key].count += 1;
      statusStats[key].weight += weight;
    } else {
      items.forEach((item) => {
        const itemWeight = parseWeight(item.weight || item.total_weight || d.total_weight);
        const partyStr = Array.isArray(item.parties)
          ? item.parties.map((p) => `${p.party || "—"}: ${formatQuantity((p.party_quantity || p.moved_q) as string | number)}`).join("; ")
          : "—";
        const itemComment = parseComment(item);
        const finalComment = itemComment !== "—" ? itemComment : dComment;

        rows.push({
          Статус: status,
          "Дата доставки": date,
          Менеджер: manager,
          Клієнт: client,
          Адреса: addressStr,
          Товар: (item.product || item.nomenclature || "—") as string,
          "Заявка / Ref": (item.order_ref || "—") as string,
          Кількість: formatQuantity(item.quantity as string | number),
          "Вага (кг)": Math.round(itemWeight * 100) / 100,
          Партії: partyStr,
          "Коментар / Примітка": finalComment,
        });

        const key = `${status}__${date}`;
        if (!statusStats[key]) statusStats[key] = { count: 0, weight: 0 };
        statusStats[key].count += 1;
        statusStats[key].weight += itemWeight;
      });
    }
  });

  const summaryRows: DeliverySummaryRow[] = Object.entries(statusStats).map(([key, stat]) => {
    const [st, dt] = key.split("__");
    return {
      Статус: st,
      "Дата доставки": dt,
      "Кількість доставок": stat.count,
      "Загальна вага (кг)": Math.round(stat.weight * 100) / 100,
      "Загальна вага (т)": Math.round((stat.weight / 1000) * 100) / 100,
    };
  });

  const wb = XLSX.utils.book_new();

  const wsDetails = XLSX.utils.json_to_sheet(rows);
  wsDetails["!cols"] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 25 },
    { wch: 35 },
    { wch: 35 },
    { wch: 40 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 30 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetails, "Доставки");

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary["!cols"] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Свод по датах");

  XLSX.writeFile(wb, filename);
}

/**
 * Открытие печатной формы отчета Заявок
 */
export function printApplicationsReport(
  applications: ApplicationItem[],
  filtersInfo?: FilterSummaryInfo
): void {
  if (!applications || applications.length === 0) return;

  const totalClients = applications.length;
  let totalOrdersCount = 0;
  let totalWeight = 0;

  const managerGroups: Record<string, ApplicationItem[]> = {};

  applications.forEach((app) => {
    const mgr = (app.address?.manager || app.manager || "Невідомий менеджер") as string;
    if (!managerGroups[mgr]) managerGroups[mgr] = [];
    managerGroups[mgr].push(app);

    const fallbackWeight = parseWeight(app.totalWeight || app.weight || app.total_weight);
    const orders = Array.isArray(app.orders) && app.orders.length > 0
      ? app.orders
      : [{
          total_weight: fallbackWeight,
        }];

    totalOrdersCount += orders.length;
    orders.forEach((o) => {
      totalWeight += getOrderWeight(o, fallbackWeight);
    });
  });

  const nowStr = new Date().toLocaleString("uk-UA");
  const filterText = formatFilterSummary(filtersInfo);

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Печать отчета по заявкам</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm 12mm;
        }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 11px;
          color: #0f172a;
          background: #ffffff;
          padding: 0;
          margin: 0;
          line-height: 1.35;
        }
        .header-card {
          border-bottom: 2px solid #0284c7;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .title {
          font-size: 18px;
          font-weight: 700;
          color: #0284c7;
          margin: 0;
        }
        .date {
          font-size: 11px;
          color: #64748b;
        }
        .filter-badge {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          border-radius: 6px;
          margin-top: 6px;
          margin-bottom: 10px;
          font-size: 11px;
        }
        .stats-grid {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 6px;
          flex: 1;
        }
        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
        }
        .stat-val {
          font-size: 16px;
          font-weight: 700;
          color: #0284c7;
          margin-top: 2px;
        }
        .manager-section {
          margin-bottom: 16px;
        }
        .manager-title {
          font-size: 13px;
          font-weight: 700;
          background: #e0f2fe;
          color: #0369a1;
          padding: 5px 8px;
          border-radius: 4px;
          margin-bottom: 6px;
          page-break-after: avoid; 
        }
        .comment-row td {
          background: #f8fafc !important;
          border-top: 1px dashed #cbd5e1;
          border-bottom: 1px solid #e2e8f0;
          padding: 4px 8px 6px 12px !important;
          font-size: 10px;
          color: #334155;
          line-height: 1.35;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
          font-size: 10.5px;
        }
        thead {
          display: table-header-group; 
        }
        tfoot {
          display: table-footer-group;
        }
        tr {
          page-break-inside: avoid; 
        }
        th {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 5px 6px;
          text-align: left;
          font-weight: 600;
        }
        td {
          border: 1px solid #e2e8f0;
          padding: 5px 6px;
          vertical-align: top;
        }
        tr:nth-child(even) td {
          background: #fafafa;
        }
        .subtotal td {
          font-weight: 700;
          background: #f8fafc !important;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header-card">
        <div class="title-row">
          <h1 class="title">Зведений звіт по заявках</h1>
          <div class="date">Сформовано: ${nowStr}</div>
        </div>
        <div class="filter-badge">
          <strong>Активні фільтри:</strong> ${filterText}
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Всього клієнтів</div>
            <div class="stat-val">${totalClients}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Всього заявок</div>
            <div class="stat-val">${totalOrdersCount}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Загальна вага</div>
            <div class="stat-val">${(totalWeight / 1000).toFixed(2)} т (${Math.round(totalWeight)} кг)</div>
          </div>
        </div>
      </div>
  `;

  Object.entries(managerGroups).forEach(([mgr, apps]) => {
    let mgrOrdersCount = 0;
    let mgrWeight = 0;

    htmlContent += `
      <div class="manager-section">
        <div class="manager-title">👤 Менеджер: ${mgr} (${apps.length} клієнтів)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 22%;">Клієнт</th>
              <th style="width: 22%;">Адреса</th>
              <th style="width: 12%;">№ Заявки</th>
              <th style="width: 30%;">Товар / Вид діяльності</th>
              <th style="width: 7%;">Кількість</th>
              <th style="width: 7%;">Вага (кг)</th>
            </tr>
          </thead>
          <tbody>
    `;

    apps.forEach((app) => {
      const addressStr = parseAddress(app);
      const appComment = parseComment(app);
      const fallbackWeight = parseWeight(app.totalWeight || app.weight || app.total_weight);
      const orders = Array.isArray(app.orders) && app.orders.length > 0
        ? app.orders
        : [{
            contract_supplement: "—",
            line_of_business: "—",
            nomenclature: "—",
            different: 0,
            total_weight: fallbackWeight,
            comment: appComment !== "—" ? appComment : "",
          }];

      mgrOrdersCount += orders.length;

      orders.forEach((ord) => {
        const w = getOrderWeight(ord, fallbackWeight);
        mgrWeight += w;
        const ordComment = parseComment(ord);
        const finalComment = ordComment !== "—" ? ordComment : appComment;

        htmlContent += `
          <tr>
            <td><strong>${app.client}</strong></td>
            <td>${addressStr}</td>
            <td>${(ord.contract_supplement || "—") as string}</td>
            <td>${(ord.nomenclature || "—") as string} <br/><small style="color:#64748b;">${(ord.line_of_business || "") as string}</small></td>
            <td>${formatQuantity(ord.different)}</td>
            <td style="text-align: right;">${Math.round(w)}</td>
          </tr>
        `;

        if (finalComment && finalComment !== "—") {
          htmlContent += `
            <tr class="comment-row">
              <td colspan="6"><strong>📝 Примітка:</strong> ${finalComment}</td>
            </tr>
          `;
        }
      });
    });

    htmlContent += `
            <tr class="subtotal">
              <td colspan="4" style="text-align: right;">Разом по менеджеру:</td>
              <td>${mgrOrdersCount} поз.</td>
              <td style="text-align: right;">${Math.round(mgrWeight)} кг</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  });

  htmlContent += `
    </body>
    </html>
  `;

  const printWin = window.open("", "_blank", "height=900,width=1200");
  if (printWin) {
    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 300);
  }
}

/**
 * Открытие печатной формы отчета Доставок
 */
export function printDeliveriesReport(
  deliveries: DeliveryItem[],
  filtersInfo?: FilterSummaryInfo
): void {
  if (!deliveries || deliveries.length === 0) return;

  const totalDeliveries = deliveries.length;
  let totalItemsCount = 0;
  let totalWeight = 0;

  const statusGroups: Record<string, DeliveryItem[]> = {};

  deliveries.forEach((d) => {
    const st = d.status || "Без статусу";
    if (!statusGroups[st]) statusGroups[st] = [];
    statusGroups[st].push(d);

    const items = Array.isArray(d.items) ? d.items : [];
    totalItemsCount += items.length || 1;

    if (items.length > 0) {
      items.forEach((it) => {
        totalWeight += parseWeight(it.weight || it.total_weight || d.total_weight);
      });
    } else {
      totalWeight += parseWeight(d.total_weight || d.weight);
    }
  });

  const nowStr = new Date().toLocaleString("uk-UA");
  const filterText = formatFilterSummary(filtersInfo);

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Печать отчета по доставкам</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm 12mm;
        }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 11px;
          color: #0f172a;
          background: #ffffff;
          padding: 0;
          margin: 0;
          line-height: 1.35;
        }
        .header-card {
          border-bottom: 2px solid #16a34a;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .title {
          font-size: 18px;
          font-weight: 700;
          color: #16a34a;
          margin: 0;
        }
        .date {
          font-size: 11px;
          color: #64748b;
        }
        .filter-badge {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          border-radius: 6px;
          margin-top: 6px;
          margin-bottom: 10px;
          font-size: 11px;
        }
        .stats-grid {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 6px;
          flex: 1;
        }
        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
        }
        .stat-val {
          font-size: 16px;
          font-weight: 700;
          color: #16a34a;
          margin-top: 2px;
        }
        .status-section {
          margin-bottom: 16px;
        }
        .status-title {
          font-size: 13px;
          font-weight: 700;
          background: #dcfce7;
          color: #15803d;
          padding: 5px 8px;
          border-radius: 4px;
          margin-bottom: 6px;
          page-break-after: avoid; 
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
          font-size: 10.5px;
        }
        thead {
          display: table-header-group; 
        }
        tfoot {
          display: table-footer-group;
        }
        tr {
          page-break-inside: avoid; 
        }
        th {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 5px 6px;
          text-align: left;
          font-weight: 600;
        }
        td {
          border: 1px solid #e2e8f0;
          padding: 5px 6px;
          vertical-align: top;
        }
        tr:nth-child(even) td {
          background: #fafafa;
        }
        .subtotal td {
          font-weight: 700;
          background: #f8fafc !important;
        }
        .comment-row td {
          background: #f8fafc !important;
          border-top: 1px dashed #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          padding: 4px 8px 5px 10px !important;
          font-size: 10px;
          color: #334155;
          line-height: 1.35;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header-card">
        <div class="title-row">
          <h1 class="title">Зведений звіт по доставках</h1>
          <div class="date">Сформовано: ${nowStr}</div>
        </div>
        <div class="filter-badge">
          <strong>Активні фільтри:</strong> ${filterText}
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Всього доставок</div>
            <div class="stat-val">${totalDeliveries}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Всього позицій</div>
            <div class="stat-val">${totalItemsCount}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Загальна вага</div>
            <div class="stat-val">${(totalWeight / 1000).toFixed(2)} т (${Math.round(totalWeight)} кг)</div>
          </div>
        </div>
      </div>
  `;

  Object.entries(statusGroups).forEach(([st, itemsList]) => {
    let stWeight = 0;

    htmlContent += `
      <div class="status-section">
        <div class="status-title">🚚 Статус: ${st} (${itemsList.length} доставок)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 10%;">Дата</th>
              <th style="width: 22%;">Клієнт</th>
              <th style="width: 22%;">Адреса</th>
              <th style="width: 18%;">Менеджер</th>
              <th style="width: 20%;">Товар / № Заявки</th>
              <th style="width: 4%;">Кількість</th>
              <th style="width: 4%;">Вага (кг)</th>
            </tr>
          </thead>
          <tbody>
    `;

    itemsList.forEach((d) => {
      const items = Array.isArray(d.items) && d.items.length > 0 ? d.items : [];
      const date = d.delivery_date || "—";
      const client = d.client || "—";
      const manager = d.manager || "—";
      const addressStr = parseAddress(d);
      const dComment = parseComment(d);

      if (items.length === 0) {
        const w = parseWeight(d.total_weight || d.weight);
        stWeight += w;
        htmlContent += `
          <tr>
            <td>${date}</td>
            <td><strong>${client}</strong></td>
            <td>${addressStr}</td>
            <td>${manager}</td>
            <td>—</td>
            <td>—</td>
            <td style="text-align: right;">${Math.round(w)}</td>
          </tr>
        `;
        if (dComment && dComment !== "—") {
          htmlContent += `
            <tr class="comment-row">
              <td colspan="7"><strong>📝 Примітка:</strong> ${dComment}</td>
            </tr>
          `;
        }
      } else {
        items.forEach((it, idx) => {
          const w = parseWeight(it.weight || it.total_weight || d.total_weight);
          stWeight += w;
          const itemComment = parseComment(it);
          const finalComment = itemComment !== "—" ? itemComment : dComment;
          const refStr = (it.order_ref || "—") as string;

          htmlContent += `
            <tr>
              ${idx === 0 ? `<td rowspan="${items.length}">${date}</td>` : ""}
              ${idx === 0 ? `<td rowspan="${items.length}"><strong>${client}</strong></td>` : ""}
              ${idx === 0 ? `<td rowspan="${items.length}">${addressStr}</td>` : ""}
              ${idx === 0 ? `<td rowspan="${items.length}">${manager}</td>` : ""}
              <td>${(it.product || it.nomenclature || "—") as string}${refStr !== "—" ? `<br/><small style="color:#64748b;">${refStr}</small>` : ""}</td>
              <td>${formatQuantity(it.quantity as string | number)}</td>
              <td style="text-align: right;">${Math.round(w)}</td>
            </tr>
          `;

          if (finalComment && finalComment !== "—" && (idx === items.length - 1 || itemComment !== "—")) {
            htmlContent += `
              <tr class="comment-row">
                <td colspan="7"><strong>📝 Примітка:</strong> ${finalComment}</td>
              </tr>
            `;
          }
        });
      }
    });

    htmlContent += `
            <tr class="subtotal">
              <td colspan="5" style="text-align: right;">Разом по статусу "${st}":</td>
              <td colspan="2" style="text-align: right;">${Math.round(stWeight)} кг</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  });

  htmlContent += `
    </body>
    </html>
  `;

  const printWin = window.open("", "_blank", "height=900,width=1200");
  if (printWin) {
    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 300);
  }
}
