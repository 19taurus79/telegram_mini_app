import { useId } from "react";
import { Formik, Form, Field } from "formik";
import css from "./Form.module.css";
type FormId = {
  form_id: string;
};
export default function TaskForm({ form_id }: FormId) {
  const fieldId = useId();
  console.log("form_id", form_id);
  return (
    <>
      {form_id === "NP" && (
        <Formik initialValues={{}} onSubmit={() => {}}>
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
                <label className={css.label} htmlFor={`${fieldId}-order`}>
                  Товар з кількістю
                </label>
                <Field
                  className={css.field}
                  type="text"
                  name="order"
                  id={`${fieldId}-order`}
                />
              </div>
              <div className={css.fieldContainer}>
                <label className={css.label} htmlFor={`${fieldId}-order`}>
                  Отримувач
                </label>
                <Field
                  className={css.field}
                  type="text"
                  name="order"
                  id={`${fieldId}-order`}
                />
              </div>
              <div className={css.fieldContainer}>
                <label className={css.label} htmlFor={`${fieldId}-order`}>
                  Куди відправити
                </label>
                <Field
                  className={css.field}
                  type="text"
                  name="order"
                  id={`${fieldId}-order`}
                />
              </div>
              <div className={css.fieldContainer}>
                <label className={css.label} htmlFor={`${fieldId}-order`}>
                  Платник
                </label>
                <Field
                  className={css.field}
                  type="text"
                  name="order"
                  id={`${fieldId}-order`}
                />
              </div>

              {/* <label htmlFor={`${fieldId}-email`}>Email</label>
          <Field type="email" name="email" id={`${fieldId}-email`} /> */}
            </fieldset>

            <button className={css.submitButton} type="submit">
              Ок
            </button>
          </Form>
        </Formik>
      )}
    </>
  );
}
