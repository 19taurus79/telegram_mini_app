import { getRemainsById } from "@/lib/api";
// import { getInitData } from "@/lib/getInitData";

type Props = {
  params: Promise<{ slug: string[] }>;
};
async function filteredRemains({ params }: Props) {
  const slug = await params;
  console.log(slug);
  // const initData = await getInitData();
  const remains = await getRemainsById({ productId: slug.slug[0] });
  return (
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
  );
}

export default filteredRemains;
