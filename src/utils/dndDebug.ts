/** Set to false to silence drag-and-drop debug logs. */

export const DND_DEBUG = false;



export function dndLog(label: string, data?: Record<string, unknown>) {

  if (!DND_DEBUG) return;

  if (data) {

    console.log(`[dnd] ${label}`, data);

  } else {

    console.log(`[dnd] ${label}`);

  }

}



/** Always logged on failed drops so issues are visible even when DND_DEBUG is off. */

export function dndFail(reason: string, data?: Record<string, unknown>) {

  console.warn(`[dnd FAIL] ${reason}`, data ?? '');

}


