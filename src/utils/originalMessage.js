export const PRIVATE_GROUP_MESSAGE_NOTE =
  "Bu xabar private guruhdan olingan. Telegram original linkni faqat shu guruh a'zolariga ochadi, shuning uchun xabar matni shu yerda ko'rsatilmoqda.";

export function buildOriginalCargoMessage(cargo) {
  const originMessage = cargo?.originMessage?.trim();
  if (originMessage) return originMessage;

  const route = [cargo?.fromCity || cargo?.fromRegion, cargo?.toCity || cargo?.toRegion]
    .filter(Boolean)
    .join(' -> ');
  const lines = [
    cargo?.cargoName || cargo?.cargo_name,
    route,
    cargo?.weightKg || cargo?.weight ? `Og'irligi: ${cargo.weightKg || cargo.weight} tonna` : null,
    cargo?.vehicleType ? `Transport: ${cargo.vehicleType}` : null,
    cargo?.description,
  ].filter(Boolean);

  return lines.join('\n') || "Original xabar matni topilmadi.";
}
