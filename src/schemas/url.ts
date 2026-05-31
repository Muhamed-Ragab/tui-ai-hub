import { z } from "zod";

export const urlSchema = z.string().url("Must be a valid URL (e.g. https://example.com)");
export type ValidUrl = z.infer<typeof urlSchema>;
