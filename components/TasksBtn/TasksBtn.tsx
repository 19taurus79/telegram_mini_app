"use client";
import { checkTaskCompleted, checkTaskInProgress } from "@/lib/api";
import css from "./TasksBtn.module.css";
import { useState } from "react";
import { TaskStatus } from "@/types/types";
import { getInitData } from "@/lib/getInitData";
import { CheckCircle, Loader2 } from "lucide-react";

export default function TasksBtn({
  taskId,
  taskStatus,
}: {
  taskId: string;
  taskStatus: TaskStatus;
}) {
  const [taskStatusState, setTaskStatusState] = useState(
    taskStatus.task_status
  );
  const [showDialog, setShowDialog] = useState(false);
  const [solution, setSolution] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initData = getInitData();

  const inProgress = (taskId: string) => {
    checkTaskInProgress(taskId, initData);
    setTaskStatusState(1);
  };

  const handleCloseClick = () => {
    setShowDialog(true);
    setSolution("");
  };

  const handleCancel = () => {
    setShowDialog(false);
    setSolution("");
  };

  const handleConfirm = async () => {
    if (!solution.trim()) return;
    setIsSubmitting(true);
    try {
      await checkTaskCompleted(taskId, initData, solution.trim());
      setTaskStatusState(2);
      setShowDialog(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={css.taskContainer}>
      {taskStatusState === 0 && (
        <button
          className={`${css.taskButton} ${css.inProgress}`}
          onClick={() => inProgress(taskId)}
        >
          Взяти в роботу
        </button>
      )}
      {taskStatusState !== 2 && (
        <button
          className={`${css.taskButton} ${css.completed}`}
          onClick={handleCloseClick}
        >
          Закрити
        </button>
      )}

      {/* Діалог введення рішення */}
      {showDialog && (
        <div className={css.dialogOverlay} onClick={handleCancel}>
          <div
            className={css.dialog}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={css.dialogHeader}>
              <CheckCircle size={22} className={css.dialogIcon} />
              <h3 className={css.dialogTitle}>Закрити задачу</h3>
            </div>
            <p className={css.dialogDesc}>
              Опишіть надане рішення перед закриттям. Автор задачі отримає
              Telegram-сповіщення.
            </p>
            <textarea
              className={css.dialogTextarea}
              placeholder="Введіть рішення..."
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className={css.dialogBtns}>
              <button
                className={css.dialogCancel}
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Відміна
              </button>
              <button
                className={css.dialogConfirm}
                onClick={handleConfirm}
                disabled={!solution.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className={css.spinner} />
                ) : (
                  "Підтвердити"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
