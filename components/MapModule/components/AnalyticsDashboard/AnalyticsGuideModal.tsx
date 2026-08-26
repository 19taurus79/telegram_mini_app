'use client';

import React, { useState, useEffect } from 'react';
import styles from './AnalyticsGuideModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnalyticsGuideModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'calculator' | 'map' | 'details' | 'audit'>('calculator');

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
              <span className={styles.subtitle}>Аналітика доставок, Center of Gravity та Моделювання тарифів</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Закрити">✕</button>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabNav}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'calculator' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('calculator')}
          >
            💰 Калькулятор витрат
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'map' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('map')}
          >
            🗺️ Карта та Кластери
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'details' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('details')}
          >
            📋 Деталізація та Експорт
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'audit' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            🔍 Якість та Аудит даних
          </button>
        </div>

        {/* Content */}
        <div className={styles.body}>
          {activeTab === 'calculator' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>💰 Як працює Калькулятор логістичних витрат</h3>
              <p className={styles.text}>
                Калькулятор моделює та порівнює витрати між двома основними ланцюгами дистрибуції:
              </p>

              <div className={styles.modelComparison}>
                <div className={styles.modelCard}>
                  <div className={styles.modelHeader}>
                    <span className={styles.modelBadge}>Модель 1</span>
                    <h4>Пряма доставка (Direct)</h4>
                  </div>
                  <p className={styles.modelDesc}>
                    Товар зі складу відправляється індивідуальними рейсами напряму до кожного клієнта.
                  </p>
                  <div className={styles.formulaBox}>
                    <code>Витрати = Відстань × Вага (т) × Тариф прямої доставки</code>
                  </div>
                </div>

                <div className={styles.modelCard}>
                  <div className={styles.modelHeader}>
                    <span className={styles.modelBadge} style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#34d399' }}>Модель 2</span>
                    <h4>Хабова модель (Hub-and-Spoke)</h4>
                  </div>
                  <p className={styles.modelDesc}>
                    Товар перевозиться великою фурою до регіонального хабу, а далі розвозиться малими машинами.
                  </p>
                  <div className={styles.formulaBox}>
                    <code>Разом = (Магістраль × Вага × Тариф) + (Остання миля × Вага × Тариф)</code>
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
                      <td>Середній тариф для індивідуальної прямої доставки на повну дистанцію</td>
                    </tr>
                    <tr>
                      <td><strong>Магістраль (Хаб)</strong></td>
                      <td><code>5 ₴</code></td>
                      <td>Оптовий тариф великих фур (20–22 т) від бази до перевантажувального хабу</td>
                    </tr>
                    <tr>
                      <td><strong>Остання миля</strong></td>
                      <td><code>18 ₴</code></td>
                      <td>Тариф локальної малотоннажної доставки від хабу до господарств</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className={`${styles.callout} ${styles.calloutGreen}`} style={{ marginTop: '12px' }}>
                <strong>💡 Порада щодо тарифів (Пряма доставка дрібними машинами):</strong>
                <span>
                  Якщо вантаж зі складу до клієнта розвозиться не великими фурами, а одразу тими ж самими дрібними бусами (газелями), що й розвозка з хабу — просто <strong>впишіть однаковий тариф</strong> у поля "Пряма доставка" та "Остання миля". Тоді алгоритм покаже реальну економію від того, що частина шляху (магістраль) поїде дешевою 20-тонною фурою!
                </span>
              </div>

              <h4 className={styles.subTitle}>📈 Інтерпретація «Економія від Хабу»</h4>
              <div className={styles.calloutGroup}>
                <div className={`${styles.callout} ${styles.calloutGreen}`}>
                  <strong>🟢 Зелений результат (+X ₴):</strong>
                  <span>Хабова схема вигідна! Зелена сума — це пряма економія бюджету, яку можна спрямувати на оренду локального складу.</span>
                </div>
                <div className={`${styles.callout} ${styles.calloutRed}`}>
                  <strong>🔴 Червоний результат (-X ₴):</strong>
                  <span>Пряма доставка дешевша (точки розташовані близько до центрального складу або вага замала для магістральної фури).</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🗺️ Як читати Карту та Кластери</h3>
              
              <div className={styles.featureGrid}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🌟</div>
                  <div>
                    <h4 className={styles.featureHeading}>Оптимальний Головний Склад</h4>
                    <p className={styles.text}>
                      <strong>Center of Gravity (Центр Тяжіння):</strong> Математично розрахована точка найменшого сумарного пробігу. Кожне замовлення притягує координату пропорційно своїй вазі.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🔷</div>
                  <div>
                    <h4 className={styles.featureHeading}>Кластери (DBSCAN + Convex Hull)</h4>
                    <p className={styles.text}>
                      Автоматичне групування від 3 точок у радіусі 15–20 км з буфером покриття +5 км. Яскравіший колір означає вищу щільність вантажопотоку (т/км²).
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🔴</div>
                  <div>
                    <h4 className={styles.featureHeading}>Локальні Хаби (Крос-докінг)</h4>
                    <p className={styles.text}>
                      Розраховуються алгоритмом <strong>K-Means (Ллойда)</strong>. Алгоритм розбиває замовлення на обрану кількість зон і шукає ідеальний локальний центр мас для кожної з них (мінімізуючи пробіг).
                    </p>
                  </div>
                </div>
              </div>

              <h4 className={styles.subTitle} style={{ marginTop: '24px' }}>⚙️ Налаштування Алгоритму (Super Analyst)</h4>
              <ul className={styles.list}>
                <li><strong>Режим "По Тоннажу":</strong> класичний розрахунок Центру Тяжіння з фізики. Склад "магнітиться" до тих замовлень, де найбільша вага або найбільша кількість товарів (щоб зменшити витрати пального на тонну).</li>
                <li><strong>Режим "По Географії":</strong> звичайний розрахунок центру між точками на карті, незалежно від їх ваги.</li>
                <li><strong>Фільтрація аномалій (Z-Score):</strong> алгоритм автоматично відкидає одиничні, надто далекі доставки (викиди), щоб вони не "тягнули" склади в ліс. М'яка фільтрація (3 Sigma) залишає 99.7% клієнтів. Жорстка (2 Sigma) залишає лише 95% найщільніших клієнтів.</li>
              </ul>
            </div>
          )}

          {activeTab === 'details' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>📋 Деталізація Зони та Експорт даних</h3>
              
              <p className={styles.text}>
                Клікніть на будь-який кластер на карті, щоб відкрити його повне досьє у віджеті <strong>«Деталізація Зони»</strong>:
              </p>

              <ul className={styles.list}>
                <li><strong>Огляд зони:</strong> Кількість доставок, загальна вага (т), площа зони (км²) та щільність (т/км²).</li>
                <li><strong>Топ Клієнти:</strong> Рейтинг ключових господарств зони за обсягом замовлень.</li>
                <li><strong>Товарний мікс:</strong> Перелік номенклатури (насіння, ЗЗР, добрива) для планування вимог до складу.</li>
                <li><strong>Всі доставки:</strong> Повний реєстр адрес і накладних.</li>
              </ul>

              <div className={styles.callout} style={{ marginTop: '16px' }}>
                <strong>📊 Експорт в Excel:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Кнопка «Excel» у картці фільтрів формує зведений звіт по всіх зонах, координатах хабів та клієнтах для захисту рішень перед керівництвом.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🔍 Якість даних, виключені замовлення та Авто-вага</h3>
              <p className={styles.text}>
                Для коректного розрахунку витрат і тонно-кілометрів системі потрібні координати та вага кожного замовлення. У віджеті <strong>«Аудит Даних»</strong> ви можете контролювати повноту вибірки:
              </p>

              <div className={styles.featureGrid}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🟡</div>
                  <div>
                    <h4 className={styles.featureHeading}>Замовлення без ваги (0 кг)</h4>
                    <p className={styles.text}>
                      Якщо в 1С для частини номенклатури не заповнено вагу, увімкніть чекбокс <strong>«Авто-вага для замовлень без ваги»</strong> і вкажіть номінальну вагу (наприклад, 100 кг). Усі замовлення без ваги миттєво підключаться до аналітики.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🔴</div>
                  <div>
                    <h4 className={styles.featureHeading}>Клієнти без координат</h4>
                    <p className={styles.text}>
                      Господарства, які не геокодовані на карті. Клікніть кнопку <strong>«Переглянути негеокодованих»</strong>, щоб відкрити список та перейти в модуль швидкої прив&apos;язки адрес.
                    </p>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>🔄</div>
                  <div>
                    <h4 className={styles.featureHeading}>Вибір джерела даних</h4>
                    <p className={styles.text}>
                      Перемикайтеся між <strong>«Заявки 1С»</strong> (усі CRM-замовлення клієнтів), <strong>«Доставки»</strong> (сформовані рейси) або <strong>«Усі разом»</strong>.
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
