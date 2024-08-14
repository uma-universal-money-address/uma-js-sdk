import styled from "@emotion/styled";
import { Modal } from "@lightsparkdev/ui/components";

interface Props {
  visible: boolean;
  onClose: () => void;
  insertionPoint: HTMLElement;
}

export const ConnectUmaModal = (props: Props) => {
  const clientId = "1";
  const redirectUri = "http://localhost:3001";
  const responseType = "code";
  const codeChallenge = "1234";
  const codeChallengeMethod = "S256";

  return (
    <Modal
      ghost
      smKind="drawer"
      visible={props.visible}
      cancelHidden
      onClose={props.onClose}
      onCancel={props.onClose}
      submitText="Connect your UMA"
      onSubmit={() =>
        (window.location.href = `http://localhost:3000/apps/new?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}&required_commands=send_payments&optional_commands=read_balance,read_transactions&budget=10.USD%2Fmonthly&expiration_period=year`)
      }
      buttonLayout="vertical"
      extraActions={[
        {
          text: "More options",
          placement: "below",
          onClick: () => {
            console.log("More options button clicked");
          },
        },
      ]}
      // insertionPoint={props.insertionPoint}
    >

    </Modal>
  )
}
