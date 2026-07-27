import dynamic from "next/dynamic";
import Loader from "@/components/Loader/Loader";

export const dynamic = "force-dynamic";

const AddressFixClient = dynamic(
  () => import("./AddressFixClient"),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <Loader />
      </div>
    ),
  }
);

export default function AddressFixPage() {
  return <AddressFixClient />;
}
