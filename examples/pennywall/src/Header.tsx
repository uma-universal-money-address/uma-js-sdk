import styled from "@emotion/styled";
import { useEffect, useState } from "react";

export const Header = () => {
  const [btcPrice, setBtcPrice] = useState("");
  const [btcChange, setBtcChange] = useState("");
  const [btcChangeColor, setBtcChangeColor] = useState("");

  function fetchBitcoinData() {
    const urlPrice =
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";
    const urlHistorical =
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1";

    Promise.all([
      fetch(urlPrice).then((response) => response.json()),
      fetch(urlHistorical).then((response) => response.json()),
    ])
      .then(([priceData, historicalData]) => {
        const currentPrice = priceData.bitcoin.usd;
        const pastPrice = historicalData.prices[0][1]; // Price from 24 hours ago

        const percentageChange = (
          ((currentPrice - pastPrice) / pastPrice) *
          100
        ).toFixed(2);

        setBtcPrice("$" + currentPrice.toFixed(2));
        setBtcChange(percentageChange + "%");

        if (percentageChange >= 0) {
          setBtcChangeColor("green");
        }
        if (percentageChange <= 0) {
          setBtcChangeColor("red");
        } else {
          setBtcChangeColor("gray");
        }
      })
      .catch(() => {
        setBtcPrice("Error fetching price");
        setBtcChange("");
      });
  }

  useEffect(() => {
    fetchBitcoinData();
    setInterval(fetchBitcoinData, 60000); // Refresh every 60 seconds

    document.addEventListener("scroll", function () {
      // const img = document.querySelector('nav img');
      // if (window.scrollY > 112) {
      //     img.style.display = 'block'; // Show the image
      // } else {
      //     img.style.display = 'none'; // Hide the image
      // }
    });
  }, []);

  return (
    <header>
      <div>
        <div class="btc">
          <p>
            BTC <BtcChange color={btcChangeColor}>{btcChange}</BtcChange>
          </p>
        </div>
        <img src="./assets/LST.png" />
        <br />
        <br />
        <nav>
          <img src="./assets/LS.png" />
          <div>
            <a>US</a>
            <a>World</a>
            <a>Business</a>
            <a>Arts</a>
            <a>Lifestyle</a>
            <a>Opinion</a>
            <span>|</span>
            <a>Audio</a>
            <a>Games</a>
            <a>Cooking</a>
            <a>Wirecutter</a>
            <a>The Athletic</a>
          </div>
        </nav>
      </div>
    </header>
  );
};

const BtcChange = styled.span<{ color: string }>`
  color: ${({ color }) => color};
`;
