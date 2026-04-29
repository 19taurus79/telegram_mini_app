import { TaskGoogle, TaskStatus } from "@/types/types";
import css from "./TaskCart.module.css";
import { CheckCircle2, Clock3, ClipboardList, User2, AlignLeft } from "lucide-react";

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

      {/* ── Creator ── */}
      {taskStatus.task_who_changed_name && taskStatus.task_status !== 0 && (
        <div className={css.footer}>
          <User2 size={14} className={css.footerIcon} />
          <span>
            {taskStatus.task_status === 2 ? "Виконав" : "Виконує"}:{" "}
            <strong>{taskStatus.task_who_changed_name}</strong>
          </span>
        </div>
      )}
    </article>
  );
}
