import css from "./page.module.css";
export default function Home() {
  return (
    <div className={css.container}>
      <h1>Головна сторінка</h1>
      <p>Тут може бути : погода, курси валют, новини, задачі і тд</p>
    </div>
  );
}
