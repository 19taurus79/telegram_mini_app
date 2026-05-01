"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEventByUser, getAllTasks } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import { InnerEvent, TaskInner } from "@/types/types";
import Link from "next/link";
import clsx from "clsx";
import css from "./TaskManager.module.css";
import { FadeLoader } from "react-spinners";

export default function TaskManager() {
  const [initData, setInitData] = useState<string>("");

  useEffect(() => {
    const isDev = process.env.NEXT_PUBLIC_DEV === "true";
    if (isDev) {
      setInitData(
        "user=%7B%22id%22%3A548019148%2C%22first_name%22%3A%22%D0%A1%D0%B5%D1%80%D0%B3%D0%B5%D0%B9%22%2C%22last_name%22%3A%22%D0%9E%D0%BD%D0%B8%D1%89%D0%B5%D0%BD%D0%BA%D0%BE%22%2C%22username%22%3A%22OnyshchenkoSergey%22%2C%22language_code%22%3A%22uk%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2Fqf0qiya3lYZumE5ExiC55ONcmy-5vzP6pZzzBMV92vw.svg%22%7D&chat_instance=2337466967032439365&chat_type=private&auth_date=1756120426&signature=mdGQ7UJyhhHYjP3-AsE5tn6HFTGP2LGh1Y_DRkgQTZAkmAHy-pYlqcRtJXHxUrK15v0-Y6sp3ktT2rMwszthDA&hash=b2e3a2aa200dd954538a7d65de4dafeab9f4967ca7381bd2d8a746d4d28ad0a9"
      );
    } else if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
      setInitData(window.Telegram.WebApp.initData);
    } else {
      setInitData(getInitData());
    }
  }, []);

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", initData],
    queryFn: () => getEventByUser(initData!),
    enabled: !!initData,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", initData],
    queryFn: () => getAllTasks(initData!),
    enabled: !!initData,
  });

  if (!initData) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const sortItems = (items: any[]) => {
    return [...items].sort((a, b) => {
      // 1. Сортування за статусом (0 -> 1 -> 2)
      const statusA = a.event_status !== undefined ? a.event_status : a.task_status;
      const statusB = b.event_status !== undefined ? b.event_status : b.task_status;
      if (statusA !== statusB) return statusA - statusB;
      
      // 2. Сортування за алфавітом (назва клієнта/завдання)
      const titleA = a.event || a.task || "";
      const titleB = b.event || b.task || "";
      return titleA.localeCompare(titleB);
    });
  };

  const todayEvents = sortItems(events?.filter((e) => e.start_event === todayStr) || []);
  const tomorrowEvents = sortItems(events?.filter((e) => e.start_event === tomorrowStr) || []);
  const activeTasks = sortItems(tasks?.filter((t) => t.task_status !== 2) || []);

  const renderEvent = (event: InnerEvent) => (
    <Link key={event.id} href={`/events/${event.event_id}`} className={css.item}>
      <div className={css.itemHeader}>
        <span className={css.itemTitle}>{event.event}</span>
        <span className={clsx(css.status, css[`status_${event.event_status}`])} />
      </div>
      <div className={css.itemMeta}>Автор: {event.event_who_changed_name || event.event_creator_name || "Система"}</div>
    </Link>
  );

  const renderTask = (task: TaskInner) => (
    <Link key={task.id} href={`/tasks/${task.task_id}`} className={css.item}>
      <div className={css.itemHeader}>
        <span className={css.itemTitle}>{task.task}</span>
        <span className={clsx(css.status, css[`status_${task.task_status}`])} />
      </div>
      <div className={css.itemMeta}>Створив: {task.task_creator_name}</div>
    </Link>
  );

  return (
    <div className={css.container}>
      <div className={css.header}>
        <h2 className={css.title}>🚀 Менеджер завдань</h2>
        <a 
          href="https://calendar.google.com/calendar/u/0?cid=dca9aa4129540be8ec133f20092e7f0a500897595fc1736cd295a739d9dc9466@group.calendar.google.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className={css.calendarButton}
        >
          <span className={css.calendarIcon}>📅</span>
          <span className={css.calendarText}>Календар доставок</span>
        </a>
      </div>
      
      {(eventsLoading || tasksLoading) ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <FadeLoader color="#0ef18e" />
        </div>
      ) : (
        <div className={css.grid}>
          {/* Сьогодні */}
          <div className={css.section}>
            <div className={css.sectionTitle}>
              Сьогодні <span className={css.count}>{todayEvents.length}</span>
            </div>
            <div className={css.list}>
              {todayEvents.length > 0 ? todayEvents.map(renderEvent) : <div className={css.noData}>Подій немає</div>}
            </div>
          </div>

          {/* Завтра */}
          <div className={css.section}>
            <div className={css.sectionTitle}>
              Завтра <span className={css.count}>{tomorrowEvents.length}</span>
            </div>
            <div className={css.list}>
              {tomorrowEvents.length > 0 ? tomorrowEvents.map(renderEvent) : <div className={css.noData}>На завтра пусто</div>}
            </div>
          </div>

          {/* Активні завдання */}
          <div className={css.section}>
            <div className={css.sectionTitle}>
              Активні завдання <span className={css.count}>{activeTasks.length}</span>
            </div>
            <div className={css.list}>
              {activeTasks.length > 0 ? activeTasks.map(renderTask) : <div className={css.noData}>Завдань немає</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
