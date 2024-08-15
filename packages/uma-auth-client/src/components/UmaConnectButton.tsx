import { ThemeProvider } from "@emotion/react";
import { Button } from "@lightsparkdev/ui/components";
import { themes } from "@lightsparkdev/ui/styles/themes";
import { GlobalStyles } from "src/GlobalStyles";

export const UmaConnectButton = () => {
  const clientId = "1";
  const redirectUri = "http://localhost:3000";
  const responseType = "code";
  const codeChallenge = "1234";
  const codeChallengeMethod = "S256";

  return (
    <ThemeProvider theme={themes.umameDocsLight}>
      <GlobalStyles />
      <Button
        icon="Uma"
        text="Connect"
        kind="primary"
        onClick={() =>
          (window.location.href = `http://localhost:3000/apps/new?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}&required_commands=send_payments&optional_commands=read_balance,read_transactions&budget=10.USD%2Fmonthly&expiration_period=year`)
        }
      />
    </ThemeProvider>
  );
};
