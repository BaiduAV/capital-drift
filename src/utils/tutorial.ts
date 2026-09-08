/** Call this to reopen the tutorial from anywhere */
export function openTutorial() {
  window.dispatchEvent(new Event('patrimonio:open-tutorial'));
}
