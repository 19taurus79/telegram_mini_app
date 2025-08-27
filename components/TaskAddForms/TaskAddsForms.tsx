import { useEffect, useId } from "react";
import { Formik, Form, Field } from "formik";
import css from "./Form.module.css";
import {
  useEventsModalStore,
  useFormStore,
  useMenuStore,
} from "@/store/FormAndMenuTogls";
import { createTask } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
// type FormId = {
//   form_id: string;
// };
export default function TaskForm() {
  // const [isOpen, setIsOpen] = useState(true);
  const fieldId = useId();
  const { formIsOpen, openForm, toggleForm } = useFormStore();
  const { formType, toggleMenu } = useMenuStore();
  const { toggleModal } = useEventsModalStore();
  useEffect(() => {
    openForm();
  }, [openForm]);
  // console.log("form_id", form_id);
  // console.log("isOpen", isOpen);

  // console.log("formik_id", formik_id);
  console.log("formType", formType);
  console.log("formIsOpen", formIsOpen);
  console.log("menuIsOpen");
  const initData = getInitData();
  type SubmitNPValues = {
    order: string;
    product: string;
    client: string;
    where: string;
    payment: string;
  };
  const submitNP = (values: SubmitNPValues) => {
    console.log(values);
    const title = `Нова Пошта`;
    const note = `Доповнення: ${values.order}\nТовар: ${values.product}\nОтримувач: ${values.client}\nКуди відправити: ${values.where}\nПлатник: ${values.payment}`;
    createTask(initData, title, note);
  };
  return (
    <>
      {formType === "NP" && formIsOpen && (
        <Formik
          initialValues={{
            order: "",
            product: "",
            client: "",
            where: "",
            payment: "",
          }}
          // onSubmit={submitNP}
          onSubmit={(values, actions) => {
            submitNP(values);
            actions.resetForm();
            toggleForm();
            toggleModal();
            toggleMenu();
          }}
        >
          {(formikProps) => (
            <Form className={css.form}>
              <fieldset className={css.fieldset}>
                <legend className={css.legend}>
                  Дані для відправки Новою Поштою
                </legend>
                <div className={css.fieldContainer}>
                  <label className={css.label} htmlFor={`${fieldId}-order`}>
                    Номер доповнення
                  </label>
                  <Field
                    className={css.field}
                    type="text"
                    name="order"
                    id={`${fieldId}-order`}
                  />
                </div>
                <div className={css.fieldContainer}>
                  <label className={css.label} htmlFor={`${fieldId}-product`}>
                    Товар з кількістю
                  </label>
                  <Field
                    className={css.field}
                    as="textarea"
                    rows={3}
                    name="product"
                    id={`${fieldId}-product`}
                  />
                </div>
                <div className={css.fieldContainer}>
                  <label className={css.label} htmlFor={`${fieldId}-client`}>
                    Отримувач
                  </label>
                  <Field
                    className={css.field}
                    type="text"
                    name="client"
                    id={`${fieldId}-client`}
                  />
                </div>
                <div className={css.fieldContainer}>
                  <label className={css.label} htmlFor={`${fieldId}-where`}>
                    Куди відправити
                  </label>
                  <Field
                    className={css.field}
                    type="text"
                    name="where"
                    id={`${fieldId}-where`}
                  />
                </div>
                <div className={css.fieldContainer}>
                  <label className={css.label} htmlFor={`${fieldId}-payment`}>
                    Платник
                  </label>
                  <Field
                    className={css.field}
                    type="text"
                    name="payment"
                    id={`${fieldId}-payment`}
                  />
                </div>

                {/* <label htmlFor={`${fieldId}-email`}>Email</label>
          <Field type="email" name="email" id={`${fieldId}-email`} /> */}
              </fieldset>
              <div className={css.btnContainer}>
                <button className={css.submitButton} type="submit">
                  Ок
                </button>
                <button
                  onClick={() => {
                    formikProps.resetForm();
                    toggleForm();
                    toggleMenu();
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
      )}
    </>
  );
}
