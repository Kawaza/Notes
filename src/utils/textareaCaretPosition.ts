/** Mirror-div caret coordinates for a textarea (viewport pixels). */
export function getTextareaCaretClientRect(
  element: HTMLTextAreaElement,
  position: number,
): { top: number; left: number; height: number } {
  const computed = window.getComputedStyle(element);
  const div = document.createElement('div');
  document.body.appendChild(div);

  const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontSize',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
  ] as const;

  const style = div.style;
  style.position = 'absolute';
  style.visibility = 'hidden';
  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  for (const prop of properties) {
    style[prop] = computed[prop];
  }

  const value = element.value.substring(0, position);
  div.textContent = value;
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const rect = span.getBoundingClientRect();
  const textareaRect = element.getBoundingClientRect();
  document.body.removeChild(div);

  return {
    top: textareaRect.top + rect.top - element.scrollTop,
    left: textareaRect.left + rect.left - element.scrollLeft,
    height: rect.height || parseFloat(computed.lineHeight) || 16,
  };
}