// components/DeliveryDetailsForm.tsx
"use client";

import { useState } from "react";

type Props = {
  client: string;
  onSubmit: (
    client: string,
    data: { address: string; contact: string; date: string }
  ) => void;
  onCancel: () => void;
};

export default function DeliveryDetailsForm({
  client,
  onSubmit,
  onCancel,
}: Props) {
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [date, setDate] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(client, { address, contact, date });
      }}
      style={{ marginTop: "8px", padding: "8px", border: "1px dashed gray" }}
    >
      <p>
        <strong>Данные доставки для клиента: {client}</strong>
      </p>

      <input
        type="text"
        placeholder="Адрес доставки"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        required
      />
      <br />

      <input
        type="text"
        placeholder="Контактное лицо"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        required
      />
      <br />

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <br />

      <button type="submit">Сохранить</button>
      <button type="button" onClick={onCancel} style={{ marginLeft: "8px" }}>
        Отмена
      </button>
    </form>
  );
}
