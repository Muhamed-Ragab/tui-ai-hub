import { z } from "zod";
import { MESSAGE_MIN_LENGTH, MESSAGE_MAX_LENGTH } from "@/constants/timing";

export const messageSchema = z
  .string()
  .min(MESSAGE_MIN_LENGTH, "Message cannot be empty")
  .max(MESSAGE_MAX_LENGTH, "Message is too long (max 5000 characters)");

export type ValidMessage = z.infer<typeof messageSchema>;
