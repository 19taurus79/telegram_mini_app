import Modal from "@/components/Modal/Modal";
import { getRemainsById } from "@/lib/api";
// import { getInitData } from "@/lib/getInitData";

// type Props = {
//   params: Promise<{ slug: string[] }>;
// };
type Props = {
  params: Promise<{ id: string }>;
};
async function filteredRemains({ params }: Props) {
  const id = await params;
  // const initData = getInitData();
  console.log(id);
  const remains = await getRemainsById({ productId: id.id });
  return (
    <Modal>
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
    </Modal>
  );
}

export default filteredRemains;
