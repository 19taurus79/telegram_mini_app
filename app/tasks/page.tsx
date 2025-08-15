import { getAllTasks } from "@/lib/api";
import css from "./Tasks.module.css";
export default async function Tasks() {
  const tasks = await getAllTasks();
  return (
    <ul className={css.listContainer}>
      {tasks
        .filter((task) => {
          return task.status === "needsAction";
        })
        .map((task) => (
          <li key={task.id} className={css.listItemButton}>
            <h2>{task.title}</h2>
            {task.notes.split("\n").map((note) => (
              <>
                <p key={note}>{note}</p>
                {/* <br /> */}
              </>
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
