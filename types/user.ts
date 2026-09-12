import type { USER_ROLES } from "@/lib/constants/roles";

export type UserRole = (typeof USER_ROLES)[number];

export type User = {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: UserRole;
};
