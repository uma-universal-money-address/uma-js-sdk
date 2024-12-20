export const getUmaUsername = (uma: string) => {
  // Remove the first $ and everything after @
  return uma.replace(/^\$/, "").split("@")[0];
};
