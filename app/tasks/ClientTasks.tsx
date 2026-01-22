"use client";
// import { Task } from "@/types/types";
import css from "./Tasks.module.css";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import React, { CSSProperties } from "react";
import { getAllTasks } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { FadeLoader } from "react-spinners";
const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
};
export default function ClientTasks() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => getAllTasks(),
  });

  const router = useRouter();
  const handleClick = (id: string) => {
    router.push(`/tasks/${id}`);
  };
  //TODO: в фильтр добавить значения для рендера
  const tasks = data ?? [];

  return (
    <ul className={css.listContainer}>
      {isLoading && <FadeLoader color="#0ef18e" cssOverride={override} />}
      {isError && <div>Ошибка загрузки задач</div>}
      {!isLoading && !isError && tasks.length === 0 && (
        <div>Завдань не знайдено</div>
      )}
      {data?.map((task) => (
        <li
          key={task.id}
          className={clsx(css.listItemButton, {
            [css.completed]: task.task_status === 2,
            [css.inProgress]: task.task_status === 1,
          })}
          onClick={() => handleClick(task.task_id)}
        >
          <span>{task.task}</span>
          <span>{task.task_creator_name}</span>
        </li>
      ))}
      {/* {tasks
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

            {task.notes.split("\n").map((note, index) => (
              <React.Fragment key={`${task.id}-${index}`}>
                <p key={note}>{note}</p>
              </React.Fragment>
            ))}
            {task.due && <p>Дата: {task.due.substring(0, 10)}</p>}
          </li>
        ))} */}
    </ul>
  );
}
