import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Helper padrão do Shadcn/ui para compor classes Tailwind sem conflito.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
