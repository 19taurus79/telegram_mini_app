# Огляд Проєкту

Це Next.js (React, TypeScript) проєкт, створений за допомогою `create-next-app`. Він функціонує як клієнтський додаток, ймовірно Telegram Mini App, що взаємодіє з бекенд API для управління бізнес-аналітикою (BI), замовленнями, залишками на складах, завданнями, подіями та доставками. Ключові технології включають Next.js для фреймворку, React для UI, TypeScript для типобезпеки, TanStack Query для отримання та кешування даних, Zustand для управління станом, Formik та Yup для роботи з формами, Axios для API запитів, react-hot-toast для сповіщень, та Leaflet для роботи з картами.

## Збірка та Запуск

Проєкт використовує стандартні Next.js скрипти для розробки, збірки та запуску додатку.

*   **Встановлення залежностей:**
    ```bash
    npm install
    ```
*   **Запуск сервера розробки:**
    ```bash
    npm run dev
    ```
    (Це запустить сервер розробки на `http://localhost:3000`)
*   **Збірка для продакшену:**
    ```bash
    npm run build
    ```
*   **Запуск продакшн сервера:**
    ```bash
    npm run start
    ```
*   **Запуск лінтера:**
    ```bash
    npm run lint
    ```

## Конвенції Розробки

*   **Мова:** TypeScript використовується у всьому проєкті для типобезпеки та покращення якості коду.
*   **Лінтинг та Форматування:** ESLint та Prettier налаштовані для забезпечення консистентного стилю коду та виявлення потенційних проблем.
*   **Отримання Даних:** TanStack Query використовується для управління серверним станом, включаючи отримання даних, кешування та синхронізацію.
*   **Управління Станом:** Zustand використовується для управління клієнтським станом.
*   **Робота з Формами:** Formik та Yup використовуються для створення та валідації форм.
*   **Взаємодія з API:** Вся комунікація з бекендом здійснюється через `axios` у файлі `lib/api.ts`, часто включаючи заголовки `X-Telegram-Init-Data` або `Authorization` з токеном.
*   **Структура Компонентів:** Компоненти організовані в директорії `components/`, з окремими піддиректоріями для пов'язаних функціональностей (наприклад, `components/Bi/`, `components/MapModule/`). Сторінки визначені в директорії `app/` згідно з конвенціями Next.js.

## Ключові Модулі та Функціональність

### 1. Аутентифікація (`AuthGuard.tsx`, `store/Auth.ts`, `store/InitData.ts`)

Система підтримує **два незалежних режими аутентифікації**:

#### Режим 1: Telegram Mini App
- **Механізм**: Використовує `initData` з Telegram WebApp API
- **Заголовок**: `X-Telegram-Init-Data` додається до кожного запиту
- **Зберігання**: `initData` зберігається в Zustand store (`useInitData`)
- **Процес**:
  1. При запуску додатку в Telegram, `getInitData()` отримує `window.Telegram.WebApp.initData`
  2. `AuthGuard` викликає `getUser()` для отримання даних користувача
  3. Axios interceptor автоматично додає `X-Telegram-Init-Data` заголовок
  4. Токен не потрібен - кожен запит автентифікується через `initData`

#### Режим 2: Web Login (Браузер)
- **Механізм**: JWT токени через `loginWithWidget`
- **Заголовок**: `Authorization: Bearer {token}` додається до кожного запиту
- **Зберігання**: `accessToken` та `user` зберігаються в localStorage через Zustand persist
- **Процес**:
  1. Користувач логінується через `/login` сторінку
  2. `loginWithWidget()` повертає `access_token` та дані користувача
  3. Токен зберігається в `useAuthStore` та автоматично персистується
  4. Axios interceptor додає `Authorization` заголовок, якщо немає `initData`

#### Axios Interceptor (`lib/api.ts`)
```javascript
api.interceptors.request.use((config) => {
  const initData = useInitData.getState().initData;
  const accessToken = useAuthStore.getState().accessToken;

  if (initData) {
    // Telegram Mini App режим
    config.headers["X-Telegram-Init-Data"] = initData;
  } else if (accessToken) {
    // Web Login режим
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  }
  
  return config;
});
```

#### AuthGuard Логіка
- Автоматично визначає режим роботи (Telegram vs Browser)
- Завантажує дані користувача при старті
- Редиректить на `/login` якщо не автентифіковано (тільки в браузері)
- Показує loader під час перевірки автентифікації

### 2. Модуль Карти (`components/MapModule/`)
Складний модуль для роботи з картами на базі Leaflet, що включає:
- **Відображення клієнтів** з адресами на карті
- **Відображення доставок** з маркерами та статусами
- **Heatmap візуалізація** замовлень з ваговою інтенсивністю
- **Маршрутизація** між точками
- **Геокодування** адрес
- **Управління складами** та їх відображення

Ключові файли:
- `MapFeature.jsx` - основний компонент карти
- `fetchOrdersWithAddresses.js` - логіка отримання та об'єднання даних замовлень з адресами
- `components/bottomData/bottomData.jsx` - панель деталей для вибраних об'єктів на карті

### 3. Дашборд Замовлень (`app/orders/page.tsx`, `ORDERS_DASHBOARD_README.md`)
Система "Command Center" для управління замовленнями:
- **Каскадне завантаження даних**: Клієнти → Контракти → Деталі
- **Збагачення даних**: автоматичне додавання інформації про партії та залишки
- **Drag-and-Drop макет** з збереженням в localStorage
- **Фільтрація** за контрактами та статусами

### 4. Система Доставок (`app/delivery/page.tsx`, `store/Delivery.ts`)
Управління доставками з можливістю:
- Створення нових доставок з вибором товарів та партій
- Розрахунок ваги на основі складної бізнес-логіки
- Відстеження статусів: "Створено", "В роботі", "Виконано"
- Інтеграція з картою для відображення маршрутів
- Редагування та оновлення доставок

### 5. Бізнес-Аналітика (`app/bi/page.tsx`, `components/Bi/`)
Аналітичні віджети для:
- Залишків на складах (з серіями та без)
- Замовлень з розбивкою на "є в наявності" та "немає в наявності"
- Фільтрація за статусами документів та доставки

### 6. Завдання та Події (`app/tasks/`, `app/events/`)
Інтеграція з Google Tasks та Google Calendar:
- Відображення завдань та подій
- Зміна статусів (в процесі, виконано)
- Створення нових завдань
- Відстеження хто змінив статус

### 7. Залишки (`app/remains/page.tsx`)
Відображення залишків товарів на складах з:
- Accordion UI для мобільних пристроїв
- Розділами: Залишки, Переміщені товари, Замовлення
- Детальною інформацією про партії

### 8. Адмін Панель (`app/admin/`)
Завантаження та зіставлення даних:
- Завантаження файлів Excel (Заказано, Перемещено)
- Ручне зіставлення даних через UI
- Трьохетапний процес обробки (детально описано в `README.md`)

## Управління Станом

### Zustand Stores (`store/`)
- `Auth.ts` - аутентифікація та токени
- `Delivery.ts` - стан доставок
- `InitData.ts` - Telegram init data
- `User.ts` - дані користувача
- `DetailsDataStore.ts` - деталі для відображення
- `FormAndMenuTogls.ts` - стан UI елементів

### MapModule Stores (`components/MapModule/store/`)
- `applicationsStore.js` - заявки та доставки
- `mapControlStore.js` - контроль видимості шарів карти
- `displayAddress.js` - вибрані адреси

## API Endpoints (`lib/api.ts`)

Основні категорії:
- **Аутентифікація**: `loginWithWidget`
- **Залишки**: `getRemainsById`, `getRemainsByProduct`, `getGroupRemainsById`, `getAvRemainsById`
- **Замовлення**: `getOrders`, `getOrdersByProduct`, `getOrdersDetailsById`, `getTotalSumOrderByProduct`
- **Клієнти**: `getClients`, `getAddressByClient`, `createClientAddress`, `updateClientAddress`
- **Доставки**: `sendDeliveryData`, `updateDeliveryData`, `getDeliveries`
- **Товари**: `getAllProduct`, `getProductDetailsById`, `getProductOnWarehouse`
- **Партії**: `getPartyData`, `getIdRemainsByParty`
- **Переміщення**: `getMovedDataByProduct`
- **Завдання**: `getAllTasks`, `getTaskById`, `createTask`, `checkTaskInProgress`, `checkTaskCompleted`
- **Події**: `getEvents`, `getEventById`, `getEventByUser`, `checkEventInProgress`, `checkEventCompleted`
- **BI**: `getRemainsForBi`, `dataForOrderByProduct`
- **Вага**: `getWeightForProduct` - складна логіка розрахунку ваги товару

## Типи (`types/types.ts`)

Всі TypeScript типи централізовані в одному файлі, включаючи:
- Типи даних для замовлень, залишків, клієнтів, доставок
- Типи для Google Tasks та Calendar
- Типи для BI аналітики
- Типи для адмін панелі (MatchingData)

## Особливості Проєкту

1. **Telegram Mini App**: Інтеграція з Telegram через initData
2. **Складна логіка ваги**: Розрахунок ваги товарів з урахуванням партій та типу товару (насіння vs інші)
3. **Мультимодальна карта**: Підтримка різних режимів відображення (клієнти, доставки, заявки, heatmap)
4. **Оптимізація запитів**: Використання TanStack Query для кешування та мінімізації запитів
5. **Адаптивний UI**: Мобільна адаптація з accordion та responsive layouts
6. **Експорт даних**: Можливість експорту в Excel (XLSX)
7. **Друк**: Спеціальні view для друку звітів

## Структура Директорій

```
├── app/                    # Next.js App Router сторінки
│   ├── bi/                # Бізнес-аналітика
│   ├── delivery/          # Управління доставками
│   ├── orders/            # Дашборд замовлень
│   ├── remains/           # Залишки на складах
│   ├── tasks/             # Завдання
│   ├── events/            # Події
│   ├── map/               # Карта
│   └── admin/             # Адмін панель
├── components/            # React компоненти
│   ├── MapModule/         # Модуль карти
│   ├── Bi/                # BI компоненти
│   └── ...                # Інші компоненти
├── lib/                   # Утиліти
│   └── api.ts             # API клієнт
├── store/                 # Zustand stores
├── types/                 # TypeScript типи
└── context/               # React Context
```

## Налаштування Середовища

Необхідні змінні оточення (`.env`):
- `NEXT_PUBLIC_URL_API` - URL бекенд API

## Мова Інтерфейсу

Весь UI та повідомлення на українській мові.
