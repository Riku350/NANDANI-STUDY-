/**
 * Central App Configuration — Edit APP_NAME here to rebrand across the entire app.
 */
export const APP_CONFIG = {
  APP_NAME: 'Nandani Study',
  APP_TAGLINE: 'Class 12 Study Companion',
  DEFAULT_CLASS: 'Class 12th',
  DEFAULT_DAILY_GOAL_MINUTES: 300, // 5 hours
  WHATSAPP_DISPLAY: '6299475970',
  WHATSAPP_E164: '916299475970',
  WHATSAPP_DEFAULT_MESSAGE: 'Hello, I need help regarding Nandani Study.',
} as const;

export function buildWhatsAppUrl(customMessage?: string): string {
  const message = customMessage?.trim() || APP_CONFIG.WHATSAPP_DEFAULT_MESSAGE;
  return `https://wa.me/${APP_CONFIG.WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}
