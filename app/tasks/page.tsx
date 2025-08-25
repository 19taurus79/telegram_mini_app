// import { getAllTasks } from "@/lib/api";
// import css from "./Tasks.module.css";
import TaskAddBtn from "@/components/TaskAddBtn/TaskAddBtn";
import ClientTasks from "./ClientTasks";
export default async function Tasks() {
  // const tasks = await getAllTasks();

  return (
    <>
      <ClientTasks />
      <TaskAddBtn />
    </>
  );
}
