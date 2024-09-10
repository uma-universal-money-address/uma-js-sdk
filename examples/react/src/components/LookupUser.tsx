import styled from "@emotion/styled";
import { LookupUserResponse, useNwcRequester } from "@uma-sdk/uma-auth-client";
import { useState } from "react";

const LookupUser = () => {
  const [user, setUser] = useState<LookupUserResponse | null>(null);
  const [uma, setUma] = useState<string>("");
  const { nwcRequester } = useNwcRequester();

  const lookupUser = async () => {
    if (!nwcRequester) {
      console.warn("No NwcRequester available.");
      return;
    }
    const user = await nwcRequester.lookupUser({ receiver: { lud16: uma } });
    setUser(user);
  };

  return (
    <CenteredDiv>
      <div>
        <input value={uma} onChange={(e) => setUma(e.target.value)} />
        <button onClick={lookupUser}>Lookup User</button>
      </div>
      {user && <pre>{JSON.stringify(user, null, 2)}</pre>}
    </CenteredDiv>
  );
};

const CenteredDiv = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;

export default LookupUser;
