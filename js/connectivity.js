export function endpointsForConnection(connection) {
  return (connection.endpoints || []).map(String);
}
export function findConnectionsForEndpoint(project, endpoint) {
  return project.connections.filter(c => endpointsForConnection(c).includes(endpoint));
}
export function allEndpointsForEndpoint(project, endpoint) {
  const found = new Set([endpoint]);
  findConnectionsForEndpoint(project, endpoint).forEach(c => endpointsForConnection(c).forEach(e => found.add(e)));
  return found;
}
export function endpointForComponentPin(component, pin) { return `${component.ref}.${pin}`; }
