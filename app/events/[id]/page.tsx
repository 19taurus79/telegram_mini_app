import BackBtn from "@/components/BackBtn/BackBtn";
import DetailEvent from "./detailEvent";

export default async function DetailEventData({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // await перед использованием параметров

  return (
    <>
      <DetailEvent id={id} />
      <BackBtn />
    </>
  );
}
