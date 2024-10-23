"use client";
import styled from "@emotion/styled";
import { Icon, UnstyledButton } from "@lightsparkdev/ui/components";
import { Label } from "@lightsparkdev/ui/components/typography/Label";
import { type Connection, type Currency } from "src/types/connection";
import { formatAmountString } from "src/utils/currency";
import { isValidUma } from "src/utils/isValidUma";
import { abbreviateAddress } from "src/utils/strings";
import { Shimmer } from "./Shimmer";

interface Props {
  connection: Connection;
  address?: string | undefined;
  balance?:
    | {
        amountInLowestDenom: number;
        currency: Currency;
      }
    | undefined;
  isLoading?: boolean;
}

export const ConnectionCard = ({
  connection,
  address,
  balance,
  isLoading,
}: Props) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(address || "");
  };

  let mainContent = <></>;
  if (isLoading) {
    mainContent = (
      <>
        <Shimmer height={28} width={136} />
        <Shimmer height={20} width={92} />
      </>
    );
  } else {
    const mainHeading = balance
      ? formatAmountString({
          amountInLowestDenom: balance.amountInLowestDenom,
          currency: balance.currency,
        })
      : formatAmountString({
          amountInLowestDenom:
            connection.amountInLowestDenom - connection.amountInLowestDenomUsed,
          currency: connection.currency,
        });
    const description = balance
      ? "Total balance"
      : `${connection.renewalPeriod === "never" ? "" : connection.renewalPeriod} spending limit remaining`;

    mainContent = (
      <>
        <MainHeading>{mainHeading}</MainHeading>
        <Label size="Large" content={description} color="white" />
      </>
    );
  }

  let addressComponent = <></>;
  if (isValidUma(address)) {
    addressComponent = (
      <AddressContainer>
        <Address>{address}</Address>
        <Icon name="Uma" width={22} color="white" />
      </AddressContainer>
    );
  } else if (address) {
    addressComponent = (
      <AddressContainer>
        <Icon name="Zap" width={12} color="white" />
        <Address>{abbreviateAddress(address)}</Address>
      </AddressContainer>
    );
  }

  return (
    <Container>
      <TextCopy>
        {addressComponent}
        {address && (
          <IconButton onClick={handleCopy}>
            <Icon
              name="Copy"
              width={14}
              color="gray50"
              iconProps={{
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
              }}
            />
          </IconButton>
        )}
      </TextCopy>
      <Main>{mainContent}</Main>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  height: 204px;
  padding: 24px;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 16px;
  background: linear-gradient(111deg, #0c0d0f 0%, #21283a 100%);
  box-shadow:
    0px 0px 0px 1px rgba(0, 0, 0, 0.06),
    0px 1px 1px -0.5px rgba(0, 0, 0, 0.06),
    0px 3px 3px -1.5px rgba(0, 0, 0, 0.06),
    0px 6px 6px -3px rgba(0, 0, 0, 0.06),
    0px 12px 12px -6px rgba(0, 0, 0, 0.06),
    0px 24px 24px -12px rgba(0, 0, 0, 0.06);
`;

const TextCopy = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border: none;
`;

const Address = styled.span`
  color: #fff;
  font-family: Manrope;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;

  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;

const AddressContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  padding-right: 4px;
`;

const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MainHeading = styled.span`
  color: #fff;
  font-family: Manrope;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
  letter-spacing: -0.48px;
`;

const IconButton = styled(UnstyledButton)`
  width: 28px;
  height: 28px;
  padding: 0px;
  justify-self: flex-end;
  border-radius: 50%;

  &:hover {
    background: #00000005;
  }

  &:active {
    background: #00000008;
  }
`;
