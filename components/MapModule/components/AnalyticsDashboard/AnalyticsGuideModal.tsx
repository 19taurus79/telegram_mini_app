'use client';

import React, { useState, useEffect } from 'react';
import styles from './AnalyticsGuideModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'calculator' | 'map' | 'whatif' | 'territory' | 'details' | 'audit';

export default function AnalyticsGuideModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('calculator');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <span className={styles.headerIcon}>📘</span>
            <div>
              <h2 className={styles.title}>Довідник та Інструкція користувача</h2>
              <span className={styles.subtitle}>Аналітика доставок, Center of Gravity, What-If Planner та Моделювання тарифів</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Закрити">✕</button>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabNav}>
          <button className={`${styles.tabBtn} ${activeTab === 'calculator' ? styles.activeTab : ''}`} onClick={() => setActiveTab('calculator')}>
            💰 Калькулятор витрат
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'map' ? styles.activeTab : ''}`} onClick={() => setActiveTab('map')}>
            🗺️ Карта та Кластери
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'whatif' ? styles.activeTab : ''}`} onClick={() => setActiveTab('whatif')}>
            🏭 What-If Planner
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'territory' ? styles.activeTab : ''}`} onClick={() => setActiveTab('territory')}>
            🗺️ Зони і Території
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'details' ? styles.activeTab : ''}`} onClick={() => setActiveTab('details')}>
            📋 Деталізація та Експорт
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'audit' ? styles.activeTab : ''}`} onClick={() => setActiveTab('audit')}>
            🔍 Якість та Аудит даних
          </button>
        </div>

        {/* Content */}
        <div className={styles.body}>

          {/* ── Калькулятор витрат ── */}
          {activeTab === 'calculator' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>💰 Як працює Калькулятор логістичних витрат</h3>
              <p className={styles.text}>
                Калькулятор моделює та порівнює три сценарії дистрибуції. Усі розрахунки ведуться у <strong>Тонно-Кілометрах (т·км)</strong>, помноженних на ваш тариф.
              </p>

              <div className={styles.modelComparison}>
                <div className={styles.modelCard}>
                  <div className={styles.modelHeader}>
                    <span className={styles.modelBadge}>Сценарій 1</span>
                    <h4>Пряма доставка (Status Quo)</h4>
                  </div>
                  <p className={styles.modelDesc}>Товар зі складу відправляється напряму до кожного клієнта.</p>
                  <div className={styles.formulaBox}>
                    <code>Витрати = Відстань(склад→клієнт) × Вага (т) × Тариф «Пряма»</code>
                  </div>
                </div>

                <div className={styles.modelCard}>
                  <div className={styles.modelHeader}>
                    <span className={styles.modelBadge} style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#34d399' }}>Сценарій 2</span>
                    <h4>Хабова модель (Hub-and-Spoke)</h4>
                  </div>
                  <p className={styles.modelDesc}>Велика фура везе консолідований вантаж до хабу. Від хабу — малі машини до клієнтів.</p>
                  <div className={styles.formulaBox}>
                    <code>= (Склад→Хаб × Вага × Тариф «Магістраль») + (Хаб→Клієнт × Вага × Тариф «Остання миля»)</code>
                  </div>
                </div>

                <div className={styles.modelCard}>
                  <div className={styles.modelHeader}>
                    <span className={styles.modelBadge} style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>Сценарій 3</span>
                    <h4>Пряма від Оптимального РЦ</h4>
                  </div>
                  <p className={styles.modelDesc}>Теоретичний сценарій: а якби склад стояв у математично ідеальній точці (зелена зірочка)?</p>
                  <div className={styles.formulaBox}>
                    <code>= Відстань(ОптРЦ→клієнт) × Вага × Тариф «Пряма»</code>
                  </div>
                </div>
              </div>

              <h4 className={styles.subTitle}>⚙️ Параметри тарифів (₴/т·км)</h4>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Параметр</th>
                      <th>За замовч.</th>
                      <th>Опис</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Пряма доставка</strong></td>
                      <td><code>12 ₴</code></td>
                      <td>Тариф прямої доставки від складу до клієнта</td>
                    </tr>
                    <tr>
                      <td><strong>Магістраль (Хаб)</strong></td>
                      <td><code>5 ₴</code></td>
                      <td>Оптовий тариф великих фур (20–22 т) від бази до хабу</td>
                    </tr>
                    <tr>
                      <td><strong>Остання миля</strong></td>
                      <td><code>18 ₴</code></td>
                      <td>Тариф локальної малотоннажної розвозки від хабу до господарств</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className={`${styles.callout} ${styles.calloutGreen}`} style={{ marginTop: '12px' }}>
                <strong>💡 Якщо ви розвозите зі складу дрібними машинами (не 20-тонниками):</strong>
                <span>
                  Поставте однакове значення у поля &quot;Пряма доставка&quot; та &quot;Остання миля&quot; (наприклад, 18 ₴).
                  Тоді алгоритм покаже реальну економію від того, що магістральне плече (склад→хаб) їде дешевшою фурою.
                </span>
              </div>

              <h4 className={styles.subTitle}>📈 Як читати результати</h4>
              <div className={styles.calloutGroup}>
                <div className={`${styles.callout} ${styles.calloutGreen}`}>
                  <strong>🟢 Зелена «Економія від Хабів» (+X ₴):</strong>
                  <span>Хабова схема вигідна — ця сума є прямою економією, яку можна спрямувати на оренду регіонального складу.</span>
                </div>
                <div className={`${styles.callout} ${styles.calloutRed}`}>
                  <strong>🔴 Червона «Економія від Хабів» (-X ₴):</strong>
                  <span>Пряма доставка дешевша. Зазвичай це означає, що тариф останньої милі зависокий, або клієнти розташовані надто близько до головного складу.</span>
                </div>
                <div className={`${styles.callout} ${styles.calloutGreen}`}>
                  <strong>🟢 «Економія від переносу РЦ» (+X ₴):</strong>
                  <span>Показує, скільки ви заощадите щомісяця, якщо перенесете головний склад до Оптимального РЦ (зелена зірочка).</span>
                </div>
              </div>

              <div className={styles.callout} style={{ marginTop: '12px' }}>
                <strong>🛣️ Реальні дороги (Valhalla API):</strong>
                <span>Увімкніть чекбокс &quot;Реальні дороги&quot; для точного розрахунку по фактичних маршрутах України (замість прямої лінії × 1.3). Потребує ~5–10 секунд.</span>
              </div>
            </div>
          )}

          {/* ── Карта та Кластери ── */}
          {activeTab === 'map' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🗺️ Як читати Карту та Кластери</h3>
              
              <div className={styles.featureGrid}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🌟</div>
                  <div>
                    <h4 className={styles.featureHeading}>Оптимальний РЦ (зелена зірочка)</h4>
                    <p className={styles.text}>
                      <strong>Center of Gravity</strong> — математично розрахована точка мінімального сумарного тонно-кілометражу.
                      Кожне замовлення &quot;притягує&quot; точку пропорційно своїй вазі. Це теоретично ідеальне місце для головного складу.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🔷</div>
                  <div>
                    <h4 className={styles.featureHeading}>Кольорові Зони (Кластери)</h4>
                    <p className={styles.text}>
                      Автоматичне групування замовлень алгоритмом <strong>K-Means (Ллойда)</strong>. Алгоритм ітераційно знаходить
                      ідеальний локальний Центр Мас для кожної зони. Яскравіший колір = вища щільність (т/км²).
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🔴</div>
                  <div>
                    <h4 className={styles.featureHeading}>Локальні Хаби (червоний квадрат)</h4>
                    <p className={styles.text}>
                      Центр Тяжіння кожної зони окремо. Ідеальне місце для регіонального перевантажувального складу.
                      Саме від цих точок рахується &quot;Остання миля&quot; в калькуляторі.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🌡️</div>
                  <div>
                    <h4 className={styles.featureHeading}>Теплова карта + Мітки тоннажу</h4>
                    <p className={styles.text}>
                      Синій→Червоний градієнт показує щільність вантажопотоку. Поверх кожного кластера відображається мітка
                      з тоннажем і кількістю клієнтів. Вимкнути мітки можна у <strong>Налаштуваннях Алгоритму</strong>.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🖱️</div>
                  <div>
                    <h4 className={styles.featureHeading}>Клік на Полігон — Аналітична Картка</h4>
                    <p className={styles.text}>
                      При кліку на будь-який кольоровий полігон у правому куті карти з&apos;являється <strong>Аналітична Картка</strong>:
                      тоннаж зони, площа, щільність, топ-3 клієнти, товарний мікс.
                      Закрити: кнопка <strong>✕</strong> або клавіша <strong>Esc</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <h4 className={styles.subTitle} style={{ marginTop: '24px' }}>⚙️ Налаштування Алгоритму (Super Analyst)</h4>
              <ul className={styles.list}>
                <li>
                  <strong>Кількість Авто-Хабів (K-Means):</strong> скільки регіональних зон потрібно побудувати.
                  Збільшіть до 2–3, щоб система поставила окремий хаб у Харків і окремий у Суми.
                </li>
                <li>
                  <strong>Режим &quot;По Тоннажу&quot;:</strong> Центр Тяжіння зміщується туди, де найбільша вага.
                  Мінімізує загальний тонно-кілометраж.
                </li>
                <li>
                  <strong>Режим &quot;По Географії&quot;:</strong> рівний центр між усіма точками, незалежно від ваги.
                </li>
                <li>
                  <strong>Фільтрація аномалій (Z-Score):</strong> автоматично відсіює поодинокі, надто далекі доставки,
                  щоб вони не &quot;відтягували&quot; склад від основної маси клієнтів.
                  М&apos;яка (3 Sigma) = 99.7% клієнтів залишаються. Жорстка (2 Sigma) = 95%.
                  Вимкніть, якщо хочете враховувати абсолютно всі точки.
                </li>
                <li>
                  <strong>Мітки тоннажу на карті:</strong> показує/приховує підписи &quot;X т / Y кл.&quot; поверх хабів.
                </li>
              </ul>
            </div>
          )}

          {/* ── What-If Planner ── */}
          {activeTab === 'whatif' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🏭 What-If Warehouse Planner — Кандидатні Склади</h3>

              <p className={styles.text}>
                Цей режим дозволяє вам самостійно <strong>розставити потенційні місця для складів</strong> на карті
                та миттєво побачити, як зміняться зони обслуговування та вартість логістики.
              </p>

              <div className={styles.featureGrid}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>1️⃣</div>
                  <div>
                    <h4 className={styles.featureHeading}>Увімкніть режим</h4>
                    <p className={styles.text}>
                      У панелі &quot;Джерела та Хаби&quot; знайдіть розділ <strong>&quot;🏭 Кандидатні Склади (What-If)&quot;</strong>
                      і натисніть кнопку <strong>&quot;🏭 Додати кандидатний склад&quot;</strong>.
                      На карті з&apos;явиться <strong>фіолетовий банер</strong>, курсор стане хрестиком.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>2️⃣</div>
                  <div>
                    <h4 className={styles.featureHeading}>Розставте точки</h4>
                    <p className={styles.text}>
                      Клікайте на карті у місцях, де розглядаєте відкриття складу (наприклад, Суми, Полтава, Харків-Схід).
                      Кожен клік додає кольоровий маркер <strong>🏭 Кандидат N</strong>.
                      Назву можна змінити прямо у списку в панелі. Маркер можна <strong>перетягнути мишкою</strong> на нове місце.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>3️⃣</div>
                  <div>
                    <h4 className={styles.featureHeading}>Миттєвий перерахунок</h4>
                    <p className={styles.text}>
                      Щойно маркер поставлено або переміщено — система <strong>автоматично</strong> перерозподіляє
                      всіх клієнтів до найближчого кандидатного складу і перемальовує зони обслуговування.
                      Калькулятор витрат теж оновлюється в реальному часі.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>4️⃣</div>
                  <div>
                    <h4 className={styles.featureHeading}>Завершіть і порівняйте</h4>
                    <p className={styles.text}>
                      Натисніть <strong>&quot;✕ Завершити розстановку&quot;</strong>, щоб вийти з режиму.
                      Маркери залишаться на карті. Натисніть <strong>&quot;💾 Зберегти як сценарій А/Б&quot;</strong>
                      у калькуляторі витрат, щоб порівняти цей варіант з іншим розташуванням.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🗑️</div>
                  <div>
                    <h4 className={styles.featureHeading}>Видалення</h4>
                    <p className={styles.text}>
                      Клікніть на маркер складу → у popup натисніть &quot;🗑️ Видалити&quot;.
                      Або у панелі натисніть <strong>✕</strong> поруч з назвою кандидата.
                      Кнопка <strong>&quot;🗑️ Очистити всі кандидати&quot;</strong> скидає всю розстановку.
                      Кандидати зберігаються в пам&apos;яті браузера і не зникають після перезавантаження сторінки.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🚚</div>
                  <div>
                    <h4 className={styles.featureHeading}>Режим «Прямі склади» (Без РЦ)</h4>
                    <p className={styles.text}>
                      Якщо увімкнути цей чекбокс, магістральне плече від головного РЦ вимикається. 
                      Вважається, що ваші кандидатні склади отримують товар напряму від постачальників, 
                      і вартість логістики рахуватиметься тільки за тарифом <strong>Останньої милі</strong> від хабу до клієнта.
                    </p>
                  </div>
                </div>
              </div>

              <div className={`${styles.callout} ${styles.calloutGreen}`} style={{ marginTop: '16px' }}>
                <strong>💡 Практичний сценарій використання:</strong>
                <span>
                  1. Поставте 2–3 кандидати → подивіться, як кластери &quot;магнітяться&quot; до них.
                  2. Збережіть як &quot;Сценарій А&quot; у калькуляторі.
                  3. Перемістіть маркери → збережіть як &quot;Сценарій Б&quot;.
                  4. Натисніть &quot;📊 Порівняти А vs Б&quot; — система покаже таблицю різниці у витратах.
                </span>
              </div>
            </div>
          )}

          {/* ── Території та Зони ── */}
          {activeTab === 'territory' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🗺️ Управління Територіями (Збережені Зони)</h3>
              <p className={styles.text}>
                Інструмент для малювання полігонів, що дозволяє чітко розмежувати території обслуговування 
                та прив&apos;язати конкретні регіони до певних складів.
              </p>

              <div className={styles.featureGrid}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🖍️</div>
                  <div>
                    <h4 className={styles.featureHeading}>Малювання зон</h4>
                    <p className={styles.text}>
                      Натисніть <strong>&quot;🖍️ Намалювати нову зону&quot;</strong> у блоці D. Клікайте на карті, обводячи потрібну територію. 
                      Система оснащена <strong>магнітом</strong> (точки прилипають одна до одної) та захистом від перетину ліній 
                      для точної розмітки. Щоб замкнути полігон, клікніть на початкову точку.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🧮</div>
                  <div>
                    <h4 className={styles.featureHeading}>Автоматичний перерахунок</h4>
                    <p className={styles.text}>
                      Відразу після створення зони алгоритм аналізує всі координати клієнтів і 
                      миттєво підраховує кількість клієнтів та загальний тоннаж всередині зони.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🔗</div>
                  <div>
                    <h4 className={styles.featureHeading}>Прив&apos;язка до складу</h4>
                    <p className={styles.text}>
                      У списку збережених зон ви можете обрати будь-який склад зі списку (включно з вашими 
                      кандидатними складами). Зона на карті <strong>змінить колір</strong> під колір складу, 
                      візуально об&apos;єднуючи територію.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>📋</div>
                  <div>
                    <h4 className={styles.featureHeading}>Експорт та Збереження</h4>
                    <p className={styles.text}>
                      Усі ваші зони автоматично зберігаються в пам&apos;ять браузера і не зникають після оновлення сторінки. 
                      При натисканні на <strong>&quot;Excel&quot;</strong>, ці дані додаються до звіту: 
                      з&apos;являються колонки &quot;Зона (Територія)&quot; та &quot;Склад обслуговування&quot;.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Деталізація та Експорт ── */}
          {activeTab === 'details' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>📋 Деталізація Зони та Експорт даних</h3>
              
              <p className={styles.text}>
                Клікніть на будь-який полігон на карті — з&apos;являться <strong>два способи</strong> переглянути деталі:
              </p>

              <div className={styles.featureGrid}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>💬</div>
                  <div>
                    <h4 className={styles.featureHeading}>Аналітична Картка (швидкий перегляд)</h4>
                    <p className={styles.text}>
                      Відразу при кліку у правому куті карти з&apos;являється плаваюча картка з ключовими показниками:
                      тоннаж, кількість клієнтів, площа, щільність, топ-3 клієнти, товарний мікс.
                      Закрити: кнопка ✕ або Esc.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>📋</div>
                  <div>
                    <h4 className={styles.featureHeading}>Віджет «Деталізація Зони» (повний звіт)</h4>
                    <p className={styles.text}>
                      Кнопка <strong>&quot;📋 Відкрити повну деталізацію →&quot;</strong> у картці або прямий клік на полігоні
                      відкриває розгорнутий профіль зони у нижній частині дашборду:
                    </p>
                    <ul className={styles.list} style={{ marginTop: '8px' }}>
                      <li><strong>Огляд зони:</strong> вага (т), площа (км²), щільність (т/км²).</li>
                      <li><strong>Топ Клієнти:</strong> рейтинг господарств за обсягом замовлень.</li>
                      <li><strong>Товарний мікс:</strong> перелік номенклатури для планування вимог до складу.</li>
                      <li><strong>Всі доставки:</strong> повний реєстр адрес і накладних.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className={styles.callout} style={{ marginTop: '16px' }}>
                <strong>📊 Експорт в Excel:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Кнопка «Excel» у картці фільтрів формує зведений звіт по всіх зонах, координатах хабів та клієнтах.
                  Корисно для презентацій перед керівництвом або для передачі даних у відділ продажів.
                </p>
              </div>
            </div>
          )}

          {/* ── Якість та Аудит даних ── */}
          {activeTab === 'audit' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🔍 Якість даних, виключені замовлення та Авто-вага</h3>
              <p className={styles.text}>
                Для коректного розрахунку витрат системі потрібні <strong>координати та вага</strong> кожного замовлення.
                Віджет «Аудит Даних» контролює повноту вибірки та показує, скільки замовлень і чому виключено.
              </p>

              <div className={styles.featureGrid}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🟡</div>
                  <div>
                    <h4 className={styles.featureHeading}>Замовлення без ваги (0 кг)</h4>
                    <p className={styles.text}>
                      Якщо в 1С для частини номенклатури не заповнено вагу, увімкніть
                      <strong> «Авто-вага для замовлень без ваги»</strong> і вкажіть номінальну вагу (наприклад, 100 кг).
                      Усі замовлення без ваги миттєво підключаться до аналітики.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🔴</div>
                  <div>
                    <h4 className={styles.featureHeading}>Клієнти без координат</h4>
                    <p className={styles.text}>
                      Господарства, які не геокодовані на карті, виключаються з аналітики автоматично.
                      Клікніть кнопку <strong>«Переглянути негеокодованих»</strong>, щоб відкрити список
                      і перейти до модуля прив&apos;язки адрес.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>📊</div>
                  <div>
                    <h4 className={styles.featureHeading}>Лічильники в KPI-рядку</h4>
                    <p className={styles.text}>
                      У верхньому рядку дашборду відображається: загальна кількість доставок в аналітиці,
                      загальний тоннаж, кількість кластерів і поточна економія від хабів.
                      Значок ⚠️ сигналізує про знижену точність (велика частка авто-ваги).
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🔄</div>
                  <div>
                    <h4 className={styles.featureHeading}>Вибір джерела даних</h4>
                    <p className={styles.text}>
                      Перемикайтеся між <strong>«Заявки 1С»</strong> (усі CRM-замовлення),
                      <strong> «Доставки»</strong> (сформовані рейси) або <strong>«Усі разом»</strong>.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🔵</div>
                  <div>
                    <h4 className={styles.featureHeading}>Фільтри (Менеджер / Вид діяльності)</h4>
                    <p className={styles.text}>
                      Аналізуйте не весь ринок, а конкретний сегмент: виберіть менеджера чи вид діяльності
                      (ЛПГ, СФГ, Агрохолдинг тощо) — карта і калькулятор миттєво перефільтрують дані.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.primaryBtn} onClick={onClose}>Зрозуміло</button>
        </div>

      </div>
    </div>
  );
}
