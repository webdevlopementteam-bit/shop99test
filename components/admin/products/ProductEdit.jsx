"use client";

import { useParams } from "next/navigation";
import ProductForm from "./ProductForm";

export default function ProductEdit() {
  const { id } = useParams();
  return <ProductForm editId={id} />;
}
