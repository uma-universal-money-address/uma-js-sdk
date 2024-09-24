import styled from "@emotion/styled";
import { UmaConnectButton, useOAuth } from "@uma-sdk/uma-auth-client";
import { useState } from "react";
import Balance from "./components/Balance";
import InvoiceCreator from "./components/InvoiceCreator";
import LookupUser from "./components/LookupUser";
import PayInvoice from "./components/PayInvoice";
import PayUma from "./components/PayUma";

function App() {
  const [appIdentityPubkey, setAppIdentityPubkey] = useState(
    "npub1scmpzl2ehnrtnhu289d9rfrwprau9z6ka0pmuhz6czj2ae5rpuhs2l4j9d",
  );
  const [nostrRelay, setNostrRelay] = useState("wss://nos.lol");
  const [redirectUri, setRedirectUri] = useState("http://localhost:3001");
  const [requiredCommands, setRequiredCommands] = useState([
    "pay_invoice",
    "get_balance",
    "get_info",
    "make_invoice",
  ]);
  const [optionalCommands, setOptionalCommands] = useState([
    "list_transactions",
  ]);
  const [budgetAmount, setBudgetAmount] = useState("500");
  const [budgetCurrency, setBudgetCurrency] = useState("SAT");
  const [budgetPeriod, setBudgetPeriod] = useState("monthly");

  const [umaConnectBackground, setUmaConnectBackground] = useState("#7366C5");
  const [umaConnectRadius, setUmaConnectRadius] = useState("8px");
  const [umaConnectPaddingX, setUmaConnectPaddingX] = useState("32px");
  const [umaConnectPaddingY, setUmaConnectPaddingY] = useState("16px");
  const [umaConnectTextColor, setUmaConnectTextColor] = useState("#F9F9F9");
  const [umaConnectFontFamily, setUmaConnectFontFamily] = useState("Arial");
  const [umaConnectFontSize, setUmaConnectFontSize] = useState("16px");
  const [umaConnectFontWeight, setUmaConnectFontWeight] = useState("600");
  const { nwcConnectionUri, clearUserAuth } = useOAuth();

  const handleChangeInput =
    (setter: (value: string) => void) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
    };

  const handleChangeCommands =
    (setter: (value: string[]) => void) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value.split(","));
    };

  return (
    <Main>
      {nwcConnectionUri && (
        <ClearAuthStateButton onClick={clearUserAuth}>
          Clear UMA Auth State
        </ClearAuthStateButton>
      )}
      <Options>
        <Input
          name="appIdentityPubkey"
          value={appIdentityPubkey}
          onChange={handleChangeInput(setAppIdentityPubkey)}
        />
        <Input
          name="nostrRelay"
          value={nostrRelay}
          onChange={handleChangeInput(setNostrRelay)}
        />
        <Input
          name="redirectUri"
          value={redirectUri}
          onChange={handleChangeInput(setRedirectUri)}
        />
        <Input
          name="requiredCommands"
          value={requiredCommands.join(",")}
          onChange={handleChangeCommands(setRequiredCommands)}
        />
        <Input
          name="optionalCommands"
          value={optionalCommands.join(",")}
          onChange={handleChangeCommands(setOptionalCommands)}
        />
        <Input
          name="budgetAmount"
          value={budgetAmount}
          onChange={handleChangeInput(setBudgetAmount)}
        />
        <Input
          name="budgetCurrency"
          value={budgetCurrency}
          onChange={handleChangeInput(setBudgetCurrency)}
        />
        <Input
          name="budgetPeriod"
          value={budgetPeriod}
          onChange={handleChangeInput(setBudgetPeriod)}
        />
        <Input
          name="umaConnectBackground"
          value={umaConnectBackground}
          onChange={handleChangeInput(setUmaConnectBackground)}
        />
        <Input
          name="umaConnectRadius"
          value={umaConnectRadius}
          onChange={handleChangeInput(setUmaConnectRadius)}
        />
        <Input
          name="umaConnectPaddingX"
          value={umaConnectPaddingX}
          onChange={handleChangeInput(setUmaConnectPaddingX)}
        />
        <Input
          name="umaConnectPaddingY"
          value={umaConnectPaddingY}
          onChange={handleChangeInput(setUmaConnectPaddingY)}
        />
        <Input
          name="umaConnectTextColor"
          value={umaConnectTextColor}
          onChange={handleChangeInput(setUmaConnectTextColor)}
        />
        <Input
          name="umaConnectFontFamily"
          value={umaConnectFontFamily}
          onChange={handleChangeInput(setUmaConnectFontFamily)}
        />
        <Input
          name="umaConnectFontSize"
          value={umaConnectFontSize}
          onChange={handleChangeInput(setUmaConnectFontSize)}
        />
        <Input
          name="umaConnectFontWeight"
          value={umaConnectFontWeight}
          onChange={handleChangeInput(setUmaConnectFontWeight)}
        />
      </Options>
      <Section>
        <Intro>
          <h1>UMA Auth Client SDK demo</h1>
          {!nwcConnectionUri && (
            <p>Click the UMA Connect button to get started</p>
          )}
        </Intro>
        <UmaConnectButton
          app-identity-pubkey={appIdentityPubkey}
          nostr-relay={nostrRelay}
          redirect-uri={redirectUri}
          required-commands={requiredCommands}
          optional-commands={optionalCommands}
          budget-amount={budgetAmount}
          budget-currency={budgetCurrency}
          budget-period={budgetPeriod}
          style={{
            "--uma-connect-background": umaConnectBackground,
            "--uma-connect-radius": umaConnectRadius,
            "--uma-connect-padding-x": umaConnectPaddingX,
            "--uma-connect-padding-y": umaConnectPaddingY,
            "--uma-connect-text-color": umaConnectTextColor,
            "--uma-connect-font-family": umaConnectFontFamily,
            "--uma-connect-font-size": umaConnectFontSize,
            "--uma-connect-font-weight": umaConnectFontWeight,
          }}
        />
        {nwcConnectionUri && <Balance />}
        {nwcConnectionUri && <InvoiceCreator />}
        {nwcConnectionUri && <PayInvoice />}
        {nwcConnectionUri && <LookupUser />}
        {nwcConnectionUri && <PayUma />}
      </Section>
    </Main>
  );
}

const Input = ({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: () => void;
}) => {
  return (
    <InputContainer>
      {name}
      <StyledInput value={value} onChange={onChange} />
    </InputContainer>
  );
};

const Main = styled.main`
  display: grid;
  grid-template-columns: 360px auto;
  height: 100dvh;
`;

const Intro = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 24px;
  align-items: center;
  justify-content: center;
`;

const Options = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background-color: ${({ theme }) => theme.secondary};
  overflow-y: scroll;
`;

const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StyledInput = styled.input`
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

const ClearAuthStateButton = styled.button`
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  cursor: pointer;
  position: fixed;
  top: 0;
  right: 0;
  margin: 16px;
`;

export default App;
