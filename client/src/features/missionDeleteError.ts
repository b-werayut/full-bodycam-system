export type MissionDeleteErrorLanguage = 'th' | 'en';

/**
 * Translate a backend mission/report delete error into the active UI language.
 *
 * The API answers in English (e.g. "Device <name> is currently active, cannot
 * delete mission"). We localise the messages we recognise and fall back to the
 * raw server text — or a generic message when there is none — for anything else,
 * so the user never sees an English sentence inside a Thai dialog.
 */
export function localizeMissionDeleteError(
  serverMessage: string | undefined | null,
  language: MissionDeleteErrorLanguage,
): string {
  const isThai = language === 'th';
  const message = serverMessage?.trim();

  if (!message) {
    return isThai
      ? 'ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
      : 'Unable to delete. Please try again.';
  }

  // "Device <name> is currently active, cannot delete mission"
  const activeDevice = message.match(
    /^Device\s+(.+?)\s+is currently active,?\s*cannot delete mission\.?$/i,
  );
  if (activeDevice) {
    const device = activeDevice[1].trim();
    return isThai
      ? `ไม่สามารถลบใบงานได้ เนื่องจากอุปกรณ์ ${device} กำลังถูกใช้งานอยู่`
      : `Cannot delete this mission because device ${device} is currently active.`;
  }

  // Unknown server message: surface it unchanged so we don't hide useful detail.
  return message;
}
