import BackBtn from "@/components/BackBtn/BackBtn";
import { getRemainsById } from "@/lib/api";

// type Props = {
//   params: Promise<{ slug: string[] }>;
// };
type Props = {
  params: Promise<{ id: string }>;
};

export default async function filteredRemains({ params }: Props) {
  const id = await params;

  console.log(id);
  const remains = await getRemainsById({ productId: id.id });
  return (
    <>
      <ul>
        {remains.map((item) => (
          <li key={item.id}>
            <p>Номенклатура: {item.nomenclature}</p>
            <p>Партия: {item.nomenclature_series}</p>
            <p>Бух: {item.buh}</p>
            <p>Склад: {item.skl}</p>
            <br />
          </li>
        ))}
      </ul>
      <BackBtn />
    </>
  );
}
