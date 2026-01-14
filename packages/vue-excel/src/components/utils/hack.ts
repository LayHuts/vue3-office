export function readOnlyInput(root: HTMLElement | null): void {
  if (!root) return;

  const inputs = root.querySelectorAll<HTMLInputElement>('input');

  inputs.forEach(input => {
    if (!input.readOnly) {
      input.readOnly = true;
    }
  });

  // 取消当前焦点
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}
