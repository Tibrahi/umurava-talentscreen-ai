import { clsx, type ClassValue } from "clsx";

// Tiny utility to compose Tailwind classes cleanly in custom components.
export const cn = (...inputs: ClassValue[]) => clsx(inputs);
