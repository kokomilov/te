export function evaluateMeasurement(testpoint, value) {
  const spec = testpoint.measurement || {};
  if (value === "" || value === null || !Number.isFinite(Number(value))) return "N/A";
  const n = Number(value);
  if (spec.min != null && n < Number(spec.min)) return "FAIL";
  if (spec.max != null && n > Number(spec.max)) return "FAIL";
  if (spec.min == null && spec.max == null && spec.expected != null && n !== Number(spec.expected)) return "FAIL";
  return "PASS";
}
export function addMeasurement(project, testpoint, record) {
  const result = evaluateMeasurement(testpoint, record.value);
  const measurement = { id: crypto.randomUUID(), testpointId: testpoint.id, value: Number(record.value), result, technician: record.technician || "", notes: record.notes || "", timestamp: new Date().toISOString() };
  testpoint.history ??= [];
  testpoint.history.push(measurement);
  project.measurements.push(measurement);
  return measurement;
}
