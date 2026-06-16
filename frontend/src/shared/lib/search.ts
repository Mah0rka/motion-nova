export function filterBySearch<T>(
  items: T[],
  searchTerm: string,
  toHaystack: (item: T) => string
): T[] {
  const query = searchTerm.trim().toLocaleLowerCase("uk-UA");
  if (!query) {
    return items;
  }
  return items.filter((item) => toHaystack(item).toLocaleLowerCase("uk-UA").includes(query));
}
