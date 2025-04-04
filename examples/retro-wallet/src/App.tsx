import styled from "@emotion/styled";
import {
  UmaConnectButton,
  useOAuth,
  useNwcRequester,
  GetInfoResponse,
  CurrencyPreference,
  Currency,
} from "@uma-sdk/uma-auth-client";
import { useEffect, useState } from "react";
import { LookupUserResponse, Quote } from "@uma-sdk/uma-auth-client";
import { LoadingDots, LoadingText } from "./components/Loading";

type AppState =
  | "CONNECT"
  | "ENTER_ADDRESS"
  | "ENTER_AMOUNT"
  | "CONFIRM_QUOTE"
  | "RESULT";

function formatReceivingCurrencyAmount(
  sendingAmountAsFloat: number,
  sendingCurrencyDecimals: number,
  receivingCurrencyPreference: CurrencyPreference
): string {
  const sendingAmount = sendingAmountAsFloat * 10 ** sendingCurrencyDecimals;
  const convertedAmount = sendingAmount * receivingCurrencyPreference.multiplier;
  return (convertedAmount / 10 ** receivingCurrencyPreference.currency.decimals).toFixed(receivingCurrencyPreference.currency.decimals);
}

function formatCurrencyAmount(
  amount: number,
  currency: Currency
): string {
  const symbol = currency.code === "SAT" ? "" : currency.symbol;
  return `${symbol}${(amount / 10 ** currency.decimals).toFixed(currency.decimals)} ${currency.code}`;
}

function App() {
  const [appState, setAppState] = useState<AppState>("CONNECT");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientInfo, setRecipientInfo] = useState<LookupUserResponse | null>(
    null
  );
  const [amount, setAmount] = useState<string>("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [senderInfo, setSenderInfo] = useState<GetInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState<{
    info: boolean;
    lookup: boolean;
    quote: boolean;
    send: boolean;
  }>({
    info: false,
    lookup: false,
    quote: false,
    send: false,
  });
  const { nwcConnectionUri } = useOAuth();
  const { nwcRequester } = useNwcRequester();

  useEffect(() => {
    if (nwcRequester && nwcConnectionUri && appState == "CONNECT") {
      setIsLoading((prev) => ({ ...prev, info: true }));
      nwcRequester
        .getInfo()
        .then((info: GetInfoResponse) => {
          setSenderInfo(info);
          setAppState("ENTER_ADDRESS");
        })
        .finally(() => {
          setIsLoading((prev) => ({ ...prev, info: false }));
        });
    } else if (!nwcConnectionUri && appState !== "CONNECT") {
      setAppState("CONNECT");
      setSenderInfo(null);
    }
  }, [nwcConnectionUri, appState, nwcRequester, senderInfo]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // If the value doesn't start with $, add it
    if (!value.startsWith("$")) {
      setRecipientAddress("$" + value);
    } else {
      setRecipientAddress(value);
    }
  };

  const handleAddressSubmit = async () => {
    if (!nwcRequester) return;
    setIsLoading((prev) => ({ ...prev, lookup: true }));
    try {
      const baseCurrency = senderInfo?.currencies?.[0]?.currency.code;
      const userInfo = await nwcRequester.lookupUser({
        receiver: { lud16: recipientAddress },
        base_sending_currency_code: baseCurrency,
      });
      setRecipientInfo(userInfo);
      setAppState("ENTER_AMOUNT");
    } catch (error) {
      console.error("Failed to lookup user:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, lookup: false }));
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid number with up to 2 decimal places
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  const handleAmountSubmit = async () => {
    if (!nwcRequester || !recipientInfo || !amount) return;
    setIsLoading((prev) => ({ ...prev, quote: true }));
    try {
      const quoteResponse = await nwcRequester.fetchQuote({
        receiver: { lud16: recipientAddress },
        locked_currency_side: "SENDING",
        sending_currency_code: senderInfo?.currencies?.[0]?.currency.code || "SAT",
        locked_currency_amount: parseFloat(amount) *  
          10 **
            (senderInfo?.currencies?.[0]?.currency.decimals || 0),
        receiving_currency_code: recipientInfo.currencies[0].currency.code,
      });
      setQuote(quoteResponse);
      setAppState("CONFIRM_QUOTE");
    } catch (error) {
      console.error("Failed to fetch quote:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, quote: false }));
    }
  };

  const handleConfirmQuote = async () => {
    if (!nwcRequester || !quote) return;
    setIsLoading((prev) => ({ ...prev, send: true }));
    try {
      await nwcRequester.executeQuote({payment_hash: quote.payment_hash});
      setResult("success");
      setAppState("RESULT");
    } catch (error) {
      console.error("Failed to execute quote:", error);
      setResult("error");
      setAppState("RESULT");
    } finally {
      setIsLoading((prev) => ({ ...prev, send: false }));
    }
  };

  const handleReset = () => {
    setAppState("ENTER_ADDRESS");
    setRecipientAddress("");
    setRecipientInfo(null);
    setAmount("");
    setQuote(null);
    setResult(null);
  };

  return (
    <TerminalContainer>
      <TerminalHeader>
        <TerminalTitle>Retro Wallet</TerminalTitle>
        <HeaderControls>
          {nwcConnectionUri && (
            <UmaConnectButton
              app-identity-pubkey="npub1hf4dj426lt26x5z7d3rc9c95yu7qggr3nv30xkqctv4vru7wnrsq6vw3gz"
              nostr-relay="wss://nos.lol"
              redirect-uri="http://localhost:3001"
              required-commands={[
                "get_budget",
                "get_info",
                "lookup_user",
                "fetch_quote",
                "execute_quote",
              ]}
              optional-commands={["list_transactions"]}
              budget-amount="500"
              budget-currency="SAT"
              budget-period="monthly"
            />
          )}
          <TerminalControls>
            <TerminalButton color="#FF5F56" />
            <TerminalButton color="#FFBD2E" />
            <TerminalButton color="#27C93F" />
          </TerminalControls>
        </HeaderControls>
      </TerminalHeader>
      <TerminalContent>
        {!nwcConnectionUri && (
          <ConnectScreen>
            <TerminalText>Welcome to Retro Wallet</TerminalText>
            <TerminalText>Connect your wallet to begin</TerminalText>
            <UmaConnectButton
              app-identity-pubkey="npub1hf4dj426lt26x5z7d3rc9c95yu7qggr3nv30xkqctv4vru7wnrsq6vw3gz"
              nostr-relay="wss://nos.lol"
              redirect-uri="http://localhost:3001"
              required-commands={[
                "get_budget",
                "get_info",
                "lookup_user",
                "fetch_quote",
                "execute_quote",
              ]}
              optional-commands={["list_transactions"]}
              budget-amount="5000"
              budget-currency="USD"
              budget-period="monthly"
            />
          </ConnectScreen>
        )}

        {appState === "ENTER_ADDRESS" && (
          <AddressScreen>
            <TerminalText>Enter recipient UMA address:</TerminalText>
            <TerminalInput
              type="text"
              value={recipientAddress}
              onChange={handleAddressChange}
              placeholder="$example@uma.com"
            />
            <ActionButton onClick={handleAddressSubmit} disabled={isLoading.lookup}>
              <LoadingText>
                {isLoading.lookup ? "Looking up" : "Lookup"}
                {isLoading.lookup && <LoadingDots />}
              </LoadingText>
            </ActionButton>
          </AddressScreen>
        )}

        {appState === "ENTER_AMOUNT" && recipientInfo && (
          <AmountScreen>
            <TerminalText>Enter amount to send (USD):</TerminalText>
            <TerminalInput
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]{0,2}"
            />
            <TerminalText>
              Recipient will receive about:{" "}
              {formatReceivingCurrencyAmount(
                parseFloat(amount || "0"),
                senderInfo?.currencies?.[0]?.currency.decimals || 0,
                recipientInfo.currencies[0]
              )}{" "}
              {recipientInfo.currencies[0].currency.code}
            </TerminalText>
            <ActionButton
              onClick={handleAmountSubmit}
              disabled={isLoading.quote || !amount || parseFloat(amount) <= 0}
            >
              <LoadingText>
                {isLoading.quote ? "Getting quote" : "Get Quote"}
                {isLoading.quote && <LoadingDots />}
              </LoadingText>
            </ActionButton>
          </AmountScreen>
        )}

        {appState === "CONFIRM_QUOTE" &&
          quote &&
          senderInfo &&
          recipientInfo && (
            <QuoteScreen>
              <TerminalText>Quote Details:</TerminalText>
              <TerminalText>
                Sending:{" "}
                {formatCurrencyAmount(
                  quote.total_sending_amount,
                  senderInfo.currencies?.[0]?.currency || { code: "SAT", decimals: 0, symbol: "", name: "Satoshi" }
                )}{" "}
                {quote.sending_currency_code}
              </TerminalText>
              <TerminalText>
                Receiving:{" "}
                {formatCurrencyAmount(
                  quote.total_receiving_amount,
                  recipientInfo.currencies[0].currency
                )}{" "}
                {quote.receiving_currency_code}
              </TerminalText>
              <TerminalText>
                Fee: {formatCurrencyAmount(
                  quote.fees,
                  senderInfo.currencies?.[0]?.currency || {
                    code: "SAT",
                    decimals: 0,
                    symbol: "",
                    name: "Satoshi",
                  }
                )}
              </TerminalText>
              <ActionButton onClick={handleConfirmQuote} disabled={isLoading.send}>
                <LoadingText>
                  {isLoading.send ? "Sending" : "Confirm & Send"}
                  {isLoading.send && <LoadingDots />}
                </LoadingText>
              </ActionButton>
            </QuoteScreen>
          )}

        {appState === "RESULT" && (
          <ResultScreen>
            <TerminalText>
              {result === "success" ? "Payment Successful!" : "Payment Failed"}
            </TerminalText>
            <ActionButton onClick={handleReset}>
              Send Another Payment
            </ActionButton>
          </ResultScreen>
        )}
      </TerminalContent>
    </TerminalContainer>
  );
}

const TerminalContainer = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 2rem auto;
  background-color: #1a1a1a;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const TerminalHeader = styled.div`
  background-color: #2a2a2a;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TerminalTitle = styled.h1`
  color: #fff;
  margin: 0;
  font-family: "IBM Plex Mono", monospace;
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const TerminalControls = styled.div`
  display: flex;
  gap: 8px;
`;

const TerminalButton = styled.button<{ color?: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${(props) => props.color || "#FF5F56"};
  border: none;
  cursor: pointer;
  padding: 0;
  min-width: unset;

  &:hover {
    opacity: 0.8;
  }
`;

const TerminalContent = styled.div`
  padding: 2rem;
  min-height: 400px;
`;

const TerminalText = styled.p`
  color: #00ff00;
  font-family: "IBM Plex Mono", monospace;
  margin: 0.5rem 0;
`;

const TerminalInput = styled.input`
  background-color: #2a2a2a;
  border: 1px solid #00ff00;
  color: #00ff00;
  padding: 0.5rem;
  font-family: "IBM Plex Mono", monospace;
  width: 100%;
  max-width: 300px;
  margin: 1rem auto;
  border-radius: 4px;
  display: block;

  &:focus {
    outline: none;
    border-color: #00ff00;
  }
`;

const ActionButton = styled.button`
  background-color: #2a2a2a;
  border: 1px solid #00ff00;
  color: #00ff00;
  padding: 0.5rem;
  font-family: "IBM Plex Mono", monospace;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease-in-out;
  min-width: 120px;
  width: 100%;
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  margin: 0 auto;
  text-align: center;
  box-sizing: content-box;

  &:hover:not(:disabled) {
    background-color: #00ff00;
    color: #000000;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: #666;
  }
`;

const ConnectScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const AddressScreen = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const AmountScreen = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const QuoteScreen = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ResultScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

export default App;
