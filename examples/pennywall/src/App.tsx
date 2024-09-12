import styled from "@emotion/styled";
import { UmaConnectButton, useOAuth } from "@uma-sdk/uma-auth-client";
import React, { useEffect, useRef, useState } from "react";
import { usePayToAddress } from "./components/usePayToAddress";
import { Header } from "./Header";

function App() {
  const requiredCommands = [
    "pay_invoice",
    "make_invoice",
    "pay_to_address",
    "get_balance",
  ];
  const optionalCommands: string[] = [];
  const { nwcConnectionUri } = useOAuth();

  const [shownScreens, setShownScreens] = useState(0.75);
  const [isUmaConnected, setIsUmaConnected] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const blurOverlayRef = useRef<HTMLDivElement>(null);
  const [isLoadingReveal, setIsLoadingReveal] = useState(false);

  const { payToAddress } = usePayToAddress();

  useEffect(() => {
    // Check UMA connection status
    const umaConnected = localStorage.getItem("umaConnected") === "true";
    setIsUmaConnected(umaConnected);

    const checkOverlayHeight = () => {
      if (overlayRef.current) {
        const topOffset = Math.round(
          window.innerHeight * 0.01 * parseFloat(overlayRef.current.style.top),
        );
        const newHeight = document.documentElement.scrollHeight - topOffset;
        overlayRef.current.style.height = `${newHeight}px`;
      }
    };

    // Set up interval to check overlay height
    const intervalId = setInterval(checkOverlayHeight, 1000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const updateNumShownViewports = (numViewports: number) => {
    if (overlayRef.current) {
      overlayRef.current.style.top = `${100 * numViewports}vh`;
    }
  };

  const handleConnect = () => {
    localStorage.setItem("umaConnected", "true");
    setIsUmaConnected(true);
  };
  const handleReveal = async () => {
    setIsLoadingReveal(true);
    try {
      const response = await payToAddress();
      if (response) {
        setShownScreens((prev) => prev + 1);
        updateNumShownViewports(shownScreens + 1);
      } else {
        alert("Payment Failed");
      }
    } catch (error) {
      console.error("Error during payment:", error);
      alert("Payment Failed");
    }
    setIsLoadingReveal(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (blurOverlayRef.current) {
      const rect = blurOverlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      blurOverlayRef.current.style.maskImage = `
        radial-gradient(
          circle at ${x}px ${y}px,
          transparent 0%,
          black 4%
        ),
        linear-gradient(to bottom, transparent 0%, black 5%)
      `;
    }
  };

  return (
    <Main>
      <div class="content">
        <Header />
        <div class="container">
          <div class="article-header">
            <h4 style={{ "margin-bottom": "0px" }}>Breaking News</h4>
            <h1 style={{ "margin-top": "0px" }}>
              Espresso Machine Culprit
              <br />
              Strikes Again at Lightspark HQ
            </h1>
            <img src="./assets/article-1-hero.png" />
            <div class="article-info">
              <div class="article-details">
                <div class="author-info">
                  By First Last Published September 12, 2024
                </div>
                <div class="article-share">
                  <div>
                    <img src="./assets/icon-gift.svg" />
                  </div>
                  <div>
                    <img src="./assets/icon-share.svg" />
                  </div>
                  <div>
                    <img src="./assets/icon-save.svg" />
                  </div>
                </div>
              </div>
              <hr />
            </div>
          </div>

          <div class="article-intro">
            <h3>
              <b>LOS ANGELES -</b> In a shocking development that has rocked the
              cryptocurrency world, the Lightspark office is facing an
              unprecedented crisis: repeated misuse of their high-end espresso
              machine. The incident has been classified as a "coffee caper" by
              local authorities, who are baffled by the culprit's brazen
              disregard for office etiquette and proper barista techniques.
              <br />
              <br />
              <br />
            </h3>
          </div>

          <div class="article-body">
            <h2>The Caper</h2>
            <p>
              According to eyewitness reports, the unidentified culprit, dubbed
              "The Caffeine Culprit," has been leaving a trail of caffeinated
              chaos in their wake:
              <br />
              <br />
              1. Failure to remove and clean the portafilter after use
              <br />
              2. Neglecting to purge and clean the milk frothing wand
              <br />
              3. Abandoning the machine in pre-brew mode, causing potential
              damage to the boiler
              <br />
              <br />
              "We're dealing with a real coffee conundrum here," said Detective
              Joe Brewster of the Culver City Police Department's newly formed
              Coffee Crimes Unit. "This level of disrespect for both machinery
              and coworkers is unprecedented in my 20 years on the force."
              <br />
              <br />
            </p>

            <div>
              <img src="./assets/article-1-hero.png" />
              <span class="caption">Photo Credits to go here</span>
            </div>

            <h2>The Warning</h2>
            <p>
              Lightspark management has issued a stern warning to all employees.
              CEO David Marcus stated in an all-hands meeting: "We have earned
              one strike for misusing the new fancy espresso machine. Two more
              strikes, and people will start getting banished to the old
              espresso machine in our all-hands kitchen!"
              <br />
              <br />
            </p>

            <h2>The Investigation</h2>
            <p>
              Lead investigator on the case, Detective Culver, has been
              analyzing coffee grounds left at the scene for DNA evidence.
              "We're dealing with a highly caffeinated individual here," Culver
              theorized. "The erratic behavior suggests they might be mixing
              espresso with energy drinks. It's a dangerous combination."
              <br />
              <br />
              Surveillance footage has been inconclusive, as the culprit appears
              to strike during the post-lunch slump when most employees are in a
              food coma.
              <br />
              <br />
            </p>

            <h2>Public Outcry</h2>
            <p>
              The incident has sparked a mix of outrage and amusement in the
              tech community. Rival companies have taken to social media to
              express their solidarity. Elon Musk tweeted: "At Tesla, we take
              our coffee very seriously. Lightspark, if you need help, we can
              send over our Caffeine SWAT team."
              <br />
              <br />
            </p>

            <h2>Prevention Measures</h2>
            <p>
              In response to the crisis, Lightspark has implemented several
              preventative measures:
              <br />
              <br />
              1. Mandatory espresso machine etiquette classes, led by blockchain
              expert and surprise barista enthusiast, Christian Catalini
              <br />
              2. Installation of a high-tech "Blockchain of Brew" system to
              track espresso machine usage
              <br />
              3. A 24/7 Espresso Hotline for reporting suspicious coffee-related
              activities
              <br />
              <br />
              "Remember," Marcus added, "if you don't know what you're doing,
              there's a fancy fully automated Nespresso machine right next to
              it. And with that one, you can do whatever you want to it. I won't
              care as much." He then whispered under his breath, "Because it's
              not real coffee anyway."
              <br />
              <br />
              As the investigation continues, tension remains high at Lightspark
              HQ. Employees have taken to eyeing each other suspiciously over
              their mugs, and some have even resorted to bringing their own
              French presses to work. The cryptocurrency world watches with
              bated breath as this coffee caper unfolds. Will the Caffeine
              Culprit be brought to justice, or will Lightspark be forced to
              switch to instant coffee? Only time will tell.
              <br />
              <br />
              Stay tuned for updates on this brewing situation.
              <br />
              <br />
              <span style={{ "font-size": "10px", "font-style": "italic" }}>
                Last Updated September 12, 2024
              </span>
            </p>
          </div>

          <div class="article-footer">
            <div>
              <img src="./assets/article-2-hero.png" />
              <span style={{ "font-family": "serif", "font-weight": "600" }}>
                Local Developer Achieves Enlightenment After Staring at Bitcoin
                Blockchain for 48 Hours Straight
                <br />
              </span>
              <span
                style={{
                  "font-size": "12px",
                  "letter-spacing": "1px",
                  color: "#aaa",
                }}
              >
                SCIENCE
              </span>
            </div>

            <div>
              <img src="./assets/article-3-hero.png" />
              <span style={{ "font-family": "serif", "font-weight": "600" }}>
                Tech World's It-Girl Stella Caught Lounging in Malibu!
                <br />
              </span>
              <span
                style={{
                  "font-size": "12px",
                  "letter-spacing": "1px",
                  color: "#aaa",
                }}
              >
                LIFESTYLE
              </span>
            </div>

            <div>
              <img src="./assets/article-3-hero.png" />
              <span style={{ "font-family": "serif", "font-weight": "600" }}>
                Startup Faces Meltdown: Lightspark's AC Goes Dark
                <br />
              </span>
              <span
                style={{
                  "font-size": "12px",
                  "letter-spacing": "1px",
                  color: "#aaa",
                }}
              >
                BUSINESS
              </span>
            </div>

            <div>
              <img src="./assets/article-3-hero.png" />
              <span style={{ "font-family": "serif", "font-weight": "600" }}>
                Office Tips from a Dog's Perspective: How to Make Your Workday
                More Fun
                <br />
              </span>
              <span
                style={{
                  "font-size": "12px",
                  "letter-spacing": "1px",
                  color: "#aaa",
                }}
              >
                PETS
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div
          ref={overlayRef}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${100 * shownScreens}vh`,
            height: "100vh",
            zIndex: 1000,
            transition: "all 0.75s ease",
          }}
          onMouseMove={handleMouseMove}
        >
          <div
            ref={blurOverlayRef}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 1000,
              backdropFilter: "blur(50px)",
              backgroundColor: "#eb00ff66",
              WebkitBackdropFilter: "blur(50px)",
              maskImage: "linear-gradient(to bottom, transparent 0%, black 5%)",
              maskComposite: "intersect",
              transition: "all 0.75s ease",
            }}
          />
          <ButtonContainer>
            {nwcConnectionUri != null ? (
              <RevealButton onClick={handleReveal} loading={isLoadingReveal}>
                Reveal
              </RevealButton>
            ) : (
              <UmaConnectButton
                app-identity-pubkey={
                  "npub1scmpzl2ehnrtnhu289d9rfrwprau9z6ka0pmuhz6czj2ae5rpuhs2l4j9d"
                }
                nostr-relay={"wss://nos.lol"}
                redirect-uri={"http://localhost:3001"}
                required-commands={requiredCommands}
                optional-commands={optionalCommands}
                budget-amount={"10"}
                budget-currency={"USD"}
                budget-period={"weekly"}
              />
            )}
          </ButtonContainer>
        </div>
      </div>
    </Main>
  );
}

const Main = styled.main`
  position: relative;
  height: 100vh;
`;

const ButtonContainer = styled.div`
  position: fixed;
  bottom: 20px;
  left: 0;
  right: 0;
  margin: 0 auto;
  padding: 10px;
  display: flex;
  z-index: 20000;
  justify-content: center;
  width: fit-content;
`;

const RevealButton = styled.button<{ loading: boolean }>`
  padding: 20px 40px;
  font-size: 20px;
  border-radius: 10px;
  cursor: pointer;

  background-color: ${({ loading }) => (loading ? "#ccc" : "")};
  ${({ loading }) =>
    loading ? "pointer-events: none; cursor: not-allowed; " : ""}
`;

export default App;
