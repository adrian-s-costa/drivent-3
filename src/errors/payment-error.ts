import { ApplicationError } from "@/protocols";

export function paymentError(): ApplicationError {
  return {
    name: "PaymentError",
    message: "No payment found for your ticket",
  };
}
