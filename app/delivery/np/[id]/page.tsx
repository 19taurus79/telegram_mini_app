import React from "react";
import NovaPoshtaFillClient from "./NovaPoshtaFillClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function NovaPoshtaFillPage({ params }: Props) {
  const { id } = await params;
  return <NovaPoshtaFillClient deliveryId={id} />;
}
