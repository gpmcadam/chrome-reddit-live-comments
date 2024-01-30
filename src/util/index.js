export function getElementOrMake(id) {
  const existing = document.getElementById(id);

  if (existing) {
    return existing;
  }

  const elem = document.createElement("div");
  elem.setAttribute("id", id);

  return elem;
}
