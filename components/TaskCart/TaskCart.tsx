import { TaskGoogle, TaskStatus } from "@/types/types";
import css from "./TaskCart.module.css";
export default function TaskCart({
  task,
  taskStatus,
}: {
  task: TaskGoogle;
  taskStatus: TaskStatus;
}) {
  return (
    <ul className={css.listContainer}>
      {taskStatus.task_status === 1 && (
        <li className={css.inProgress}>
          Задачу виконує: {taskStatus.task_who_changed_name}
        </li>
      )}
      {taskStatus.task_status === 2 && (
        <li className={css.completed}>
          Задачу закрив: {taskStatus.task_who_changed_name}
        </li>
      )}
      <li className={css.listItemButton} key={task.id}>
        {task.title.split("_").map((part, index) => {
          if (index === 0) {
            return <h2 key={index}>{part}</h2>;
          }
          // } else if (index === 1) {
          //   return (
          //     <p style={{ color: "yellow" }} key={index}>
          //       {part}
          //     </p>
          //   );
          // } else {
          //   return null;
          // }
        })}
      </li>
      {task.notes.split("\n").map((note, index) => (
        <li key={index}>{note}</li>
      ))}
    </ul>
  );
}
