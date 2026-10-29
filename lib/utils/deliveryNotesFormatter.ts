import { OrderComment } from "@/types/types";

export interface DeliveryItemSummary {
  order: string;
  product: string;
  nomenclature?: string;
}

/**
 * Форматує примітки до заявок та товарів для підстановки в коментар доставки.
 *
 * @param comments Масив коментарів (OrderComment) з бекенду
 * @param items Товарні позиції, які фактично входять у поточну доставку
 * @returns Сформований блок тексту з поясненнями або порожній рядок, якщо приміток немає
 */
export function formatOrderNotesForDelivery(
  comments: OrderComment[] | null | undefined,
  items: DeliveryItemSummary[] | null | undefined
): string {
  if (!comments || comments.length === 0 || !items || items.length === 0) {
    return "";
  }

  // Множина номерів заявок, що входять у доставку
  const orderRefs = new Set(
    items.map((i) => (i.order || "").trim()).filter(Boolean)
  );

  // 1. Фільтруємо загальні примітки до заявок (comment_type === 'order')
  const orderNotes = comments
    .filter((c) => {
      if (c.comment_type !== "order") return false;
      const ref = (c.order_ref || "").trim();
      const text = (c.comment_text || "").trim();
      return Boolean(ref && text && orderRefs.has(ref));
    })
    .sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  // 2. Фільтруємо примітки до окремих товарів (comment_type === 'product'),
  // що фактично включені у поточну доставку
  const productNotes = comments
    .filter((c) => {
      if (c.comment_type !== "product") return false;
      const text = (c.comment_text || "").trim();
      const ref = (c.order_ref || "").trim();
      if (!text || !ref || !orderRefs.has(ref)) return false;

      const cProdId = (c.product_id || "").trim().toLowerCase();
      const cProdName = (c.product_name || "").trim().toLowerCase();

      return items.some((item) => {
        const itemOrder = (item.order || "").trim();
        if (itemOrder !== ref) return false;

        const itemProd = (item.product || "").trim().toLowerCase();
        const itemNom = (item.nomenclature || "").trim().toLowerCase();

        return (
          (cProdId && itemProd === cProdId) ||
          (cProdName && itemProd === cProdName) ||
          (cProdName && itemNom === cProdName)
        );
      });
    })
    .sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  if (orderNotes.length === 0 && productNotes.length === 0) {
    return "";
  }

  const lines: string[] = ["📋 Примітки з заявок:"];
  const seenNotes = new Set<string>();

  // Додаємо загальні примітки по заявках
  for (const note of orderNotes) {
    const text = note.comment_text.trim();
    const key = `order:${note.order_ref}:${text}`;
    if (seenNotes.has(key)) continue;
    seenNotes.add(key);

    lines.push(`• [Заявка ${note.order_ref}]: ${text}`);
  }

  // Додаємо примітки по товарах
  for (const note of productNotes) {
    const text = note.comment_text.trim();
    const prodName = (note.product_name || "Товар").trim();
    const key = `product:${note.order_ref}:${prodName}:${text}`;
    if (seenNotes.has(key)) continue;
    seenNotes.add(key);

    lines.push(`• [Товар "${prodName}" (${note.order_ref})]: ${text}`);
  }

  return lines.join("\n");
}

