export const isDomainLocalhost = (domain: string) => {
  const domainWithoutPort = domain.split(":")[0];
  const tld = domainWithoutPort.split(".").pop();
  return (
    domainWithoutPort === "localhost" ||
    domainWithoutPort === "127.0.0.1" ||
    tld === "local" ||
    tld === "internal"
  );
};
