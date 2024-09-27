import { useEffect, useState } from "react";
import { UmaUnsupportedError } from "src/types/errors";
import { getUmaDomain } from "src/utils/getUmaDomain";
import { useUser } from "./useUser";

export interface DiscoveryDocument {
  uma_major_versions: number[];
  authorization_endpoint: string;
  token_endpoint: string;
  code_challenge_methods_supported?: string[];
  grant_types_supported?: string[];
  supported_nwc_commands?: string[];
  uma_request_endpoint?: string;
  connection_management_endpoint?: string;
}

export const fetchDiscoveryDocument = async (uma: string) => {
  try {
    const discoveryDocument = await fetch(
      `${getUmaDomain(uma)}/.well-known/uma-configuration`,
    );
    if (!discoveryDocument.ok) {
      throw new UmaUnsupportedError("Failed to fetch discovery document");
    }
    const jsonBody = await discoveryDocument.json();
    if (!jsonBody.authorization_endpoint || !jsonBody.token_endpoint) {
      throw new UmaUnsupportedError(
        "Missing required fields in discovery document",
      );
    }

    return jsonBody as DiscoveryDocument;
  } catch (e) {
    console.error(e);
    throw new UmaUnsupportedError("Failed to fetch discovery document");
  }
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
