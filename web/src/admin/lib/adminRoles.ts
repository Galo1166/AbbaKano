export type AdminRole = "super_admin" | "support_admin";

export const ADMIN_ROUTE_PERMISSIONS = {
  "/admin/deposits": "deposits",
  "/admin/transactions": "transactions",
  "/admin/vtu-services": "vtu_services",
  "/admin/support": "support",
} as const;

export function getAdminRole(value: unknown): AdminRole | null {
  return value === "super_admin" || value === "support_admin" ? value : null;
}

export function getAdminPermissions(role: AdminRole): string[] {
  if (role === "super_admin") return ["*"];
  return ["deposits", "transactions", "vtu_services", "support"];
}

export function canAccessAdminPath(role: AdminRole, pathname: string): boolean {
  if (role === "super_admin") return true;
  const route = (Object.keys(ADMIN_ROUTE_PERMISSIONS) as Array<keyof typeof ADMIN_ROUTE_PERMISSIONS>)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!route) return false;
  return getAdminPermissions(role).includes(ADMIN_ROUTE_PERMISSIONS[route]);
}
