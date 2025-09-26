import DetailTask from "./detailTask";

type Props = {
  // Adhering to project's specific convention of props being Promises.
  params: Promise<{ task: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};
export default async function DetailTaskData({ params, searchParams }: Props) {
  const { task } = await params; // await перед использованием параметров
  const resolvedSearchParams = await searchParams;
  return (
    <>
      <DetailTask
        taskId={task}
        searchParams={resolvedSearchParams.from_link as string}
      />
      {/* <div>Task ID: {task}</div>
      <div>Search params: {resolvedSearchParams.from_link}</div> */}
    </>
  );
}
