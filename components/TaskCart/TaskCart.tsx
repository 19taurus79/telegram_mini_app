import { TaskGoogle, TaskStatus } from "@/types/types";
import css from "./TaskCart.module.css";
import { CheckCircle2, Clock3, ClipboardList, User2, AlignLeft, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDeliveryByTask } from "@/lib/api";

const STATUS_MAP = {
  0: { label: "Очікує виконання", icon: Clock3, color: "pending" },
  1: { label: "В роботі", icon: Clock3, color: "inProgress" },
  2: { label: "Виконано", icon: CheckCircle2, color: "completed" },
};

/** Backend appends "_зараз виконує X" (in_progress) or " виконав X" (complete)
 *  to the Google Task title. Strip both before displaying. */
function cleanTitle(raw: string): string {
  // Remove "_зараз виконує ..." suffix (added by in_progress_task)
  const withoutUnderscore = raw.split("_")[0];
  // Remove " виконав ..." suffix (added by complete_task)
  return withoutUnderscore.replace(/\s+виконав\s+.+$/i, "").trim();
}

export default function TaskCart({
  task,
  taskStatus,
}: {
  task: TaskGoogle;
  taskStatus: TaskStatus;
}) {
  // Clean the title — backend appends executor name suffixes that must be stripped
  const titlePart = cleanTitle(task.title);

  // Parse notes into labeled rows
  const noteLines = task.notes
    ? task.notes.split("\n").filter((l) => l.trim())
    : [];

  const statusInfo = STATUS_MAP[taskStatus.task_status as keyof typeof STATUS_MAP] ?? STATUS_MAP[0];
  const StatusIcon = statusInfo.icon;

  // Fetch actual delivery details
  const { data: deliveryData } = useQuery({
    queryKey: ["deliveryByTask", task.id],
    queryFn: () => getDeliveryByTask(task.id),
    enabled: !!task.id,
  });

  // Group batches under products
  const groupedItems = deliveryData?.items ? Object.values(
    deliveryData.items.reduce((acc, item) => {
      const prod = item.product;
      if (!acc[prod]) {
        acc[prod] = {
          product: prod,
          quantity: item.quantity,
          batches: [],
        };
      }
      if (item.party) {
        acc[prod].batches.push({
          party: item.party,
          quantity: item.party_quantity || 0,
        });
      }
      return acc;
    }, {} as Record<string, { product: string; quantity: number; batches: { party: string; quantity: number }[] }>)
  ) : [];

  return (
    <article className={css.card}>
      {/* ── Status Banner ── */}
      <div className={`${css.statusBanner} ${css[statusInfo.color]}`}>
        <StatusIcon size={15} strokeWidth={2.5} />
        <span>{statusInfo.label}</span>
        {taskStatus.task_who_changed_name && (
          <span className={css.statusWho}>
            · {taskStatus.task_who_changed_name}
          </span>
        )}
      </div>

      {/* ── Hero Title ── */}
      <div className={css.heroSection}>
        <div className={css.iconWrap}>
          <ClipboardList size={28} strokeWidth={1.5} />
        </div>
        <h1 className={css.title}>{titlePart}</h1>
      </div>

      {/* ── Notes / Details ── */}
      {noteLines.length > 0 && (
        <div className={css.notesSection}>
          <div className={css.sectionLabel}>
            <AlignLeft size={13} />
            <span>Деталі завдання</span>
          </div>
          <ul className={css.notesList}>
            {noteLines.map((line, i) => {
              const colonIdx = line.indexOf(":");
              if (colonIdx !== -1) {
                const key = line.slice(0, colonIdx).trim();
                const val = line.slice(colonIdx + 1).trim();
                return (
                  <li key={i} className={css.noteRow}>
                    <span className={css.noteKey}>{key}</span>
                    <span className={css.noteVal}>{val}</span>
                  </li>
                );
              }
              return (
                <li key={i} className={css.notePlain}>
                  {line}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Actual Delivery Section ── */}
      {deliveryData?.found && deliveryData.delivery && (
        <div className={css.deliverySection}>
          <div className={css.deliveryHeader}>
            <Truck size={20} strokeWidth={2} />
            <h2 className={css.deliveryTitle}>Фактична доставка</h2>
            <span className={css.deliveryBadge}>{deliveryData.delivery.status}</span>
          </div>

          <ul className={css.notesList}>
            <li className={css.noteRow}>
              <span className={css.noteKey}>Адреса</span>
              <span className={css.noteVal}>{deliveryData.delivery.address || "Не вказано"}</span>
            </li>
            <li className={css.noteRow}>
              <span className={css.noteKey}>Дата</span>
              <span className={css.noteVal}>{deliveryData.delivery.delivery_date || "Не вказано"}</span>
            </li>
            {deliveryData.delivery.comment && (
              <li className={css.noteRow}>
                <span className={css.noteKey}>Коментар</span>
                <span className={css.noteVal}>{deliveryData.delivery.comment}</span>
              </li>
            )}
            {deliveryData.delivery.total_weight ? (
              <li className={css.noteRow}>
                <span className={css.noteKey}>Вага</span>
                <span className={css.noteVal}>{deliveryData.delivery.total_weight} кг</span>
              </li>
            ) : null}
          </ul>

          {groupedItems.length > 0 && (
            <>
              <div className={css.deliveryItemsTitle}>Товари та партії</div>
              <div className={css.deliveryItemList}>
                {groupedItems.map((item, idx) => (
                  <div key={idx} className={css.deliveryItemRow}>
                    <div className={css.itemHeader}>
                      <span className={css.itemName}>{item.product}</span>
                      <span className={css.itemQty}>{item.quantity} шт</span>
                    </div>
                    {item.batches.length > 0 && (
                      <div className={css.batchList}>
                        {item.batches.map((batch, bIdx) => (
                          <div key={bIdx} className={css.batchRow}>
                            <span className={css.batchName}>Партія: {batch.party}</span>
                            <span className={css.batchQty}>{batch.quantity} шт</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Footer / Meta ── */}
      {(taskStatus.task_creator_name || (taskStatus.task_who_changed_name && taskStatus.task_status !== 0)) && (
        <div className={css.footer}>
          <User2 size={14} className={css.footerIcon} />
          <div className={css.footerContent}>
            {taskStatus.task_creator_name && (
              <span className={css.footerLine}>
                Створив: <strong>{taskStatus.task_creator_name}</strong>
              </span>
            )}
            {taskStatus.task_who_changed_name && taskStatus.task_status !== 0 && (
              <span className={css.footerLine}>
                {taskStatus.task_status === 2 ? "Виконав" : "Виконує"}:{" "}
                <strong>{taskStatus.task_who_changed_name}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
