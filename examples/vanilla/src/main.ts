import './style.css'
import { NwcRequester, useOAuth } from "@uma-sdk/uma-auth-client";

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <button id="clear-auth" style="display: none;">Clear UMA Auth State</button>
    <div class="card">
      <span id="balance">Balance: Not connected</span>
    </div>
  </div>
`;

const clearAuthButton = document.getElementById("clear-auth")!;
const balanceElement = document.getElementById("balance")!;

let requester: NwcRequester | null = null;
useOAuth.subscribe((oAuth) => {
  if (oAuth.isConnectionValid() && oAuth.nwcConnectionUri && !requester) {
    if (oAuth.token) {
      requester = new NwcRequester(oAuth.nwcConnectionUri, oAuth.clearUserAuth, oAuth.oAuthTokenExchange);
    } else {
      requester = new NwcRequester(oAuth.nwcConnectionUri, oAuth.clearUserAuth);
    }
    fetchBalance(requester);

    clearAuthButton!.style.display = "block";
    clearAuthButton.addEventListener("click", () => {
      requester = null;
      oAuth.clearUserAuth();
    });
  }

  if (!oAuth.isConnectionValid()) {
    clearAuthButton!.style.display = "none";
    balanceElement.innerText = `Balance: Not connected`;
  }
})


const fetchBalance = async (requester: NwcRequester) => {
  balanceElement.innerText = `Balance: Loading...`;
  try {
    const response = await requester.getBalance();
    let balanceString = "";
    if (!response.currency) {
      balanceString = `${Math.round(response.balance / 1000)} SAT`;
    } else {
      const amountInNormalDenom = (
        response.balance / Math.pow(10, response.currency.decimals)
      ).toFixed(response.currency.decimals);
      if (response.currency.symbol === "") {
        balanceString = `${amountInNormalDenom} ${response.currency.code}`;
      } else {
        balanceString = `${response.currency.symbol}${amountInNormalDenom}`;
      }
    }
    balanceElement.innerText = `Balance: ${balanceString}`;
  } catch (error) {
    console.error("Error fetching balance:", error);
    balanceElement.innerText = `Balance: ${error}`;
    return
  }
};
