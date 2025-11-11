This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Процесс загрузки и сопоставления данных

Процесс загрузки данных в систему является многоэтапным и включает в себя как автоматическую, так и ручную обработку.

### Обзор процесса

1.  **Первичная загрузка:** Пользователь загружает два ключевых файла для инициации процесса.
2.  **Ручное сопоставление:** Система возвращает данные, которые не удалось сопоставить автоматически. Пользователь вручную сопоставляет эти данные через специальный интерфейс.
3.  **Финальная загрузка:** После завершения ручного сопоставления, система получает финальные результаты и загружает оставшиеся файлы.

### Шаг 1: Первичная загрузка файлов

-   **Действие пользователя:** На странице `/admin/upload` пользователь должен выбрать как минимум два файла:
    -   `Заказано` (`ordered`)
    -   `Перемещено` (`moved`)
-   **Запрос:** При нажатии кнопки "Отправить", фронтенд отправляет `POST` запрос на эндпоинт `/upload_ordered_moved`.
-   **Тело запроса:** `FormData`, содержащая два файла с ключами `ordered_file` и `moved_file`.
-   **Ответ сервера:** Сервер обрабатывает эти файлы и возвращает JSON-объект (`MatchingData`), содержащий `session_id` и данные (`leftovers`), которые требуют ручного сопоставления.

### Шаг 2: Ручное сопоставление

-   **Интерфейс:** После получения данных от сервера, UI переключается на компонент `MatchingUI`.
-   **Действие пользователя:** Пользователь видит один или несколько блоков, в каждом из которых есть списки "Перемещения" и "Заказы". Пользователь должен выбрать один элемент из "Перемещений" и один или несколько из "Заказов", чтобы составить пару.
-   **Запрос:** Для каждого сопоставленного блока пользователь нажимает кнопку "Сохранить сопоставления". Это инициирует `POST` запрос на эндпоинт `/process/{session_id}/manual_match`.
-   **Тело запроса:** JSON-объект, содержащий `session_id`, `request_id` (ID блока) и индексы выбранных элементов.
-   **Результат:** Успешно сопоставленный блок плавно исчезает из интерфейса.

### Шаг 3: Завершение и финальная загрузка

-   **Триггер:** Этот шаг запускается автоматически после того, как все блоки были успешно сопоставлены в `MatchingUI`.
-   **Запрос №1 (Получение результатов):**
    -   Фронтенд отправляет `GET` запрос на `/process/{session_id}/results`.
    -   **Ответ сервера:** JSON-объект с полными результатами ручного сопоставления.
-   **Запрос №2 (Финальная загрузка):**
    -   Фронтенд инициирует `POST` запрос на эндпоинт `/upload-data`.
    -   **Тело запроса:** `FormData`, содержащая:
        -   Все **оставшиеся** файлы, которые были выбраны в форме на первом шаге (все, кроме `ordered` и `moved`).
        -   Результаты сопоставления из предыдущего запроса, преобразованные в JSON-строку и отправленные под ключом `manual_matches_json`.
-   **Завершение:** После успешной финальной загрузки, процесс считается завершенным, и интерфейс возвращается в исходное состояние (к форме загрузки файлов).
