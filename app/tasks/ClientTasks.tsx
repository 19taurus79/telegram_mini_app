"use client";

import React, { useState, useEffect, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FadeLoader } from "react-spinners";
import clsx from "clsx";
import css from "./Tasks.module.css";
import { getAllTasks } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import { CheckCircle, Clock, User, ChevronRight, AlertCircle } from "lucide-react";

const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
};

interface Task {
  task_id: string;
  task: string;
  task_creator_name: string;
  task_status: number;
}

export default function ClientTasks() {
  const [initData, setInitData] = useState<string>("");

  useEffect(() => {
    const isDev = process.env.NEXT_PUBLIC_DEV === "true";
    if (isDev) {
      setInitData(
        "user=%7B%22id%22%3A548019148%2C%22first_name%22%3A%22%D0%A1%D0%B5%D1%80%D0%B3%D0%B5%D0%B9%22%2C%22last_name%22%3A%22%D0%9E%D0%BD%D0%B8%D1%89%D0%B5%D0%BD%D0%BA%D0%BE%22%2C%22username%22%3A%22OnyshchenkoSergey%22%2C%22language_code%22%3A%22uk%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2Fqf0qiya3lYZumE5ExiC55ONcmy-5vzP6pZzzBMV92vw.svg%22%7D&chat_instance=2337466967032439365&chat_type=private&auth_date=1756120426&signature=mdGQ7UJyhhHYjP3-AsE5tn6HFTGP2LGh1Y_DRkgQTZAkmAHy-pYlqcRtJXHxUrK15v0-Y6sp3ktT2rMwszthDA&hash=b2e3a2aa200dd954538a7d65de4dafeab9f4967ca7381bd2d8a746d4d28ad0a9"
      );
    } else {
      setInitData(getInitData());
    }
  }, []);

  const { data, isLoading, isError } = useQuery<Task[]>({
    queryKey: ["tasks", initData],
    queryFn: () => getAllTasks(initData!),
    enabled: !!initData,
  });

  const router = useRouter();
  const handleClick = (id: string) => {
    router.push(`/tasks/${id}`);
  };

  const tasks: Task[] = data ?? [];

  const sortedTasks = [...tasks].sort((a, b) => {
    // 1. Сортування за статусом (Світлофор: 0-Червоний -> 1-Жовтий -> 2-Зелений)
    if (a.task_status !== b.task_status) {
      return a.task_status - b.task_status;
    }
    // 2. Сортування за алфавітом (Клієнт/Назва завдання) всередині одного статусу
    return a.task.localeCompare(b.task);
  });

  return (
    <div className={css.listContainer}>
      {isLoading && (
        <div style={{ height: '50vh', display: 'flex', alignItems: 'center' }}>
          <FadeLoader color="#0ef18e" cssOverride={override} />
        </div>
      )}
      
      {isError && (
        <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
          <AlertCircle size={48} style={{ marginBottom: '12px' }} />
          <p>Помилка завантаження завдань</p>
        </div>
      )}

      {!isLoading && !isError && tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '100px 20px', opacity: 0.5 }}>
          <CheckCircle size={64} style={{ marginBottom: '16px' }} />
          <h3>Завдань не знайдено</h3>
          <p>Ви виконали всі поточні завдання!</p>
        </div>
      )}

      {sortedTasks.map((task) => (
        <div
          key={task.task_id}
          className={css.listItemButton}
          onClick={() => handleClick(task.task_id)}
        >
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div className={clsx(css.statusIcon, {
              [css.created]: task.task_status === 0,
              [css.inProgress]: task.task_status === 1,
              [css.completed]: task.task_status === 2,
            })}>
              {task.task_status === 0 && <AlertCircle size={22} />}
              {task.task_status === 1 && <Clock size={22} />}
              {task.task_status === 2 && <CheckCircle size={22} />}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className={css.taskTitle}>{task.task}</span>
              <span className={css.creator}>
                <User size={12} />
                {task.task_creator_name}
              </span>
            </div>
          </div>

          <ChevronRight size={18} style={{ opacity: 0.3 }} />
        </div>
      ))}
    </div>
  );
}
