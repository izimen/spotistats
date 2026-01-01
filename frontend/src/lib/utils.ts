import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Validator to prevent XSS via javascript: URIs in src attributes
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // Only allow safe protocols
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
