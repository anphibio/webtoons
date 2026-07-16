const PREFIX = "__wtl_runtime__";

export function claimRuntime(scope: Record<string, unknown>, name: string): boolean {
  const key = `${PREFIX}${name}`;
  if (scope[key] === true) return false;
  scope[key] = true;
  return true;
}
