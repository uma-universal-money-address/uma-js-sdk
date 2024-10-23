export const abbreviateAddress = (address: string): string => {
  let abbrAddress = address;
  if (address.length > 10) {
    const addressStart = address.slice(0, 5);
    const addressEnd = address.slice(-5);
    abbrAddress = `${addressStart}...${addressEnd}`;
  }

  return abbrAddress;
};
