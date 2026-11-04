import { addressLines } from "@/lib/shop/address";
import type { DeliveryAddress } from "@/types/shop";

// A postal address, one line per row.
export function AddressBlock({ address }: { address: DeliveryAddress }) {
  return (
    <span className="flex flex-col">
      {addressLines(address).map((line, i) => (
        <span key={i}>{line}</span>
      ))}
    </span>
  );
}
