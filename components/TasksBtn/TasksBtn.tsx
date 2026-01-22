"use client";
import { checkTaskCompleted, checkTaskInProgress } from "@/lib/api";
import css from "./TasksBtn.module.css";
import { useState } from "react";
import { TaskStatus } from "@/types/types";

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
  
  const inProgress = (taskId: string) => {
    checkTaskInProgress(taskId);
    setTaskStatusState(1);
    // console.log(`task ${taskId} in progress`);
  };
  const close = (taskId: string) => {
    // console.log(`task ${taskId} close`);
    checkTaskCompleted(taskId);
    setTaskStatusState(2);
  };
  console.log("taskStatus", taskStatus, typeof taskStatus);
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
          onClick={() => close(taskId)}
        >
          Закрити
        </button>
      )}
    </div>
  );
}
