export const getUmaDomain = (uma: string) => {
  const domain = uma.split("@")[1];
  return domain;
};
