import styled from "@emotion/styled";
import { Button, Icon } from "@lightsparkdev/ui/components";
import { Label } from "@lightsparkdev/ui/components/typography/Label";
import {
  type Connection,
  type Currency,
  LimitFrequency,
} from "src/types/connection";
import { formatAmountString } from "src/utils/currency";

interface Props {
  connection: Connection;
  uma?: string | undefined;
  balance?:
    | {
        amountInLowestDenom: number;
        currency: Currency;
      }
    | undefined;
}

export const ConnectionCard = ({ connection, uma, balance }: Props) => {
  const handleCopyUma = () => {
    navigator.clipboard.writeText(uma || "");
  };

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
    : `${connection.limitFrequency === LimitFrequency.NONE ? "" : connection.limitFrequency} spending limit remaining`;

  return (
    <Container>
      {uma ? (
        <UmaCopy>
          <Uma>
            {uma}
            <Icon name="Uma" width={24} color="white" />
          </Uma>
          <Button kind="ghost" icon="Copy" onClick={handleCopyUma} />
        </UmaCopy>
      ) : (
        <div></div>
      )}
      <Main>
        <MainHeading>{mainHeading}</MainHeading>
        <Label size="Large" content={description} color="white" />
      </Main>
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

const UmaCopy = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const Uma = styled.span`
  color: #fff;
  font-family: Manrope;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
`;

const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MainHeading = styled.span`
  color: #fff;
  font-family: Manrope;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
  letter-spacing: -0.48px;
`;
