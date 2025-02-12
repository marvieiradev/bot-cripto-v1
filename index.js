const axios = require("axios");
const crypto = require("crypto");

const SYMBOL = "BTCUSDT";
const QUANTITY = "0.001";
const PERIOD = 14;

const API_URL = "https://testnet.binance.vision"; //API_URL de teste.
//Essa é a API_URL de produção: "https://api.binance.com";
//A API_KEY e SECRET_KEY devem ser criadas em: https://testnet.binance.vision.
const API_KEY = "sua_api_key";
const SECRET_KEY = "sua_secret_key";

function averages(prices, period, startIndex) {
  let gains = 0,
    losses = 0;

  for (let i = 0; i < period && i + startIndex < prices.length; i++) {
    const diff = prices[i + startIndex] - prices[i + startIndex - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGains = gains / period;
  let avgLosses = losses / period;
  return { avgGains, avgLosses };
}

function RSI(prices, period) {
  let avgGains = 0,
    avgLosses = 0;

  for (let i = 1; i < prices.length; i++) {
    let newAverages = averages(prices, period, i);

    if (i === 1) {
      avgGains = newAverages.avgGains;
      avgLosses = newAverages.avgLosses;
      continue;
    }

    avgGains = (avgGains * (period - 1) + newAverages.avgGains) / period;
    avgLosses = (avgLosses * (period - 1) + newAverages.avgLosses) / period;
  }
  const rs = avgGains / avgLosses;
  return 100 - 100 / (1 + rs);
}

async function newOrder(symbol, quantity, side) {
  const order = { symbol, quantity, side };
  order.type = "MARKET";
  order.timestamp = Date.now();

  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(new URLSearchParams(order).toString())
    .digest("hex");

  order.signature = signature;

  try {
    const { data } = await axios.post(
      API_URL + "/api/v3/order",
      new URLSearchParams(order).toString(),
      { headers: { "X-MBX-APIKEY": API_KEY } }
    );
    console.log(data);
  } catch (error) {
    console.error(error.response.data);
  }
}

let isOpened = false;

async function start() {
  const { data } = await axios.get(
    API_URL + "/api/v3/klines?limit=100&interval=15m&symbol=" + SYMBOL
  );
  const candle = data[data.length - 1];
  const lastPrice = parseFloat(candle[4]);
  console.clear();
  console.log("Preço:" + lastPrice);

  const prices = data.map((k) => parseFloat(k[4]));
  const rsi = RSI(prices, PERIOD);
  console.log("RSI: " + rsi);
  console.log("Já comprei? " + (isOpened === true ? "Sim" : "Não") + "\n");

  if (rsi < 30 && isOpened === false) {
    console.log("Hora de comprar!");
    isOpened = true;
    newOrder(SYMBOL, QUANTITY, "BUY");
  } else if (rsi > 70 && isOpened === true) {
    console.log("Hora de vender!");
    newOrder(SYMBOL, QUANTITY, "SELL");
    isOpened = false;
  } else {
    console.log("Aguardar...");
  }
}

setInterval(start, 3000);

start();
