type PublicPageSearchParams = Promise<{ from?: string | string[] }>;

export async function shouldHideDashboardNavigation(
  searchParams: PublicPageSearchParams,
): Promise<boolean> {
  const { from } = await searchParams;
  return from === "welcome" || from === "auth";
}
