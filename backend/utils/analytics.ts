type UmamiTrackPayload = Record<string, unknown>;

type UmamiTracker = {
  track?: (eventName: string, payload?: UmamiTrackPayload) => void;
};

export function trackUmamiEvent(eventName: string, payload: UmamiTrackPayload = {}): void {
  if (typeof window === "undefined") {
    return;
  }

  const tracker = (window as Window & { umami?: UmamiTracker }).umami?.track;
  if (typeof tracker !== "function") {
    return;
  }

  try {
    tracker(eventName, payload);
  } catch (error) {
    console.error(`Failed to track Umami event "${eventName}"`, error);
  }
}
