export type Role = "customer" | "editor" | "admin";

export type Permission =
  | "profile.self" | "favorite.self"
  | "product.write" | "import.run" | "analytics.read" | "taxonomy.read"
  | "taxonomy.write" | "user.manage" | "pii.reveal" | "settings.write";

const MAP: Record<Role, readonly (Permission | "*")[]> = {
  customer: ["profile.self", "favorite.self"],
  editor: ["profile.self", "favorite.self", "product.write", "import.run", "analytics.read", "taxonomy.read"],
  admin: ["*"],
};

export function can(role: Role | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  const grants = MAP[role];
  return grants.includes("*") || grants.includes(perm);
}

export const isStaff = (role: Role | undefined | null) => role === "admin" || role === "editor";
