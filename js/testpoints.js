export function getTestpointResult(testpoint) {
  const last = testpoint.history?.at(-1);
  if (!last) return "na";
  return last.result === "PASS" ? "pass" : "fail";
}
export function filterTestpoints(points, { search = "", side = "all", result = "all" } = {}) {
  const q = search.trim().toLowerCase();
  return points.filter(p => {
    const text = [p.name, p.net, p.componentRef, p.id].join(" ").toLowerCase();
    return (!q || text.includes(q)) &&
      (side === "all" || p.side === side) &&
      (result === "all" || getTestpointResult(p) === result);
  });
}
