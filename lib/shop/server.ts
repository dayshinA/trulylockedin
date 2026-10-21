import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { FirestoreOrderRepository } from "./firestore-order-repository";
import { FirestoreProductRepository } from "./firestore-repository";
import type { OrderRepository } from "./order-repository";
import type { ProductRepository } from "./repository";

let repository: ProductRepository | undefined;

export function productRepository(): ProductRepository {
  repository ??= new FirestoreProductRepository(adminDb());
  return repository;
}

let orders: OrderRepository | undefined;

export function orderRepository(): OrderRepository {
  orders ??= new FirestoreOrderRepository(adminDb());
  return orders;
}
