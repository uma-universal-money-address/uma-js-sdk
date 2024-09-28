import styled from "@emotion/styled";
import { Button, Icon } from "@lightsparkdev/ui/components";
import { Label } from "@lightsparkdev/ui/components/typography/Label";
import { LabelModerate } from "@lightsparkdev/ui/components/typography/LabelModerate";
import dayjs from "dayjs";
import { ConnectionCard } from "src/components/ConnectionCard";
import { useBalance } from "src/hooks/nwc-requests/useBalance";
import { useGetBudget } from "src/hooks/nwc-requests/useGetBudget";
import { useGetInfo } from "src/hooks/nwc-requests/useGetInfo";
import { useDiscoveryDocument } from "src/hooks/useDiscoveryDocument";
import { useModalState } from "src/hooks/useModalState";
import { type TokenState, useOAuth } from "src/hooks/useOAuth";
import { useUser } from "src/hooks/useUser";
import { type Connection, LimitFrequency } from "src/types/connection";
import { formatAmountString } from "src/utils/currency";

const getRenewalString = (renewsAt: number, connection: Connection) => {
  const renewalDate = dayjs(renewsAt * 1000);
  if (
    connection.expiration &&
    renewalDate.isAfter(dayjs(connection.expiration))
  ) {
    const daysUntilExpiration = renewalDate.diff(connection.expiration, "days");
    return `Expires in ${daysUntilExpiration} days`;
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
  const limitFrequencyString = token?.budget?.split("/")[1] || [];

  if (!limitFrequencyString) {
    return LimitFrequency.NONE;
  }

  const limitFrequency = limitFrequencyString as LimitFrequency;
  if (Object.values(LimitFrequency).includes(limitFrequency)) {
    return limitFrequency;
  }

  throw new Error("Invalid limit frequency");
};

export const ConnectedWallet = () => {
  const { uma } = useUser();
  const { discoveryDocument, isLoading: isLoadingDiscoveryDocument } =
    useDiscoveryDocument();
  const { nwcExpiresAt, token, clearUserAuth } = useOAuth();
  const { balance, isLoading: isLoadingBalance } = useBalance();
  const { getInfoResponse, isLoading: isLoadingGetInfo } = useGetInfo();
  const { getBudgetResponse, isLoading: isLoadingGetBudgetResponse } =
    useGetBudget();
  const { setIsModalOpen } = useModalState();

  if (
    isLoadingBalance ||
    isLoadingGetInfo ||
    isLoadingGetBudgetResponse ||
    isLoadingDiscoveryDocument
  ) {
    // TODO: Add loading state
    return <Container>Loading...</Container>;
  }

  if (!getInfoResponse || !getBudgetResponse) {
    // TODO: Add error state
    return <Container>Error loading currency data</Container>;
  }

  const handleDisconnect = () => {
    setIsModalOpen(false);
    clearUserAuth();
  };

  const expiration = dayjs(nwcExpiresAt).format("YYYY-MM-DD");

  const totalBudgetSats = Math.round(
    (getBudgetResponse.total_budget || 0) / 1000,
  );
  const usedBudgetSats = Math.round(
    (getBudgetResponse.used_budget || 0) / 1000,
  );
  const currency = getBudgetResponse.currency
    ? {
        code: getBudgetResponse.currency.code,
        name: getBudgetResponse.currency.name,
        symbol: getBudgetResponse.currency.symbol,
        decimals: getBudgetResponse.currency.decimals,
      }
    : {
        code: "SAT",
        name: "Satoshi",
        symbol: "",
        decimals: 0,
      };

  const connection: Connection = {
    amountInLowestDenom: getBudgetResponse.currency
      ? getBudgetResponse.currency.total_budget
      : totalBudgetSats,
    amountInLowestDenomUsed: getBudgetResponse.currency
      ? getBudgetResponse.currency.used_budget
      : usedBudgetSats,
    limitEnabled: isLimitEnabled(token),
    currency,
    limitFrequency: getLimitFrequency(token),
    expiration,
  };

  let limitRenewalString = "";
  if (connection.limitEnabled && getBudgetResponse.renews_at) {
    limitRenewalString =
      getRenewalString(getBudgetResponse.renews_at, connection) || "";
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
                        amountInLowestDenom:
                          connection.amountInLowestDenom -
                          connection.amountInLowestDenomUsed,
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
        <Button
          icon="LinkIcon"
          text="Manage connection"
          kind="secondary"
          loading={isLoadingDiscoveryDocument}
          externalLink={
            uma &&
            discoveryDocument &&
            discoveryDocument.connection_management_endpoint
              ? `${new URL(discoveryDocument.connection_management_endpoint)}`
              : undefined
          }
          fullWidth
        />
        <Button
          icon="ArrowCornerDownRight"
          text="Disconnect"
          kind="danger"
          onClick={handleDisconnect}
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
