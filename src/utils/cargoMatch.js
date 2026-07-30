const TIER_ORDER = {
  exact: 0,
  incomplete: 1,
  mismatch: 2,
};

const PRESENTATIONS = {
  exact: {
    label: 'Yuqori moslik',
    icon: '✅',
    color: '#166534',
    background: '#f0fdf4',
    border: '#86efac',
  },
  incomplete: {
    label: "Ma'lumot yetishmaydi",
    icon: '⚠️',
    color: '#854d0e',
    background: '#fffbeb',
    border: '#fde68a',
  },
  mismatch: {
    label: 'Mosligi past',
    icon: '↓',
    color: '#991b1b',
    background: '#fff7f7',
    border: '#fecaca',
  },
};

export function getCargoMatchPresentation(matchInfo) {
  if (!matchInfo?.tier) return null;
  return PRESENTATIONS[matchInfo.tier] || PRESENTATIONS.mismatch;
}

export function compareCargoMatches(left, right) {
  const leftInfo = left?.matchInfo;
  const rightInfo = right?.matchInfo;
  if (!leftInfo && !rightInfo) return 0;
  if (!leftInfo) return 1;
  if (!rightInfo) return -1;

  const tierDiff = (TIER_ORDER[leftInfo.tier] ?? 3) - (TIER_ORDER[rightInfo.tier] ?? 3);
  if (tierDiff !== 0) return tierDiff;

  const mismatchDiff = (leftInfo.mismatchedCount || 0) - (rightInfo.mismatchedCount || 0);
  if (mismatchDiff !== 0) return mismatchDiff;

  const unknownDiff = (leftInfo.unknownCount || 0) - (rightInfo.unknownCount || 0);
  if (unknownDiff !== 0) return unknownDiff;

  const scoreDiff = (rightInfo.score || 0) - (leftInfo.score || 0);
  if (scoreDiff !== 0) return scoreDiff;

  return (right?.createdTime || 0) - (left?.createdTime || 0);
}

export function sortCargosByMatch(cargos = []) {
  return [...cargos].sort(compareCargoMatches);
}
