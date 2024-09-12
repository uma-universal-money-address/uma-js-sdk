import { useNwcRequester } from "@uma-sdk/uma-auth-client";

export const usePayToAddress = () => {
  const { nwcRequester } = useNwcRequester();

  const payToAddress = async () => {
    if (!nwcRequester) {
      console.warn("No NwcRequester available.");
      return;
    }
    const response = await nwcRequester.payToAddress({
      receiver: { lud16: "$ben@ben.pinkdrink.app" },
      sending_currency_code: "SAT",
      sending_currency_amount: 10,
    });
    console.log("Fetched response:", JSON.stringify(response, null, 2));
    return response;
  };

  return { payToAddress };
};
