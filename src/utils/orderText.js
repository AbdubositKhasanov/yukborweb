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

  return {
    broadcastId: broadcast.broadcastId || broadcast.broadcast_id || null,
    status: broadcast.status || 'not_started',
    totalUserbots: broadcast.totalUserbots ?? broadcast.total_userbots ?? 0,
    totalGroups: broadcast.totalGroups ?? broadcast.total_groups ?? 0,
    groupsSent: broadcast.groupsSent ?? broadcast.groups_sent ?? 0,
  };
};

export const formatBroadcastDeliveryCount = (broadcast) => {
  const sent = Math.max(0, Number(broadcast?.groupsSent ?? broadcast?.groups_sent ?? 0) || 0);
  const reportedTotal = Math.max(
    0,
    Number(broadcast?.totalGroups ?? broadcast?.total_groups ?? 0) || 0
  );
  return `${sent}/${Math.max(sent, reportedTotal)}`;
};

export const isBroadcastFinished = (broadcast) => {
  return !broadcast || ['completed', 'failed', 'not_started'].includes(broadcast.status);
};
