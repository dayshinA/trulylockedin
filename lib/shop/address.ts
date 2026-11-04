import { z } from "zod";

import type { DeliveryAddress } from "@/types/shop";

// UK delivery addresses for shop orders. Delivery is free and UK only.

// "sw1a1aa" / "SW1A 1AA" → "SW1A 1AA"; null if it isn't a UK postcode shape.
export function normalizeUkPostcode(input: string): string | null {
  const compact = input.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(compact)) return null;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

const line = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, "That's too long");

// As stored on orders/{id}.delivery.
export const deliveryAddressSchema = z.object({
  line1: z.string().min(1).max(120),
  line2: z.string().max(120).optional(),
  city: z.string().min(1).max(80),
  postcode: z.string().min(1).max(10),
});

// The checkout fields. The keys match the form's input names, so field errors
// land on the right input.
export const deliveryFormSchema = z
  .object({
    addressLine1: line(120, "Enter the first line of the address"),
    addressLine2: z
      .string()
      .trim()
      .max(120, "That's too long")
      .optional()
      .transform((value) => value || undefined),
    city: line(80, "Enter the town or city"),
    postcode: z
      .string()
      .trim()
      .refine(
        (value) => normalizeUkPostcode(value) !== null,
        "Enter a UK postcode, e.g. SW1A 1AA",
      )
      .transform((value) => normalizeUkPostcode(value)!),
  })
  .transform(
    ({ addressLine1, addressLine2, city, postcode }): DeliveryAddress => ({
      line1: addressLine1,
      line2: addressLine2,
      city,
      postcode,
    }),
  );

export const addressLines = (address: DeliveryAddress): string[] =>
  [address.line1, address.line2, address.city, address.postcode].filter(
    (part): part is string => !!part,
  );
