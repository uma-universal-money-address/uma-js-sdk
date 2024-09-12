import styled from "@emotion/styled";
import { UmaConnectButton, useOAuth } from "@uma-sdk/uma-auth-client";
import React, { useEffect, useRef, useState } from "react";
import { Toggle } from "./components/Toggle";
import { usePayToAddress } from "./components/usePayToAddress";
import { Header } from "./Header";
import { keyframes } from "@emotion/react";

function App() {
  const requiredCommands = [
    "pay_invoice",
    "make_invoice",
    "pay_to_address",
    "get_balance",
  ];
  const optionalCommands: string[] = [];
  const { nwcConnectionUri } = useOAuth();
  const [notifications, setNotifications] = useState<{ id: number; amount: number }[]>([]);
  const [totalCentsPaid, setTotalCentsPaid] = useState(0);

  const addNotification = (amount: number) => {
    const newNotification = { id: Date.now(), amount };
    setNotifications(prev => [...prev, newNotification]);
    setTotalCentsPaid(prev => prev + amount);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 2000);
  };  const [shownScreens, setShownScreens] = useState(0.75);
  const [isUmaConnected, setIsUmaConnected] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const blurOverlayRef = useRef<HTMLDivElement>(null);
  const [isLoadingReveal, setIsLoadingReveal] = useState(false);
  const [isTurboPayOn, setIsTurboPayOn] = useState(false);

  const { payToAddress } = usePayToAddress();

  useEffect(() => {
    // Check UMA connection status
    const umaConnected = localStorage.getItem("umaConnected") === "true";
    setIsUmaConnected(umaConnected);

    // CHecks the current overlay y coordinate value and changes the height of the overlay so it extends to the bottom of the document.
    const checkOverlayHeight = () => {
      if (overlayRef.current) {
        let percentOfViewportCovered =
          0.01 * parseFloat(overlayRef.current.style.top);
        let viewportHeightPx = window.innerHeight;
        const newOverlayTopYCoord = Math.round(
          viewportHeightPx * percentOfViewportCovered,
        );
        const newHeight =
          document.documentElement.scrollHeight - newOverlayTopYCoord;
        overlayRef.current.style.height = `${newHeight}px`;
      }
    };

    // Set up interval to check overlay height
    const intervalId = setInterval(checkOverlayHeight, 1000);

    // Clean up interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (isLoadingReveal || !isTurboPayOn) {
      return;
    }

    const checkScroll = () => {
      const numScreensScrolled = Math.ceil(
        (window.scrollY + window.innerHeight / 2) / window.innerHeight,
      );

      (async () => {
        if (numScreensScrolled > shownScreens) {
          setIsLoadingReveal(true);
          const numScreensToPay = numScreensScrolled - shownScreens;
          const paymentAmount = numScreensToPay * 10;

          // try {
          //   const response = await payToAddress(paymentAmount);
          //   if (response) {
          //     setShownScreens(numScreensScrolled);
          //     updateNumShownViewports(numScreensScrolled);
          //   } else {
          //     alert("Payment Failed");
          //   }
          // } catch (error) {
          //   console.error("Error during turbo payment:", error);
          //   alert("Turbo Payment Failed");
          // }
          setIsLoadingReveal(false);
        }
      })();
    };

    const intervalIdScroll = setInterval(checkScroll, 1000);
    return () => {
      clearInterval(intervalIdScroll);
    };
  }, [isLoadingReveal, isTurboPayOn, shownScreens]);

  const handleTurboPayOn = (on: boolean) => {
    if (!nwcConnectionUri) {
      return;
    }
    setIsTurboPayOn(on);
  };

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
      setShownScreens((prev) => prev + 1);
      updateNumShownViewports(shownScreens + 1);
      addNotification(1); // Add a notification for 1 cent
      const response = await payToAddress();
      if (response) {
      } else {
        console.log("Payment Failed");
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

  const getRandomLeftPosition = () => {
    return Math.floor(Math.random() * 81); // Random number between 0 and 40
  };

  return (
    <Main>
      <div className="content">
        <Header />
        <div className="container">
          <div className="article-header">
            <h4 style={{ marginBottom: "0px" }}>Breaking News</h4>
            <h1 style={{ marginTop: "0px" }}>
              Espresso Machine Culprit
              <br />
              Strikes Again at Lightspark HQ
            </h1>
            <img src="./assets/article-1-hero.png" />
            <div className="article-info">
              <div className="article-details">
                <div className="author-info">
                  By First Last Published September 12, 2024
                </div>
                <div className="article-share">
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

          <div className="article-intro">
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

          <div className="article-body">
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


            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ width: '48%' }}>
                <img src="./assets/investigator.png" style={{ width: '100%', height: 'auto', borderRadius: '9.6px' }} alt="Espresso machine at Lightspark HQ" />
                <span className="caption" style={{ display: 'block', marginTop: '6px', fontSize: '14.4px', color: '#666' }}>Detective Joe Brewster examining coffee grounds for clues. Photo: CCPD</span>
              </div>
              <div style={{ width: '48%' }}>
                <img src="./assets/wanted.png" style={{ width: '100%', height: 'auto', borderRadius: '9.6px' }} alt="Wanted poster for the Espresso Bandit" />
                <span className="caption" style={{ display: 'block', marginTop: '6px', fontSize: '14.4px', color: '#666' }}>Wanted poster for the "Espresso Bandit" circulated throughout Lightspark HQ. Photo: Lightspark Internal Security</span>
              </div>
            </div>

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
            <div style={{ marginBottom: '24px' }}>
              <img src="./assets/coffee-class.png" style={{ width: '100%', height: 'auto', borderRadius: '9.6px' }} alt="Mandatory espresso machine etiquette class" />
              <span className="caption" style={{ display: 'block', marginTop: '6px', fontSize: '14.4px', color: '#666' }}>Employees attending the mandatory espresso machine etiquette class. Photo: Lightspark HR Department</span>
            </div>
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
              <span style={{ fontSize: "10px", fontStyle: "italic" }}>
                Last Updated September 12, 2024
              </span>
            </p>
          </div>

          <div className="article-footer">
            <div>
              <img src="./assets/article-2-hero.png" />
              <span style={{ fontFamily: "serif", fontWeight: "600" }}>
                Local Developer Achieves Enlightenment After Staring at Bitcoin
                Blockchain for 48 Hours Straight
                <br />
              </span>
              <span
                style={{
                  fontSize: "12px",
                  letterSpacing: "1px",
                  color: "#aaa",
                }}
              >
                SCIENCE
              </span>
            </div>

            <div>
              <img src="./assets/article-3-hero.png" />
              <span style={{ fontFamily: "serif", fontWeight: "600" }}>
                Tech World's It-Girl Stella Caught Lounging in Malibu!
                <br />
              </span>
              <span
                style={{
                  fontSize: "12px",
                  letterSpacing: "1px",
                  color: "#aaa",
                }}
              >
                LIFESTYLE
              </span>
            </div>

            <div>
              <img src="./assets/ac.png" />
              <span style={{ fontFamily: "serif", fontWeight: "600" }}>
                Startup Faces Meltdown: Lightspark's AC Goes Dark
                <br />
              </span>
              <span
                style={{
                  fontSize: "12px",
                  letterSpacing: "1px",
                  color: "#aaa",
                }}
              >
                BUSINESS
              </span>
            </div>

            <div>
              <img src="./assets/office-tips.png" />
              <span style={{ fontFamily: "serif", fontWeight: "600" }}>
                Office Tips from a Dog's Perspective: How to Make Your Workday
                More Fun
                <br />
              </span>
              <span
                style={{
                  fontSize: "12px",
                  letterSpacing: "1px",
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
    {notifications.map(notification => (
      <UnlockedMessage key={notification.id} leftOffset={getRandomLeftPosition()}>
        <Points>+{notification.amount}¢</Points>
      </UnlockedMessage>
    ))}
          <TotalCounter>
            Total Paid: {totalCentsPaid}¢
          </TotalCounter>
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
      <TurboPay>
        Turbo Pay
        <Toggle id="turbo-pay" on={isTurboPayOn} onChange={handleTurboPayOn} />
      </TurboPay>
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
  fontsize: 20px;
  border-radius: 10px;
  cursor: pointer;

  background-color: ${({ loading }) => (loading ? "#ccc" : "")};
`;

const TurboPay = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 20000;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  fontweight: 700;
  padding: 10px;
`;

const riseAndRotate = keyframes`
  0% { transform: translateY(100px) rotate(-10deg) scale(0.8); opacity: 0; }
  20% { transform: translateY(80px) rotate(8deg) scale(1.1); opacity: 0.5; }
  40% { transform: translateY(60px) rotate(-6deg) scale(0.9); opacity: 0.8; }
  60% { transform: translateY(40px) rotate(4deg) scale(1.05); opacity: 1; }
  80% { transform: translateY(20px) rotate(-2deg) scale(0.95); opacity: 1; }
  90% { transform: translateY(0) rotate(0) scale(1); opacity: 1; }
  100% { transform: translateY(-30px) rotate(5deg) scale(0.9); opacity: 0; }
`;

const UnlockedMessage = styled.div<{ leftOffset: number }>`
  position: fixed;
  bottom: 200px;
  left: ${props => 40 + props.leftOffset}px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  font-family: 'Arial', sans-serif;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  z-index: 20001;
  animation: ${riseAndRotate} 2s ease-in-out forwards;
`;

const Points = styled.div`
  font-size: 48px;
  font-weight: bold;
  color: #ffcc00;
  margin-bottom: 5px;
`;

const RewardText = styled.div`
  font-size: 24px;
  text-transform: uppercase;
`;

const TotalCounter = styled.div`
  position: fixed;
  bottom: 50px;
  left: 50px;
  font-size: 24px;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  z-index: 20001;
`;

// ... rest of the file ...
export default App;
