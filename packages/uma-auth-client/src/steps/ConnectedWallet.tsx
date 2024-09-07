import styled from "@emotion/styled";
import { Button, Icon } from "@lightsparkdev/ui/components";
import { Label } from "@lightsparkdev/ui/components/typography/Label";
import { LabelModerate } from "@lightsparkdev/ui/components/typography/LabelModerate";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { ConnectionCard } from "src/components/ConnectionCard";
import { useDiscoveryDocument } from "src/hooks/useDiscoveryDocument";
import { useNwcRequester } from "src/hooks/useNwcRequester";
import { useUser } from "src/hooks/useUser";
import * as Nip47 from "src/Nip47Types";
import {
  Connection,
  ConnectionStatus,
  LimitFrequency,
  PermissionType,
} from "src/types/connection";
import { formatAmountString } from "src/utils/currency";

const RENEWAL_DATE_FUNCTIONS = {
  [LimitFrequency.DAILY]: (createdAt: dayjs.Dayjs) => createdAt.add(1, "day"),
  [LimitFrequency.WEEKLY]: (createdAt: dayjs.Dayjs) => createdAt.add(1, "week"),
  [LimitFrequency.MONTHLY]: (createdAt: dayjs.Dayjs) =>
    createdAt.add(1, "month"),
};

const getRenewalString = (connection: Connection) => {
  if (
    !connection.limitFrequency ||
    connection.limitFrequency === LimitFrequency.NONE
  ) {
    return;
  }

  const createdAt = dayjs(connection.createdAt);
  const renewalDate =
    RENEWAL_DATE_FUNCTIONS[connection.limitFrequency](createdAt);
  if (renewalDate.isAfter(dayjs(connection.expiration))) {
    return;
  }

  const daysUntilRenewal = renewalDate.diff(dayjs(), "days");
  if (daysUntilRenewal === 0) {
    return `Renews today at ${renewalDate.format("HH:mm")}`;
  } else if (daysUntilRenewal === 1) {
    return `Renews tomorrow at ${renewalDate.format("HH:mm")}`;
  } else {
    return `Renews in ${daysUntilRenewal} days`;
  }
};

export const ConnectedWallet = () => {
  const { uma } = useUser();
  const { discoveryDocument, isLoading: isLoadingDiscoveryDocument } =
    useDiscoveryDocument();
  const { nwcRequester } = useNwcRequester();
  const [balance, setBalance] = useState<
    Nip47.GetBalanceResponse | undefined
  >();

  // TODO: Get connection details with NWC connection
  const connection: Connection = {
    connectionId: "1",
    clientId: "",
    name: "",
    createdAt: "2024-08-23",
    permissions: [
      {
        type: PermissionType.SEND_PAYMENTS,
        description: "Send payments",
      },
      {
        type: PermissionType.READ_BALANCE,
        description: "Read balance",
      },
      {
        type: PermissionType.READ_TRANSACTIONS,
        description: "Read transactions",
      },
    ],
    amountInLowestDenom: 50000,
    amountInLowestDenomUsed: 12345,
    limitEnabled: true,
    currency: {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      decimals: 2,
      type: "fiat",
    },
    status: ConnectionStatus.ACTIVE,
    limitFrequency: LimitFrequency.MONTHLY,
    expiration: "2024-09-30",
    lastUsed: "2024-09-01",
  };

  useEffect(() => {
    async function fetchBalance() {
      const res = await nwcRequester?.getBalance();
      setBalance(res);
      console.log(res);
    }
    if (nwcRequester) {
      fetchBalance();
    }
  }, [nwcRequester]);

  let limitRenewalString = "";
  if (connection.limitEnabled) {
    limitRenewalString = getRenewalString(connection) || "";
  }

  const limitFrequencyString =
    connection.limitFrequency !== LimitFrequency.NONE
      ? `${connection.limitFrequency} spending limit remaining`
      : "";

  return (
    <Container>
      <ConnectionSection>
        <ConnectionCard
          uma={uma}
          connection={connection}
          balance={{
            amountInLowestDenom: balance?.balance || 0,
            currency: {
              code: "USD",
              name: "US Dollar",
              symbol: "$",
              decimals: 2,
              type: "fiat",
            },
          }}
        />
        <TextContainer>
          {balance ? (
            <Row>
              <Icon name="Gear" width={16} />
              <Description>
                {connection.limitEnabled ? (
                  <>
                    <LabelModerate
                      content={formatAmountString({
                        amountInLowestDenom: connection.amountInLowestDenomUsed,
                        currency: connection.currency,
                      })}
                    />{" "}
                    <Label
                      content={`${limitFrequencyString}${limitFrequencyString && limitRenewalString ? " · " : ""}${limitRenewalString}`}
                    />
                  </>
                ) : (
                  <LabelModerate content="No spending limit set" />
                )}
              </Description>
            </Row>
          ) : null}
          <Row>
            <Icon name="Clock" width={16} />
            <Description>
              {connection.expiration ? (
                <>
                  <Label content="Connection expires" />{" "}
                  <LabelModerate
                    content={dayjs(connection.expiration).format(
                      "MMM DD, YYYY",
                    )}
                  />
                </>
              ) : (
                <LabelModerate content="No expiration" />
              )}
            </Description>
          </Row>
        </TextContainer>
      </ConnectionSection>
      <ButtonContainer>
        <Button
          icon="LinkIcon"
          text="Manage connection"
          kind="secondary"
          loading={isLoadingDiscoveryDocument}
          externalLink={
            uma && discoveryDocument
              ? `${new URL(discoveryDocument.authorization_endpoint).origin}/connection/${connection.connectionId}`
              : undefined
          }
          fullWidth
        />
        <Button
          icon="ArrowCornerDownRight"
          text="Disconnect"
          kind="danger"
          loading={isLoadingDiscoveryDocument}
          externalLink={
            uma && discoveryDocument
              ? `${new URL(discoveryDocument.authorization_endpoint).origin}/connection/${connection.connectionId}`
              : undefined
          }
          fullWidth
        />
      </ButtonContainer>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 24px 32px 32px 32px;
  gap: 24px;
`;

const ConnectionSection = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  border: 1px solid #c0c9d6;
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
`;

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`;

const Description = styled.div``;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;
