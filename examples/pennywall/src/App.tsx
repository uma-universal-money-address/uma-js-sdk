import styled from "@emotion/styled";
import { UmaConnectButton, useOAuth } from "@uma-sdk/uma-auth-client";
import { usePayToAddress } from "./components/usePayToAddress";
import React, { useEffect, useState, useRef } from 'react';

function App() {
  const requiredCommands = ["pay_invoice","make_invoice","pay_to_address","get_balance"];
  const optionalCommands: string[] = [];
  const { nwcConnectionUri } = useOAuth();

  const [shownScreens, setShownScreens] = useState(0.75);
  const [isUmaConnected, setIsUmaConnected] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const blurOverlayRef = useRef<HTMLDivElement>(null);

  const { payToAddress } = usePayToAddress();


  useEffect(() => {
    // Check UMA connection status
    const umaConnected = localStorage.getItem('umaConnected') === 'true';
    setIsUmaConnected(umaConnected);


    const checkOverlayHeight = () => {
      if (overlayRef.current) {
        const topOffset = Math.round(window.innerHeight * 0.01 * parseFloat(overlayRef.current.style.top));
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
    localStorage.setItem('umaConnected', 'true');
    setIsUmaConnected(true);
  };
  const handleReveal = async () => {
    try {
      const response = await payToAddress();
      if (response) {
        setShownScreens(prev => prev + 1);
        updateNumShownViewports(shownScreens + 1);
      } else {
        alert("Payment Failed");
      }
    } catch (error) {
      console.error("Error during payment:", error);
      alert("Payment Failed");
    }
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
        <header>
            <h1>The New York Times</h1>
        </header>
        <article>
            <h1>Comprehensive Report: The Future of Renewable Energy</h1>
            <section>
                <h2>Introduction</h2>
                <p>In a groundbreaking development, researchers at the University of Innovation have made significant breakthroughs in the field of renewable energy. This new technology promises to drastically reduce the cost of producing energy from wind turbines, potentially revolutionizing the industry.</p>
                <img src="https://images.unsplash.com/photo-1466611653911-95081537e5b7" alt="Wind Turbines"/>
                <p class="caption">Figure 1: Wind turbines in action.</p>
            </section>
            <section>
                <h2>Wind Energy Advancements</h2>
                <p>The implications of this research are far-reaching, with potential benefits for not only the environment but also the global economy. Experts suggest that this could lead to widespread adoption of renewable energy sources, significantly reducing reliance on fossil fuels.</p>
                <img src="https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5" alt="Research Lab"/>
                <p class="caption">Figure 2: Researchers working in the lab.</p>
            </section>
            <section>
                <h2>Solar Energy Developments</h2>
                <p>Alongside wind technology, advancements in solar energy have also been reported. A new type of photovoltaic cell has been introduced, which increases the efficiency of converting sunlight into electricity by over 30%. This improvement could make solar energy more viable and accessible than ever before.</p>
                <img src="https://images.unsplash.com/photo-1509391366360-2e959784a276" alt="Solar Panels"/>
                <p class="caption">Figure 3: Solar panels capturing sunlight.</p>
            </section>
            <section>
                <h2>Global Impact and Future Prospects</h2>
                <p>As the world continues to grapple with the challenges of climate change, these innovations offer hope for a sustainable future. Governments and industries worldwide are urged to invest in these technologies, fostering further research and development in the field.</p>
                <img src="https://images.unsplash.com/photo-1532601224476-15c79f2f7a51" alt="Global Map Energy"/>
                <p class="caption">Figure 4: Global renewable energy usage map.</p>
            </section>
            <section>
                <h2>Conclusion</h2>
                <p>The shift towards renewable energy is not just about adopting new technologies but also about transforming societal attitudes towards energy consumption. The coming years will likely see significant changes in how energy is produced, consumed, and perceived across the globe.</p>
            </section>
        </article>
        </div>

        <div>
      {/* Your existing app content */}
      <div
        ref={overlayRef}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${100 * shownScreens}vh`,
          height: '100vh',
          zIndex: 1000,
          transition: 'all 0.75s ease',
        }}
        onMouseMove={handleMouseMove}>
          <div
            ref={blurOverlayRef}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 1000,
              backdropFilter: 'blur(50px)',
              WebkitBackdropFilter: 'blur(50px)',
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%)',
              maskComposite: 'intersect',
              transition: 'all 0.75s ease',
            }}
          />
            <ButtonContainer>

          {nwcConnectionUri != null ? (
            <button onClick={(e) => { handleReveal(); }} style={{ padding: '20px 40px', fontSize: '20px', borderRadius: '10px' }}>Reveal</button>
          ) : (
            <UmaConnectButton
              app-identity-pubkey={"npub1scmpzl2ehnrtnhu289d9rfrwprau9z6ka0pmuhz6czj2ae5rpuhs2l4j9d"}
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
      <ButtonContainer>

      </ButtonContainer>
    </Main>
  );
}

const Main = styled.main`
  position: relative;
  height: 100vh;
  width: 100vw;

  .content {
            font-family: "Times New Roman", Times, serif;
            margin: 0;
            padding: 0;
            color: #333;
            background: #f9f9f9;
        }
        header {
            background: #fff;
            padding: 20px;
            border-bottom: 2px solid #bbb;
            text-align: center;
        }
        article {
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            background: #fff;
            border: 1px solid #ddd;
        }
        h1, h2 {
            font-size: 24px;
            color: #444;
        }
        p {
            line-height: 1.6;
            font-size: 18px;
            text-align: justify;
        }
        img {
            width: 100%;
            height: auto;
        }
        .caption {
            font-size: 14px;
            color: #666;
            text-align: center;
        }
        section {
            margin-top: 20px;
        }
    </style>
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



export default App;



