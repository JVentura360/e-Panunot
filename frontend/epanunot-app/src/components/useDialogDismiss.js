import { useEffect } from 'react';

// Native modal backdrops absorb input; dismissal must never activate the page beneath.
export function useDialogDismiss() {
  useEffect(() => {
    let outsideDialog = null;
    const outside = (dialog, event) => {
      const rect = dialog.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    };
    const down = (event) => {
      const dialog = event.target;
      outsideDialog = dialog instanceof HTMLDialogElement && dialog.matches(':modal') && outside(dialog, event) ? dialog : null;
    };
    const click = (event) => {
      const dialog = outsideDialog;
      outsideDialog = null;
      if (!dialog || event.target !== dialog || !outside(dialog, event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('click', click, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('click', click, true);
    };
  }, []);
}
