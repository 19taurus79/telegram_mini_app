import React, { useEffect, useId, useState, useRef } from "react";
import { Formik, Form, Field, useFormikContext } from "formik";
import css from "./Form.module.css";
import {
  useEventsModalStore,
  useFormStore,
  useMenuStore,
} from "@/store/FormAndMenuTogls";
import { createTask, getClients } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Client } from "@/types/types";
import NovaPoshtaSelector, { NPSelection } from "@/components/NovaPoshta/NovaPoshtaSelector";

interface NPFormValues {
  order: string;
  product: string;
  contact: string;
  phone: string;
  npSelection: NPSelection | null;
}

interface PDFormValues {
  order: string;
  product: string;
  subdivision: string;
  who: string;
}


interface FREEFormValues {
  note: string;
}

// A union of all possible value types
type AllFormValues = NPFormValues | PDFormValues | FREEFormValues;

// Type for a single form field - now generic to be type-safe
interface FormField<T> {
  name: keyof T;
  label: string;
  type?: string;
  as?: "input" | "textarea" | "buttongroup" | "custom_select" | "novaposhta";
  rows?: number;
  options?: { value: string; label: string }[];
  dataType?: "clients";
}

// Generic, type-safe interface for a form's configuration
interface FormConfig<T extends AllFormValues> {
  legend: string;
  initialValues: T;
  fields: FormField<T>[];
  createNote: (values: T) => string;
  title: string;
}

// --- End of Typing ---

// Fully typed configuration object
const formConfigs: {
  NP: FormConfig<NPFormValues>;
  PD: FormConfig<PDFormValues>;

  FREE: FormConfig<FREEFormValues>;
} = {
  NP: {
    legend: "Дані для відправки Новою Поштою",
    initialValues: {
      order: "",
      product: "",
      contact: "",
      phone: "+380",
      npSelection: null,
    },
    fields: [
      { name: "order", label: "Номер доповнення", type: "text" },
      {
        name: "product",
        label: "Товар з кількістю",
        as: "textarea",
        rows: 3,
      },
      { name: "contact", label: "Отримувач (ПІБ)", type: "text" },
      { name: "phone", label: "Телефон", type: "tel" },
      { name: "npSelection", label: "Доставка", as: "novaposhta" },
    ],
    createNote: (values) => {
      const { order, product, contact, phone, npSelection } = values;
      let note = `Доповнення: ${order}\nТовар: ${product}`;
      
      if (npSelection) {
        const region = npSelection.city?.area ? `${npSelection.city.area} обл., ` : "";
        const area = npSelection.city?.region ? `${npSelection.city.region} р-н, ` : "";
        const city = npSelection.city?.main_description || "";
        const fullCity = `${region}${area}${city}`;
        
        const deliveryType = npSelection.deliveryType === "branch" ? "Відділення" : 
                            npSelection.deliveryType === "postomat" ? "Поштомат" : "Адреса";
        const warehouse = npSelection.warehouse?.description || npSelection.address;
        
        note += `\nНова Пошта: ${fullCity}, ${deliveryType}: ${warehouse}`;
        
        if (npSelection.recipientType === "company") {
          note += `\nОрганізація: ${npSelection.companyName} (ЄДРПОУ: ${npSelection.companyEdrpou})`;
        }
        
        note += `\nОтримувач: ${contact}`;
        note += `\nТелефон: ${phone}`;
        
        const payerNote = npSelection.payer === "sender" ? "Оплата: Відправник" : "Оплата: Отримувач";
        const paymentNote = npSelection.paymentMethod === "cash" ? "Готівка" : "Безготівковий";
        
        note += `\n${payerNote} | ${paymentNote}`;
      }
      return note;
    },
    title: "Нова Пошта",
  },
  PD: {
    legend: "Дані для заказу товару по домовленості",
    initialValues: {
      order: "",
      product: "",
      subdivision: "",
      who: "",
    },
    fields: [
      { name: "order", label: "Номер доповнення", type: "text" },
      {
        name: "product",
        label: "Товар з кількістю",
        as: "textarea",
        rows: 3,
      },
      {
        name: "subdivision",
        label: "Підрозділ з якого забрати",
        type: "text",
      },
      { name: "who", label: "З ким погоджено", type: "text" },
    ],
    createNote: (values) =>
      `Доповнення: ${values.order}
Товар: ${values.product}
Підрозділ: ${values.subdivision}
Погоджено з: ${values.who}`,
    title: "Товар по домовленості",
  },

  FREE: {
    legend: "Довільна форма",
    initialValues: {
      note: "",
    },
    fields: [
      {
        name: "note",
        label: "Введіть ваше завдання",
        as: "textarea",
        rows: 10,
      },
    ],
    createNote: (values) => values.note,
    title: "Довільне завдання",
  },
};

// This component handles side-effects within the Formik context
const FormikEffectManager = () => {
  const { values, setFieldValue } = useFormikContext<AllFormValues>();

  useEffect(() => {
    // Fix for hydration error: set date on client side, only once on mount
    if ("date" in values && !values.date) {
      setFieldValue("date", new Date().toISOString().substring(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  return null; // This component renders nothing
};

// Generic props for the form component
interface GenericTaskFormProps<T extends AllFormValues> {
  config: FormConfig<T>;
  onSubmit: (values: T) => void;
  onCancel: () => void;
  clients?: Client[];
  clientSearch: string;
  setClientSearch: (value: string) => void;
  isClientsLoading: boolean;
}

// Generic component is now fully type-safe
const GenericTaskForm = <T extends AllFormValues>({
  config,
  onSubmit,
  onCancel,
  clients,
  clientSearch,
  setClientSearch,
  isClientsLoading,
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
      onSubmit={(values, actions) => {
        onSubmit(values);
        actions.resetForm();
      }}
      enableReinitialize
    >
      {(formikProps) => (
        <Form className={css.form}>
          <FormikEffectManager />
          <fieldset className={css.fieldset}>
            <legend className={css.legend}>{config.legend}</legend>
            {config.fields.map((field) => {
              if (field.as === "buttongroup") {
                return (
                  <div
                    className={css.fieldContainer}
                    key={field.name as string}
                  >
                    <div className={css.label}>{field.label}</div>
                    <div className={css.toggleButtonContainer}>
                      {field.options?.map((option) => (
                        <button
                          type="button"
                          key={option.value}
                          onClick={() => {
                            formikProps.setFieldValue(
                              field.name as string,
                              option.value
                            );
                          }}
                          className={
                            formikProps.values[field.name] === option.value
                              ? css.toggleButtonSelected
                              : css.toggleButton
                          }
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              if (
                field.as === "custom_select" &&
                field.dataType === "clients"
              ) {
                return (
                  <div
                    className={css.fieldContainer}
                    key={field.name as string}
                  >
                    <label
                      className={css.label}
                      htmlFor={`${fieldId}-client-search`}
                    >
                      {field.label}
                    </label>
                    <div
                      ref={selectRef}
                      className={css.customSelectContainer}
                    >
                      <input
                        type="text"
                        id={`${fieldId}-client-search`}
                        className={css.field}
                        placeholder="Почніть вводити для пошуку..."
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
                                    field.name as string,
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
                  <div className={css.fieldContainer} key={field.name as string}>
                    <NovaPoshtaSelector 
                      onSelect={(selection) => formikProps.setFieldValue(field.name as string, selection)}
                    />
                  </div>
                );
              }

              return (
                <div
                  className={css.fieldContainer}
                  key={field.name as string}
                >
                  <label
                    className={css.label}
                    htmlFor={`${fieldId}-${field.name as string}`}
                  >
                    {field.label}
                  </label>
                  <Field
                    className={css.field}
                    id={`${fieldId}-${field.name as string}`}
                    name={field.name}
                    type={field.type || "text"}
                    as={field.as}
                    rows={field.rows}
                  />
                </div>
              );
            })}
          </fieldset>
          <div className={css.btnContainer}>
            <button className={css.submitButton} type="submit">
              Ок
            </button>
            <button
              onClick={() => {
                formikProps.resetForm();
                onCancel();
              }}
              className={css.cancelButton}
              type="reset"
            >
              Відміна
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
  const { formType, toggleMenu } = useMenuStore();
  const { toggleModal } = useEventsModalStore();

  const initData = getInitData();

  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedClientSearch(clientSearch);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [clientSearch]);

  const { data: clients, isLoading: isClientsLoading } = useQuery({
    queryKey: ["clients", debouncedClientSearch],
    queryFn: () =>
      getClients({ initData: initData!, searchValue: debouncedClientSearch }),
    enabled: !!initData && debouncedClientSearch.length > 1, // Changed to 2 characters
  });

  useEffect(() => {
    openForm();
  }, [openForm]);

  const mutation = useMutation({
    mutationFn: ({ title, note }: { title: string; note: string }) =>
      createTask(initData!, title, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", initData] });
    },
  });

  const handleSubmit = async (values: AllFormValues) => {
    const formKey = formType as keyof typeof formConfigs;
    const config = formConfigs[formKey];

    if (!config) return;

    setClientSearch("");

    const note = config.createNote(values as never);
    const title = config.title;

    await mutation.mutateAsync({ title, note });
    toggleForm();
    toggleModal();
    toggleMenu();
  };

  const handleCancel = () => {
    setClientSearch("");
    toggleForm();
    toggleMenu();
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
          clients={clients}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          isClientsLoading={isClientsLoading}
        />
      );
    case "PD":
      return (
        <GenericTaskForm
          config={formConfigs.PD}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          clients={clients}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          isClientsLoading={isClientsLoading}
        />
      );

    case "FREE":
      return (
        <GenericTaskForm
          config={formConfigs.FREE}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          clients={clients}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          isClientsLoading={isClientsLoading}
        />
      );
    default:
      return null;
  }
}