export function updateClosingPickers<Picker extends string>(
  closingPickers: Picker[],
  picker: Picker,
  wasOpen: boolean,
  isOpen: boolean,
): Picker[] {
  if (isOpen) return closingPickers.filter((candidate) => candidate !== picker);
  if (!wasOpen || closingPickers.includes(picker)) return closingPickers;
  return [...closingPickers, picker];
}

export function completePickerClose<Picker extends string>(
  closingPickers: Picker[],
  picker: Picker,
): Picker[] {
  return closingPickers.filter((candidate) => candidate !== picker);
}
