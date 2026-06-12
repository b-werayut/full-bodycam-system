export const playNotificationSound = (severity?: string) => {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const gain = context.createGain();
    const now = context.currentTime;
    const isHighPriority = severity?.toLowerCase() === 'high' || severity?.toLowerCase() === 'critical';
    const notes = isHighPriority ? [880, 1174.66, 880] : [659.25, 880];

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    gain.connect(context.destination);

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const start = now + index * 0.12;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + 0.11);
    });

    window.setTimeout(() => {
      context.close().catch(() => undefined);
    }, 700);
  } catch (error) {
    console.warn('Unable to play notification sound:', error);
  }
};
