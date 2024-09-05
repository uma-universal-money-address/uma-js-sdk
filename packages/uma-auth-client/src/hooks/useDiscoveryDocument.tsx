import { useEffect, useState } from "react";
import { getUmaDomain } from "src/utils/getUmaDomain";
import { useUser } from "./useUser";

export interface DiscoveryDocument {
  authorization_endpoint: string;
  token_endpoint: string;
  code_challenge_methods_supported: string[];
  grant_types_supported?: string[];
  supported_nwc_commands?: string[];
  uma_major_versions?: number[];
  uma_request_endpoint?: string;
}

export const fetchDiscoveryDocument = async (uma: string) => {
  const discoveryDocument = await fetch(
    `${getUmaDomain(uma)}/.well-known/uma-configuration`,
  );
  return (await discoveryDocument.json()) as DiscoveryDocument;
};

export const useDiscoveryDocument = () => {
  const { uma } = useUser();
  const [discoveryDocument, setDiscoveryDocument] =
    useState<DiscoveryDocument>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchDiscoveryDocumentInternal(uma: string) {
      setIsLoading(true);
      try {
        const discoveryDocument = await fetchDiscoveryDocument(uma);

        if (!ignore) {
          setDiscoveryDocument(discoveryDocument);
        }
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    }

    let ignore = false;
    if (uma) {
      fetchDiscoveryDocumentInternal(uma);
    }
    return () => {
      ignore = true;
    };
  }, [uma]);

  return { discoveryDocument, isLoading };
};
