export const closedStates = ["CA", "NY", "CT", "IN", "LA", "ME", "MT", "NV", "NJ", "OK", "TN", "ID", "MI", "WA"];

export function visitRoutes(operators) {
  return operators.map(operator => {
    const destination = operator.visitDestination || null;
    if (destination) {
      const url = new URL(destination);
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error(`Invalid visit destination for ${operator.slug}`);
    }
    return { slug: operator.slug, name: operator.name, destination,
      closed: [...new Set([...closedStates, ...(operator.restrictedStates || [])])] };
  });
}
