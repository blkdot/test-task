import logo from './logo.svg';
import './App.css';
import Web3 from "web3";
import ABI from "./abi.json";
import { BigNumber } from "bignumber.js";
import { ChainId, Token, WETH, Fetcher, Route } from "@uniswap/sdk";
import { useEffect, useState, useCallback } from 'react';

const FARMING_CONTRACT_ADDRESS = "0xa5f8c5dbd5f286960b9d90548680ae5ebff07652"
const LP_TOKEN_ADDRESS = "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0"

const web3 = new Web3(new Web3.providers.HttpProvider('https://bsc-dataseed.binance.org/'));

function App() {

  const [tokenPrice, setTokenPrice] = useState(0);
  const [apy, setAPY] = useState(0);

  const getTokenPriceInBNB = useCallback(async () => {
    try {
      const response = await fetch("https://api.pancakeswap.info/api/v2/tokens");
      const priceData = await response.json();
      return priceData.data["0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"].price_BNB;
    } catch (e) {
      console.log(e);
      return 0;
    }
  });

  const getLpTokenReserves = useCallback(async () => {
    try {
      const LpTokenContract = new web3.eth.Contract(
        ABI,
        LP_TOKEN_ADDRESS
      );
      const totalReserves = await LpTokenContract.methods.getReserves().call();
      // For BNB/Cake Pool totalReserves[0] = BNB Reserve and totalReserves[1] = Cake Reserve
      return [totalReserves[0], totalReserves[1]];
    } catch (e) {
      console.log(e);
      return [0,0];
    }
  });

  const getLpTokenTotalSupply = useCallback(async () => {
    try {
      const LpTokenContract = new web3.eth.Contract(
        ABI,
        LP_TOKEN_ADDRESS
      );
      const totalSupply = await LpTokenContract.methods.totalSupply().call();
      return totalSupply;
    } catch (e) {
      console.log(e);
      return 0;
    }
  });

  const calculateLpTokenPrice = useCallback(async () => {
    let rewardTokenPrice = 0;
    // Reward Token price in BNB
    rewardTokenPrice = await getTokenPriceInBNB();
  
    // 1 * rewardTokenPrice because 1 is the price of ETH or BNB in respective mainnet
    // This is square root of (p0 * p1) with reference to the image above
    const tokenPriceCumulative = new BigNumber(1 * rewardTokenPrice).sqrt();
  
    // For BNB / Cake pair totalReserve[0] = BNB in the contract and totalReserve[1] = Cake in the contract
    const totalReserve = await getLpTokenReserves();
  
    // This is square root of (r0 * r1) with reference to the image above
    const tokenReserveCumulative = new BigNumber(totalReserve[0])
      .times(totalReserve[1])
      .sqrt();
  
    // Total Supply of LP Tokens in the Market
    const totalSupply = await getLpTokenTotalSupply();
  
    // Calculate LP Token Price in accordance to the image above
    const lpTokenPrice = tokenReserveCumulative
      .times(tokenPriceCumulative)
      .times(2)
      .div(totalSupply);
  
    // If lpTokenPrice is a valid number return lpTokenPrice or return 0
    return lpTokenPrice.isNaN() || !lpTokenPrice.isFinite()
      ? 0
      : lpTokenPrice.toNumber();
  });

  const calculateAPY = useCallback(async () => {
    try {
      //BLOCKS_PER_DAY varies acccording to network all values are approx and they keep changing
      //BLOCKS_PER_DAY = 21600 for Kovan Testnet
      //BLOCKS_PER_DAY = 28800 for BSC Testnet
      //BLOCKS_PER_DAY = 6400 for Ethereum Mainnet
      //I am using the value for Ethereum mainnet
      const BLOCKS_PER_YEAR = 28800 * 365;
  
      let rewardTokenPrice = 0;
      // Reward Token price
      rewardTokenPrice = await getTokenPriceInBNB();
  
      // REWARD_PER_BLOCK = Number of tokens your farming contract gives out per block
      const REWARD_PER_BLOCK = 40000000000000000000;
      const totalRewardPricePerYear = new BigNumber(rewardTokenPrice)
        .times(REWARD_PER_BLOCK)
        .times(BLOCKS_PER_YEAR);
      
      console.log('totalRewardPricePerYear', totalRewardPricePerYear);

      // Get Total LP Tokens Deposited in Farming Contract
      const LpTokenContract = new web3.eth.Contract(
        ABI,
        LP_TOKEN_ADDRESS
      );
  
      const totalLpDepositedInFarmingContract = await LpTokenContract.methods
        .balanceOf(FARMING_CONTRACT_ADDRESS)
        .call();
        
      console.log('totalStaked', totalLpDepositedInFarmingContract);
      // Calculate LP Token Price
      const lpTokenPrice = await calculateLpTokenPrice();
      
      console.log('lpTokenPrice', lpTokenPrice);

      // Calculate Total Price Of LP Tokens in Contract
      const totalPriceOfLpTokensInFarmingContract = new BigNumber(
        lpTokenPrice
      ).times(totalLpDepositedInFarmingContract);
  
      // Calculate APY
      const apy = totalRewardPricePerYear
        .div(totalPriceOfLpTokensInFarmingContract)
        .times(100);
  
      // Return apy if apy is a valid number or return 0
      return apy.isNaN() || !apy.isFinite() ? 0 : apy.toNumber();
  
    } catch (e) {
      console.log(e);
      return 0;
    }
  });

  useEffect(() => {
    // getTokenPriceInBNB().then((res) => {
    //   console.log(res);
    //   setTokenPrice(res);
    // }).catch((err) => {
    //   console.log(err);
    // })
    
    // getLpTokenReserves().then((res) => {
    //   console.log('getLPTokenReserves', res);
    // }).catch((err) => {
    //   console.log(err);
    // })

    // getLpTokenTotalSupply().then((res) => {
    //   console.log('LPTokenTotalSupply', res);
    // }).catch((err) => {
    //   console.log(err);
    // })

    // calculateLpTokenPrice().then((res) => {
    //   console.log('LpTokePrice', res);
    // }).catch((err) => {
    //   console.log(err);
    // });
    // getDogecoinPriceInETH().then((res) => {
    //   console.log('dogecoinprice', Number(res));
    // }).catch((err) => {console.log(err)});

    calculateAPY().then((res) => {
      console.log('APY', res);
      setAPY(res);
    }).catch((err) => {
      console.log(err);
    })

  }, [getTokenPriceInBNB]);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          APY: {apy}
        </a>
      </header>
    </div>
  );
}

export default App;
