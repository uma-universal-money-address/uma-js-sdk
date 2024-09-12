import { useNwcRequester } from "@uma-sdk/uma-auth-client";

export const usePayToAddress = () => {
  const { nwcRequester } = useNwcRequester();

  const payToAddress = async () => {
    if (!nwcRequester) {
      console.warn("No NwcRequester available.");
      return;
    }
    const response = await nwcRequester.payToAddress({
      receiver: { lud16: "lstimes@lstimes.pinkdrink.app" },
      sending_currency_code: "USD",
      sending_currency_amount: 1
    });
    return response.success;
  };

  return { payToAddress };
};