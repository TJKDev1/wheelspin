const announceFrames = new WeakMap<HTMLElement, number>();

function announce(target: HTMLElement, message: string): void {
  const pendingFrame = announceFrames.get(target);
  if (pendingFrame !== undefined) {
    cancelAnimationFrame(pendingFrame);
  }

  target.textContent = "";
  const frameId = requestAnimationFrame(() => {
    target.textContent = message;
    announceFrames.delete(target);
  });

  announceFrames.set(target, frameId);
}

export function announceStatus(target: HTMLElement, message: string): void {
  announce(target, message);
}

export function announceAlert(target: HTMLElement, message: string): void {
  announce(target, message);
}
