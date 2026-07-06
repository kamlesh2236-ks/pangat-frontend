const SOUND_URL = '/sounds/notification.wav';

let unlocked = false;

export const playNewOrderSound = (repeats = 2) => {
  try {
    for (let i = 0; i < repeats; i++) {
      const audio = new Audio(SOUND_URL);
      audio.volume = 1.0; // max volume
      // Stagger repeats slightly so they don't overlap/garble.
      setTimeout(() => {
        audio.play().catch((err) => {
          console.error('Could not play notification sound:', err);
        });
      }, i * 1600);
    }
  } catch (err) {
    console.error('Could not play notification sound:', err);
  }
};

export const unlockAudio = () => {
  if (unlocked) return;
  try {
    const audio = new Audio(SOUND_URL);
    audio.volume = 0; // silent unlock, no need to actually hear it
    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        unlocked = true;
      })
      .catch(() => {
        // Will simply retry unlocking on next click if it fails.
      });
  } catch (err) {
    // ignore
  }
};