export function announceStatus(target: HTMLElement, message: string): void {
  target.textContent = "";
  requestAnimationFrame(() => {
    target.textContent = message;
  });
}

export function announceAlert(target: HTMLElement, message: string): void {
  target.textContent = "";
  requestAnimationFrame(() => {
    target.textContent = message;
  });
}
