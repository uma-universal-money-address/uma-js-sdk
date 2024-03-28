export function dateToUnixSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}
