// Shared presentation contract. Query owners apply sorting before pagination.
export function sortableKeys(columns) {
  return Object.keys(columns).filter((key) => columns[key].sortable !== false);
}

export function nextTableSort(current, key) {
  return {
    sort: key,
    direction:
      current.sort === key && current.direction === "asc" ? "desc" : "asc",
  };
}

export function tableSortState(current, key) {
  const active = current.sort === key;
  return {
    ariaSort: active
      ? current.direction === "asc"
        ? "ascending"
        : "descending"
      : "none",
    icon: active
      ? current.direction === "asc"
        ? "arrowUp"
        : "arrowDown"
      : "sort",
  };
}
