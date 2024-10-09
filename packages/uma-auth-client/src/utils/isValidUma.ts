export const isValidUma = (address?: string): boolean => {
  if (!address) {
    return false;
  }

  const isValidLocalhostAddress = /^\$[a-zA-Z0-9\-_.+]+@localhost:\d+/.test(
    address,
  );
  if (isValidLocalhostAddress) {
    return true;
  }

  return /^\$[a-zA-Z0-9\-_.+]+@([a-zA-Z0-9-_.+:]+\.)+[a-zA-Z0-9:]+$/.test(
    address,
  );
};
