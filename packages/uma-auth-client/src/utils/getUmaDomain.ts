export const getUmaDomain = (uma: string) => {
  const umaDomain = uma.split("@")[1];
  const isLocal =
    umaDomain.startsWith("localhost:") || umaDomain.includes(".local:");
  const protocol = isLocal ? "http" : "https";
  return `${protocol}://${umaDomain}`;
};
