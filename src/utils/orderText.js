const clean = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'null') return '';
  return text;
};

export const formatNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  return number.toLocaleString('uz-UZ').replace(/,/g, ' ');
};

export const formatOrderPrice = (price) => {
  const formatted = formatNumber(price);
  return formatted ? `${formatted} so'm` : '';
};

export const buildCompactOrderMessage = (order, { includeContact = true } = {}) => {
  if (!order) return '';

  const route = [clean(order.fromCity || order.fromRegion), clean(order.toCity || order.toRegion)]
    .filter(Boolean)
    .join(' -> ');
  const weight = order.weightKg || order.weight;
  const cargoLine = [weight ? `${formatNumber(weight)} tonna` : '', clean(order.cargoName || order.cargo_name)]
    .filter(Boolean)
    .join(' ');
  const priceLine = formatOrderPrice(order.priceUzs);
  const contactLine = includeContact ? clean(order.additionalPhone || order.phone) : '';

  return [
    route,
    cargoLine,
    clean(order.vehicleType),
    priceLine,
    contactLine,
    clean(order.description),
  ]
    .filter(Boolean)
    .join('\n');
};

export const normalizeBroadcastStatus = (broadcast) => {
  if (!broadcast) return null;
  const normalizeGroup = (group) => ({
    phone: clean(group?.phone || group?.userbotPhone),
    groupId: group?.groupId ?? group?.group_id ?? null,
    title: clean(group?.title || group?.name || group?.groupName || group?.group_name),
    username: clean(group?.username),
    status: clean(group?.status),
    error: clean(group?.error),
  });

  return {
    broadcastId: broadcast.broadcastId || broadcast.broadcast_id || null,
    status: broadcast.status || 'not_started',
    totalUserbots: broadcast.totalUserbots ?? broadcast.total_userbots ?? 0,
    totalGroups: broadcast.totalGroups ?? broadcast.total_groups ?? 0,
    groupsSent: broadcast.groupsSent ?? broadcast.groups_sent ?? 0,
    groupsFailed: broadcast.groupsFailed ?? broadcast.groups_failed ?? 0,
    sentGroups: (broadcast.sentGroups || broadcast.sent_groups || []).map(normalizeGroup),
    failedGroups: (broadcast.failedGroups || broadcast.failed_groups || []).map(normalizeGroup),
    message: broadcast.message || '',
  };
};

export const isBroadcastFinished = (broadcast) => {
  return !broadcast || ['completed', 'failed', 'not_started'].includes(broadcast.status);
};
