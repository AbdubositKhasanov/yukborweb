export const PRIMARY_NAV_STATE = { primaryNavEntry: true };

export function shouldReplacePrimaryNav(location, targetPath, primaryPaths = []) {
  if (!location || !targetPath) return true;
  if (location.pathname === targetPath) return true;

  const currentState = location.state || null;
  const hasInternalState = currentState && currentState.primaryNavEntry !== true;
  const isCurrentPrimaryPath = primaryPaths.includes(location.pathname);

  if (!isCurrentPrimaryPath || hasInternalState) return true;

  return currentState?.primaryNavEntry === true;
}
