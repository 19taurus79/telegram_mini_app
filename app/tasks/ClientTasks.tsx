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

  useEffect(() => {
    const fetchTasks = async () => {
      const data = await getAllTasks();
      setTasks(data);
    };
    fetchTasks();
  }, []);
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
                  <p style={{ color: "yellow" }} key={index}>
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
