import { z } from "zod";

export const userRoleSchema = z.enum(["CLIENT", "TRAINER", "ADMIN", "OWNER"]);

export type UserRole = z.infer<typeof userRoleSchema>;
