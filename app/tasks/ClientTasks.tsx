"use client";
import { Task } from "@/types/types";
import css from "./Tasks.module.css";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import React, { useState, useEffect } from "react";
import { getAllTasks } from "@/lib/api";

export default function ClientTasks() {
  // { tasks }: { tasks: Task[] }
  const [tasks, setTasks] = useState<Task[]>([]);
  const [initData, setInitData] = useState<string | null>(null);
  //TODO: get initData from Telegram WebApp
  //TODO: посмотреть в сторону реактквери или зустанд
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
      setInitData(window.Telegram.WebApp.initData);
    } else {
      setInitData(
        "user=%7B%22id%22%3A548019148%2C%22first_name%22%3A%22%D0%A1%D0%B5%D1%80%D0%B3%D0%B5%D0%B9%22%2C%22last_name%22%3A%22%D0%9E%D0%BD%D0%B8%D1%89%D0%B5%D0%BD%D0%BA%D0%BE%22%2C%22username%22%3A%22OnyshchenkoSergey%22%2C%22language_code%22%3A%22uk%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2Fqf0qiya3lYZumE5ExiC55ONcmy-5vzP6pZzzBMV92vw.svg%22%7D&chat_instance=2337466967032439365&chat_type=private&auth_date=1756120426&signature=mdGQ7UJyhhHYjP3-AsE5tn6HFTGP2LGh1Y_DRkgQTZAkmAHy-pYlqcRtJXHxUrK15v0-Y6sp3ktT2rMwszthDA&hash=b2e3a2aa200dd954538a7d65de4dafeab9f4967ca7381bd2d8a746d4d28ad0a9"
      );
    }
  }, []);
  useEffect(() => {
    const fetchTasks = async () => {
      if (!initData) return;
      const data = await getAllTasks(initData);
      setTasks(data);
    };
    fetchTasks();
  }, [initData]);
  const router = useRouter();
  const handleClick = (id: string) => {
    console.log(id);
    router.push(`/tasks/${id}`);
  };
  //TODO: в фильтр добавить значения для рендера
  return (
    <ul className={css.listContainer}>
      {tasks
        .filter((task) => {
          return task;
        })
        .map((task) => (
          <li
            key={task.id}
            className={clsx(css.listItemButton, {
              [css.completed]: task.status === "completed",
            })}
            data-id={task.id}
            onClick={() => handleClick(task.id)}
          >
            {task.title.split("_").map((part, index) => {
              if (index === 0) {
                return <h2 key={index}>{part}</h2>;
              } else if (index === 1) {
                return (
                  <p style={{ color: "green" }} key={index}>
                    {part}
                  </p>
                );
              } else {
                return null;
              }
            })}
            {/* <h2>{task.title}</h2> */}
            {task.notes.split("\n").map((note) => (
              <React.Fragment key={note}>
                <p key={note}>{note}</p>
                {/* <br /> */}
              </React.Fragment>
            ))}
            {task.due && <p>Дата: {task.due.substring(0, 10)}</p>}
            {/* <p>{task.due.substring(0, 10)}</p> */}
            {/* <a href={task.webViewLink} target="_blank">
              {task.webViewLink}
            </a> */}
          </li>
        ))}
    </ul>
  );
}
