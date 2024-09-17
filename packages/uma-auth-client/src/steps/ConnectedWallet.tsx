import styled from "@emotion/styled";
import { Icon } from "@lightsparkdev/ui/components";
import { Label } from "@lightsparkdev/ui/components/typography/Label";
import { LabelModerate } from "@lightsparkdev/ui/components/typography/LabelModerate";
import dayjs from "dayjs";
import { ConnectionCard } from "src/components/ConnectionCard";
import { useBalance } from "src/hooks/nwc-requests/useBalance";
import { useCurrency } from "src/hooks/nwc-requests/useCurrency";
import { useDiscoveryDocument } from "src/hooks/useDiscoveryDocument";
import { TokenState, useOAuth } from "src/hooks/useOAuth";
import { useUser } from "src/hooks/useUser";
import { Connection, LimitFrequency } from "src/types/connection";
import { formatAmountString } from "src/utils/currency";

const RENEWAL_DATE_FUNCTIONS = {
  [LimitFrequency.DAILY]: (createdAt: dayjs.Dayjs) => createdAt.add(1, "day"),
  [LimitFrequency.WEEKLY]: (createdAt: dayjs.Dayjs) => createdAt.add(1, "week"),
  [LimitFrequency.MONTHLY]: (createdAt: dayjs.Dayjs) =>
    createdAt.add(1, "month"),
  [LimitFrequency.YEARLY]: (createdAt: dayjs.Dayjs) => createdAt.add(1, "year"),
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

const isLimitEnabled = (token: TokenState | undefined) => {
  return !!token?.budget;
};

const getLimitFrequency = (token: TokenState | undefined) => {
  const [leftOfSlash, rightOfSlash] = token?.budget?.split("/") || [];

  if (!rightOfSlash) {
    return LimitFrequency.NONE;
  }

  const limitFrequency = rightOfSlash as LimitFrequency;
  if (Object.values(LimitFrequency).includes(limitFrequency)) {
    return limitFrequency;
  }

  throw new Error("Invalid limit frequency");
};

export const ConnectedWallet = () => {
  const { uma } = useUser();
  const { discoveryDocument, isLoading: isLoadingDiscoveryDocument } =
    useDiscoveryDocument();
  const { nwcExpiresAt, token } = useOAuth();
  const { balance, isLoading: isLoadingBalance } = useBalance();
  const { currency, isLoading: isLoadingCurrency } = useCurrency();

  if (isLoadingBalance || isLoadingCurrency || isLoadingDiscoveryDocument) {
    // TODO: Add loading state
    return <div>Loading...</div>;
  }

  if (!currency) {
    // TODO: Add error state
    return <div>Error loading currency data</div>;
  }

  const expiration = dayjs(nwcExpiresAt).format("YYYY-MM-DD");

  const connection: Connection = {
    // TODO: Get createdAt from auth token or info
    createdAt: "2024-08-23",
    // TODO: Get amounts from somewhere
    amountInLowestDenom: 50000,
    amountInLowestDenomUsed: 12345,
    limitEnabled: isLimitEnabled(token),
    currency,
    limitFrequency: getLimitFrequency(token),
    expiration,
  };

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
            currency,
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
                        currency,
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
              {expiration ? (
                <>
                  <Label content="Connection expires" />{" "}
                  <LabelModerate
                    content={dayjs(expiration).format("MMM DD, YYYY")}
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
        {/* <Button
          icon="LinkIcon"
          text="Manage connection"
          kind="secondary"
          loading={isLoadingDiscoveryDocument}
          externalLink={
            uma && discoveryDocument
              ? `${new URL(discoveryDocument.connection_management_endpoint)}`
              : undefined
          }
          fullWidth
        /> */}
        {/* <Button
          icon="ArrowCornerDownRight"
          text="Disconnect"
          kind="danger"
          loading={isLoadingDiscoveryDocument}
          externalLink={
            uma && discoveryDocument
              ? `${new URL(discoveryDocument.revocation_endpoint)}`
              : undefined
          }
          fullWidth
        /> */}
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
