import { z } from "zod";
import { LOCATION_MIN_LENGTH, LOCATION_MAX_LENGTH } from "@/constants/timing";

export const citySchema = z
  .string()
  .min(LOCATION_MIN_LENGTH, "Location cannot be empty")
  .max(LOCATION_MAX_LENGTH, "Location name is too long")
  .transform((s) => s.trim());

export type ValidCity = z.infer<typeof citySchema>;
