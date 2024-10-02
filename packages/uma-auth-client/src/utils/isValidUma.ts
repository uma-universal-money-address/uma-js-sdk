export const isValidUma = (address?: string): boolean => {
  if (!address) {
    return false;
  }

  return /^\$[a-zA-Z0-9\-_.+]+@([a-zA-Z0-9-_.+:]+\.)+[a-zA-Z0-9:]+$/.test(
    address,
  );
};
