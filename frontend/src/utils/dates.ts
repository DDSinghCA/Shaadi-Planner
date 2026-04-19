// Date utilities — storage format: yyyy-mm-dd, display format: dd-mm-yyyy

export function formatDisplayDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isOverdue(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date(new Date().toDateString());
}

export function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return dateStr === toISODate(new Date());
}

export function openGoogleMaps(location: string) {
  const encoded = encodeURIComponent(location);
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}
