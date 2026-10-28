import React, { useEffect, useId, useState, useRef } from "react";
import { Formik, Form, Field, useFormikContext } from "formik";
import toast from "react-hot-toast";
import css from "./Form.module.css";
import {
  useEventsModalStore,
  useFormStore,
  useMenuStore,
} from "@/store/FormAndMenuTogls";
import { createTask, getClients, getDeliveryWarehouses } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Client } from "@/types/types";
import NovaPoshtaSelector, {
  NPSelection,
} from "@/components/NovaPoshta/NovaPoshtaSelector";

// --- Form Values Interfaces ---
interface NPFormValues {
  order: string;
  warehouse: string;
  product: string;
  contact: string;
  phone: string;
  npSelection: NPSelection | null;
}

interface EXWFormValues {
  order: string;
  warehouse: string;
  client: string;
  product: string;
  transport: string;
  driver: string;
  phone: string;
  address: string;
  date: string;
}

interface PDFormValues {
  order: string;
  product: string;
  subdivision: string;
  targetSubdivision: string;
  who: string;
  date: string;
}

interface TRFormValues {
  sourceWarehouse: string;
  targetWarehouse: string;
  product: string;
  date: string;
  order: string;
}

interface DLFormValues {
  client: string;
  order: string;
  warehouse: string;
  address: string;
  product: string;
  contact: string;
  phone: string;
  date: string;
  unloadFeatures: string;
}

interface FREEFormValues {
  title: string;
  date: string;
  note: string;
}

// A union of all possible value types
type AllFormValues =
  | NPFormValues
  | EXWFormValues
  | PDFormValues
  | TRFormValues
  | DLFormValues
  | FREEFormValues;

interface SelectOption {
  value: string;
  label: string;
}

// Generic, type-safe interface for a single form field
interface FormField<T> {
  name: keyof T;
  label: string;
  type?: string;
  as?:
    | "input"
    | "textarea"
    | "buttongroup"
    | "custom_select"
    | "novaposhta"
    | "warehouse_select";
  rows?: number;
  options?: SelectOption[];
  dataType?: "clients" | "warehouses";
  placeholder?: string;
}

// Generic, type-safe interface for a form's configuration
interface FormConfig<T extends AllFormValues> {
  legend: string;
  initialValues: T;
  fields: FormField<T>[];
  createNote: (values: T) => string;
  getTitle: (values: T) => string;
  getDate?: (values: T) => string;
}

// Fully typed configuration objects for all 6 variants
const formConfigs: {
  NP: FormConfig<NPFormValues>;
  EXW: FormConfig<EXWFormValues>;
  PD: FormConfig<PDFormValues>;
  TR: FormConfig<TRFormValues>;
  DL: FormConfig<DLFormValues>;
  FREE: FormConfig<FREEFormValues>;
} = {
  NP: {
    legend: "Відправка Новою Поштою",
    initialValues: {
      order: "",
      warehouse: "",
      product: "",
      contact: "",
      phone: "+380",
      npSelection: null,
    },
    fields: [
      { name: "order", label: "Номер доповнення", type: "text", placeholder: "ТЕ-00000000" },
      { name: "warehouse", label: "Склад відправки", as: "warehouse_select" },
      {
        name: "product",
        label: "Товар з кількістю",
        as: "textarea",
        rows: 3,
        placeholder: "Наприклад: Селітра аміачна 5т, Гербіцид 20л",
      },
      { name: "contact", label: "Отримувач (ПІБ)", type: "text", placeholder: "Прізвище Ім'я По батькові" },
      { name: "phone", label: "Телефон отримувача", type: "tel" },
      { name: "npSelection", label: "Параметри Нової Пошти", as: "novaposhta" },
    ],
    createNote: (values) => {
      const { order, warehouse, product, contact, phone, npSelection } = values;
      const lines: string[] = [];
      if (order) lines.push(`Доповнення: ${order}`);
      if (product) lines.push(`Товар: ${product}`);
      if (warehouse) lines.push(`Склад відправки: ${warehouse}`);

      if (npSelection) {
        const region = npSelection.city?.area ? `${npSelection.city.area} обл., ` : "";
        const area = npSelection.city?.region ? `${npSelection.city.region} р-н, ` : "";
        const city = npSelection.city?.main_description || "";
        const fullCity = `${region}${area}${city}`;

        const deliveryType =
          npSelection.deliveryType === "branch"
            ? "Відділення"
            : npSelection.deliveryType === "postomat"
            ? "Поштомат"
            : "Адреса";
        const wh = npSelection.warehouse?.description || npSelection.address;

        lines.push(`Нова Пошта: ${fullCity}, ${deliveryType}: ${wh}`);

        if (npSelection.recipientType === "company") {
          lines.push(`Організація: ${npSelection.companyName} (ЄДРПОУ: ${npSelection.companyEdrpou})`);
        }

        const payerNote = npSelection.payer === "sender" ? "Оплата: Відправник" : "Оплата: Отримувач";
        const paymentNote = npSelection.paymentMethod === "cash" ? "Готівка" : "Безготівковий";
        lines.push(`${payerNote} | ${paymentNote}`);
      }

      if (contact) lines.push(`Отримувач: ${contact}`);
      if (phone) lines.push(`Телефон: ${phone}`);
      return lines.join("\n");
    },
    getTitle: (values) => `Нова Пошта: ${values.order || "Замовлення"} (${values.contact || "Отримувач"})`,
  },

  EXW: {
    legend: "Самовивіз зі складу (EXW)",
    initialValues: {
      order: "",
      warehouse: "",
      client: "",
      product: "",
      transport: "",
      driver: "",
      phone: "+380",
      address: "",
      date: "",
    },
    fields: [
      { name: "date", label: "Дата самовивозу", type: "date" },
      { name: "warehouse", label: "Склад відвантаження", as: "warehouse_select" },
      {
        name: "client",
        label: "Клієнт (Покупець)",
        as: "custom_select",
        dataType: "clients",
        placeholder: "Почніть вводити назву компанії або ПІБ...",
      },
      { name: "order", label: "Номер доповнення", type: "text", placeholder: "ТЕ-00000000" },
      {
        name: "product",
        label: "Товар з кількістю",
        as: "textarea",
        rows: 3,
        placeholder: "Наприклад: Кукурудза ДКС 3939 - 30 п.о.",
      },
      { name: "transport", label: "Транспорт / Автомобіль", type: "text", placeholder: "КАМАЗ АХ1234ВВ" },
      { name: "driver", label: "ПІБ водія", type: "text", placeholder: "Іванов Іван" },
      { name: "phone", label: "Телефон водія", type: "tel" },
      { name: "address", label: "Адреса розвантаження", type: "text", placeholder: "с. Семенівка, вул. Центральна" },
    ],
    createNote: (values) => {
      const lines: string[] = [];
      if (values.date) lines.push(`Дата самовивозу: ${values.date}`);
      if (values.warehouse) lines.push(`Склад відвантаження: ${values.warehouse}`);
      if (values.client) lines.push(`Клієнт: ${values.client}`);
      if (values.order) lines.push(`Доповнення: ${values.order}`);
      if (values.product) lines.push(`Товар: ${values.product}`);
      if (values.transport) lines.push(`Транспорт: ${values.transport}`);
      if (values.driver) lines.push(`ПІБ водія: ${values.driver}`);
      if (values.phone) lines.push(`Телефон водія: ${values.phone}`);
      if (values.address) lines.push(`Адреса розвантаження: ${values.address}`);
      return lines.join("\n");
    },
    getTitle: (values) => `Самовивіз: ${values.client || "Клієнт"} (${values.order || values.warehouse || "Склад"})`,
    getDate: (values) => values.date,
  },

  PD: {
    legend: "Товар по домовленості",
    initialValues: {
      order: "",
      product: "",
      subdivision: "",
      targetSubdivision: "",
      who: "",
      date: "",
    },
    fields: [
      { name: "order", label: "Номер доповнення", type: "text", placeholder: "ТЕ-00000000" },
      {
        name: "product",
        label: "Товар з кількістю",
        as: "textarea",
        rows: 3,
        placeholder: "Товар, за яким немає вільного залишку",
      },
      { name: "subdivision", label: "Звідки (підрозділ / склад)", as: "warehouse_select" },
      { name: "targetSubdivision", label: "Куди (підрозділ призначення)", as: "warehouse_select" },
      { name: "who", label: "З ким погоджено", type: "text", placeholder: "ПІБ керівника або менеджера" },
      { name: "date", label: "Бажаний термін", type: "date" },
    ],
    createNote: (values) => {
      const lines: string[] = [];
      if (values.order) lines.push(`Доповнення: ${values.order}`);
      if (values.product) lines.push(`Товар: ${values.product}`);
      if (values.subdivision) lines.push(`Звідки (підрозділ): ${values.subdivision}`);
      if (values.targetSubdivision) lines.push(`Куди (підрозділ): ${values.targetSubdivision}`);
      if (values.who) lines.push(`Погоджено з: ${values.who}`);
      if (values.date) lines.push(`Бажаний термін: ${values.date}`);
      return lines.join("\n");
    },
    getTitle: (values) => `По домовленості: ${values.order || values.product.slice(0, 30) || "Товар"} (${values.subdivision || "Підрозділ"})`,
    getDate: (values) => values.date,
  },

  TR: {
    legend: "Переміщення між складами",
    initialValues: {
      sourceWarehouse: "",
      targetWarehouse: "",
      product: "",
      date: "",
      order: "",
    },
    fields: [
      { name: "sourceWarehouse", label: "Склад відправки (звідки)", as: "warehouse_select" },
      { name: "targetWarehouse", label: "Склад призначення (куди)", as: "warehouse_select" },
      {
        name: "product",
        label: "Товар з кількістю",
        as: "textarea",
        rows: 3,
        placeholder: "Наприклад: Карбамід 20т або ЗЗР 100л",
      },
      { name: "date", label: "Бажана дата переміщення", type: "date" },
      { name: "order", label: "Підстава / Замовлення (опціонально)", type: "text", placeholder: "ТЕ-00000000" },
    ],
    createNote: (values) => {
      const lines: string[] = [];
      if (values.sourceWarehouse) lines.push(`Склад відправки: ${values.sourceWarehouse}`);
      if (values.targetWarehouse) lines.push(`Склад призначення: ${values.targetWarehouse}`);
      if (values.product) lines.push(`Товар: ${values.product}`);
      if (values.date) lines.push(`Бажана дата переміщення: ${values.date}`);
      if (values.order) lines.push(`Підстава / Замовлення: ${values.order}`);
      return lines.join("\n");
    },
    getTitle: (values) => `Переміщення: ${values.sourceWarehouse || "Звідки"} -> ${values.targetWarehouse || "Куди"} (${values.product.slice(0, 25) || "Вантаж"})`,
    getDate: (values) => values.date,
  },

  DL: {
    legend: "Автодоставка клієнту",
    initialValues: {
      client: "",
      order: "",
      warehouse: "",
      address: "",
      product: "",
      contact: "",
      phone: "+380",
      date: "",
      unloadFeatures: "",
    },
    fields: [
      {
        name: "client",
        label: "Клієнт (Одержувач)",
        as: "custom_select",
        dataType: "clients",
        placeholder: "Почніть вводити назву клієнта...",
      },
      { name: "order", label: "Номер доповнення", type: "text", placeholder: "ТЕ-00000000" },
      { name: "warehouse", label: "Склад завантаження", as: "warehouse_select" },
      { name: "address", label: "Точна адреса доставки", type: "text", placeholder: "Область, район, населений пункт, вулиця" },
      {
        name: "product",
        label: "Товар з кількістю",
        as: "textarea",
        rows: 3,
        placeholder: "Найменування, упаковка, вага / об'єм",
      },
      { name: "contact", label: "Контактна особа на вивантаженні", type: "text", placeholder: "ПІБ агронома чи завскладу" },
      { name: "phone", label: "Телефон контактної особи", type: "tel" },
      { name: "date", label: "Бажана дата доставки", type: "date" },
      {
        name: "unloadFeatures",
        label: "Особливості вивантаження (опціонально)",
        type: "text",
        placeholder: "Тільки маніпулятор, низькі ворота, без причепа тощо",
      },
    ],
    createNote: (values) => {
      const lines: string[] = [];
      if (values.client) lines.push(`Клієнт: ${values.client}`);
      if (values.order) lines.push(`Доповнення: ${values.order}`);
      if (values.warehouse) lines.push(`Склад завантаження: ${values.warehouse}`);
      if (values.address) lines.push(`Адреса доставки: ${values.address}`);
      if (values.product) lines.push(`Товар: ${values.product}`);
      if (values.contact) lines.push(`Контактна особа: ${values.contact}`);
      if (values.phone) lines.push(`Телефон: ${values.phone}`);
      if (values.date) lines.push(`Дата доставки: ${values.date}`);
      if (values.unloadFeatures) lines.push(`Особливості вивантаження: ${values.unloadFeatures}`);
      return lines.join("\n");
    },
    getTitle: (values) => `Доставка: ${values.client || "Клієнт"} (${values.order || values.address || "Адреса"})`,
    getDate: (values) => values.date,
  },

  FREE: {
    legend: "Довільне завдання логісту",
    initialValues: {
      title: "",
      date: "",
      note: "",
    },
    fields: [
      { name: "title", label: "Заголовок завдання (тема)", type: "text", placeholder: "Короткий опис суті завдання" },
      { name: "date", label: "Термін виконання", type: "date" },
      {
        name: "note",
        label: "Детальний опис завдання",
        as: "textarea",
        rows: 8,
        placeholder: "Вкажіть всі подробиці, номери ТТН, склади, контакти тощо",
      },
    ],
    createNote: (values) => values.note,
    getTitle: (values) => values.title || "Завдання для логістичної служби",
    getDate: (values) => values.date,
  },
};

// Side-effects within Formik context (date hydration)
const FormikEffectManager = () => {
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();

  useEffect(() => {
    if ("date" in values && !values.date) {
      setFieldValue("date", new Date().toISOString().substring(0, 10));
    }
  }, [values, setFieldValue]);

  return null;
};

// Generic props for the form component
interface GenericTaskFormProps<T extends AllFormValues> {
  config: FormConfig<T>;
  onSubmit: (values: T) => Promise<void>;
  onCancel: () => void;
  onBack: () => void;
  clients?: Client[];
  clientSearch: string;
  setClientSearch: (value: string) => void;
  isClientsLoading: boolean;
  warehouses: string[];
  isSubmitting: boolean;
}

const GenericTaskForm = <T extends AllFormValues>({
  config,
  onSubmit,
  onCancel,
  onBack,
  clients,
  clientSearch,
  setClientSearch,
  isClientsLoading,
  warehouses,
  isSubmitting,
}: GenericTaskFormProps<T>) => {
  const fieldId = useId();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectRef]);

  return (
    <Formik
      initialValues={config.initialValues}
      onSubmit={async (values, actions) => {
        await onSubmit(values);
        actions.resetForm();
      }}
      enableReinitialize
    >
      {(formikProps) => (
        <Form className={css.form}>
          <FormikEffectManager />
          <fieldset className={css.fieldset}>
            <div className={css.headerRow}>
              <legend className={css.legend}>{config.legend}</legend>
              <button
                type="button"
                onClick={onBack}
                className={css.backButton}
                title="Повернутися до вибору типу завдання"
              >
                ← До меню
              </button>
            </div>

            {config.fields.map((field) => {
              const fieldNameStr = String(field.name);

              if (field.as === "warehouse_select") {
                return (
                  <div className={css.fieldContainer} key={fieldNameStr}>
                    <label
                      className={css.label}
                      htmlFor={`${fieldId}-${fieldNameStr}`}
                    >
                      {field.label}
                    </label>
                    <Field
                      as="select"
                      className={css.selectField}
                      id={`${fieldId}-${fieldNameStr}`}
                      name={field.name}
                    >
                      <option value="">-- Оберіть склад / підрозділ --</option>
                      {warehouses.map((wh) => (
                        <option key={wh} value={wh}>
                          {wh}
                        </option>
                      ))}
                    </Field>
                  </div>
                );
              }

              if (
                field.as === "custom_select" &&
                field.dataType === "clients"
              ) {
                return (
                  <div className={css.fieldContainer} key={fieldNameStr}>
                    <label
                      className={css.label}
                      htmlFor={`${fieldId}-client-search`}
                    >
                      {field.label}
                    </label>
                    <div ref={selectRef} className={css.customSelectContainer}>
                      <input
                        type="text"
                        id={`${fieldId}-client-search`}
                        className={css.field}
                        placeholder={field.placeholder || "Почніть вводити назву..."}
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setDropdownOpen(true);
                        }}
                        onFocus={() => setDropdownOpen(true)}
                      />
                      {isDropdownOpen && (
                        <div className={css.customSelectDropdown}>
                          {clientSearch.length < 2 ? (
                            <div className={css.customSelectItemMuted}>
                              Введіть 2 або більше символів для пошуку
                            </div>
                          ) : isClientsLoading ? (
                            <div className={css.customSelectItemMuted}>
                              Завантаження...
                            </div>
                          ) : clients && clients.length > 0 ? (
                            clients.map((client) => (
                              <div
                                key={client.id}
                                onClick={() => {
                                  formikProps.setFieldValue(
                                    fieldNameStr,
                                    client.client
                                  );
                                  setClientSearch(client.client);
                                  setDropdownOpen(false);
                                }}
                                className={css.customSelectItem}
                              >
                                {client.client}
                              </div>
                            ))
                          ) : (
                            <div className={css.customSelectItemMuted}>
                              Клієнтів не знайдено
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              if (field.as === "novaposhta") {
                return (
                  <div className={css.fieldContainer} key={fieldNameStr}>
                    <NovaPoshtaSelector
                      onSelect={(selection) =>
                        formikProps.setFieldValue(fieldNameStr, selection)
                      }
                    />
                  </div>
                );
              }

              return (
                <div className={css.fieldContainer} key={fieldNameStr}>
                  <label
                    className={css.label}
                    htmlFor={`${fieldId}-${fieldNameStr}`}
                  >
                    {field.label}
                  </label>
                  <Field
                    className={css.field}
                    id={`${fieldId}-${fieldNameStr}`}
                    name={field.name}
                    type={field.type || "text"}
                    as={field.as}
                    rows={field.rows}
                    placeholder={field.placeholder}
                  />
                </div>
              );
            })}
          </fieldset>

          <div className={css.btnContainer}>
            <button
              className={css.submitButton}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Створення..." : "Створити завдання"}
            </button>
            <button
              onClick={() => {
                formikProps.resetForm();
                onCancel();
              }}
              className={css.cancelButton}
              type="button"
              disabled={isSubmitting}
            >
              Закрити
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default function TaskForm() {
  const queryClient = useQueryClient();
  const { formIsOpen, openForm, toggleForm } = useFormStore();
  const { formType, resetMenuState } = useMenuStore();
  const { toggleModal } = useEventsModalStore();

  const initData = getInitData();

  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedClientSearch(clientSearch);
    }, 450);

    return () => {
      clearTimeout(handler);
    };
  }, [clientSearch]);

  const { data: clients, isLoading: isClientsLoading } = useQuery({
    queryKey: ["clients", debouncedClientSearch],
    queryFn: () =>
      getClients({ initData: initData || "", searchValue: debouncedClientSearch }),
    enabled: Boolean(initData && debouncedClientSearch.length > 1),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["deliveryWarehouses", initData],
    queryFn: () => getDeliveryWarehouses(initData || undefined),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  useEffect(() => {
    openForm();
  }, [openForm]);

  const mutation = useMutation({
    mutationFn: ({
      title,
      note,
      date,
    }: {
      title: string;
      note: string;
      date?: string;
    }) => createTask(initData || "", title, note, date),
    onSuccess: () => {
      toast.success("Завдання логісту успішно створено!");
      queryClient.invalidateQueries({ queryKey: ["tasks", initData] });
    },
    onError: (err: unknown) => {
      const errorMsg =
        err instanceof Error ? err.message : "Не вдалося створити завдання";
      toast.error(`Помилка: ${errorMsg}`);
    },
  });

  const handleSubmit = async (values: AllFormValues) => {
    const formKey = formType as keyof typeof formConfigs;
    const config = formConfigs[formKey];

    if (!config) return;

    setClientSearch("");

    // Type-safe call to note and title getters
    const note = (config.createNote as (val: unknown) => string)(values);
    const title = (config.getTitle as (val: unknown) => string)(values);
    const date = config.getDate
      ? (config.getDate as (val: unknown) => string | undefined)(values)
      : undefined;

    try {
      await mutation.mutateAsync({ title, note, date });
      toggleForm();
      toggleModal();
      resetMenuState();
    } catch {
      // Error handled by mutation onError
    }
  };

  const handleCancel = () => {
    setClientSearch("");
    toggleForm();
    toggleModal();
    resetMenuState();
  };

  const handleBack = () => {
    setClientSearch("");
    toggleForm();
    resetMenuState();
  };

  if (!formIsOpen) {
    return null;
  }

  switch (formType) {
    case "NP":
      return (
        <GenericTaskForm
          config={formConfigs.NP}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onBack={handleBack}
          clients={clients}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          isClientsLoading={isClientsLoading}
          warehouses={warehouses}
          isSubmitting={mutation.isPending}
        />
      );
    case "EXW":
      return (
        <GenericTaskForm
          config={formConfigs.EXW}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onBack={handleBack}
          clients={clients}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          isClientsLoading={isClientsLoading}
          warehouses={warehouses}
          isSubmitting={mutation.isPending}
        />
      );
    case "PD":
      return (
        <GenericTaskForm
          config={formConfigs.PD}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onBack={handleBack}
          clients={clients}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          isClientsLoading={isClientsLoading}
          warehouses={warehouses}
          isSubmitting={mutation.isPending}
        />
      );
    case "TR":
      return (
        <GenericTaskForm
          config={formConfigs.TR}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onBack={handleBack}
          clients={clients}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          isClientsLoading={isClientsLoading}
          warehouses={warehouses}
          isSubmitting={mutation.isPending}
        />
      );
    case "DL":
      return (
        <GenericTaskForm
          config={formConfigs.DL}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onBack={handleBack}
          clients={clients}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          isClientsLoading={isClientsLoading}
          warehouses={warehouses}
          isSubmitting={mutation.isPending}
        />
      );
    case "FREE":
      return (
        <GenericTaskForm
          config={formConfigs.FREE}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onBack={handleBack}
          clients={clients}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          isClientsLoading={isClientsLoading}
          warehouses={warehouses}
          isSubmitting={mutation.isPending}
        />
      );
    default:
      return null;
  }
}