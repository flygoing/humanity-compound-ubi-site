import React, { Component } from 'react';
import BigNumber from 'bignumber.js';

import UniversalBasicIncome from './contracts/UniversalBasicIncome.json';
import CompoundPool from './contracts/CompoundPool.json';
import IHumanityRegistry from './contracts/IHumanityRegistry.json';
import DAI from './contracts/DAI.json';
import CDAI from './contracts/CDAI.json';
import getWeb3 from './utils/getWeb3';

import humanityIcon from './images/humanityIcon.svg'
import daiIcon from './images/daiIcon.svg';
import 'bootstrap/dist/css/bootstrap.min.css';

import './App.css';

class App extends Component {
  state = { allowance: BigNumber(0), usersPoolBalance: BigNumber(0), usersDaiBalance: BigNumber(0), inputValue: BigNumber(0), claimableUbiBalance: 0, web3: null, accounts: null, ubi: null };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();
      console.log(web3.transactionConfirmationBlocks, web3.transactionPollingTimeout,web3.version)
      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const ubi = new web3.eth.Contract(
        UniversalBasicIncome.abi,
        UniversalBasicIncome.networks[networkId] && UniversalBasicIncome.networks[networkId].address,
      );
      const pool = new web3.eth.Contract(
        CompoundPool.abi,
        CompoundPool.networks[networkId] && CompoundPool.networks[networkId].address
      )
      const registry = new web3.eth.Contract(
        IHumanityRegistry.abi,
        IHumanityRegistry.networks[networkId] && IHumanityRegistry.networks[networkId].address
      )
      
      const dai = new web3.eth.Contract(
        DAI.abi,
        DAI.networks[networkId] && DAI.networks[networkId].address
      )
      
      const cDai = new web3.eth.Contract(
        CDAI.abi,
        CDAI.networks[networkId] && CDAI.networks[networkId].address

      )
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, ubi, pool, registry, dai, cDai}, this.repeatedUpdate);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };
  componentWillUnmount() {
    this.kill = true;
  }
  

  repeatedUpdate = async () => {
    this.updateBalances()
    if(!this.kill){
      setTimeout(this.repeatedUpdate, 1000)
    }
  }

  updateBalances = async () => {
    const { web3, ubi, pool, registry, dai, cDai} = this.state;
    // Use web3 to get the user's accounts.
    const accounts = await web3.eth.getAccounts();

    // Get the value from the contract to prove it worked.
    const claimableUbiBalance = (Number.parseFloat((await ubi.methods.claimableBalance(accounts[0]).call()).toString()) / 10 ** 18).toFixed(6)

    const usersPoolBalance = BigNumber((await pool.methods.balanceOf(accounts[0]).call()).toString())

    const usersDaiBalance = BigNumber((await dai.methods.balanceOf(accounts[0]).call()).toString())

    const totalPoolBalance = (BigNumber((await cDai.methods.balanceOfUnderlying(pool.options.address).call()).toString()) / 10 ** 18).toFixed(6)
    const excessPoolBalance = (BigNumber((await pool.methods.excessDepositTokens().call()).toString()) / 10 ** 18).toFixed(6)
    const poolDepositBalance = (BigNumber((await pool.methods.totalSupply().call()).toString()) / 10 ** 18).toFixed(6)
    const isHuman = await registry.methods.isHuman(accounts[0]).call()

    const allowance = BigNumber((await dai.methods.allowance(accounts[0], pool.options.address).call()).toString())
    // Update state with the result.
    this.setState({ allowance, claimableUbiBalance, usersPoolBalance, usersDaiBalance, totalPoolBalance, excessPoolBalance, poolDepositBalance, isHuman});
  };

  updateValue = async (e) => {
    const value = BigNumber(e.target.value)
    this.setState({inputValue: value.toString() === "NaN"? BigNumber(0) : value.multipliedBy(BigNumber(10).pow(BigNumber(18)))})
  }

  updateValueToWalletBalance = async (e) => {
    this.setState({inputValue: this.state.usersDaiBalance})
  }

  updateValueToPoolBalance = async (e) => {
    this.setState({inputValue: this.state.usersPoolBalance})
  }
  getGasPrice = async () => {
    const {web3} = this.state
    const recommended = await web3.eth.getGasPrice()
    return BigNumber(recommended).multipliedBy(BigNumber("1.5")).toString()
  }

  claim = async () => {
    const {web3, ubi} = this.state
    await this.setState({isClaiming: true})
    // await this.updateBalances()
    const account = (await web3.eth.getAccounts())[0]
    try{
      console.log("Starting transaction promises")
      await ubi.methods.claim().send({from: account, gasPrice: await this.getGasPrice()})
    } catch (e){console.log("CLAIM ERROR"); console.log(e)}
    console.log("FINISHED CLAIM TRANSACTIONS")
    await this.setState({isClaiming: false})
    await this.updateBalances()
  }

  withdraw = async () => {
    const {web3, pool, inputValue} = this.state
    await this.setState({isWithdrawing: true})
    // await this.updateBalances()
    const account = (await web3.eth.getAccounts())[0]
    try {
      console.log("Starting transaction promises")
      await pool.methods.withdraw(inputValue.toString()).send({from: account, gasPrice: await this.getGasPrice()})
    } catch (e){console.log("WITHDRAW ERROR"); console.log(e)}
    console.log("FINISHED WITHDRAW TRANSACTIONS")
    await this.updateBalances()
    await this.setState({isWithdrawing: false})
  }

  deposit = async () => {
    const {web3, pool, dai, inputValue, allowance} = this.state
    await this.setState({isDepositing: true})
    // await this.updateBalances()
    const account = (await web3.eth.getAccounts())[0]
    try {
      let promises = []
      if(allowance.lt(inputValue)){
        promises.push(dai.methods.approve(pool.options.address, BigNumber("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").toFixed()).send({from: account, gasPrice: await this.getGasPrice()}))
      }
      promises.push(pool.methods.deposit(inputValue.toString()).send({from: account, gasPrice: await this.getGasPrice()}))
      console.log("Starting transaction promises")
      await Promise.all(promises)
    } catch (e){console.log("DEPOSIT ERROR"); console.log(e)}
    console.log("FINISHED DEPOSIT TRANSACTIONS")
    await this.updateBalances()
    await this.setState({isDepositing: false})
  }

  donate = async () => {
    const {web3, pool, dai, allowance, inputValue} = this.state
    await this.setState({isDonating: true})
    // await this.updateBalances()
    const account = (await web3.eth.getAccounts())[0]
    try {
      let promises = []
      if(allowance.lt(inputValue)){
        promises.push(dai.methods.approve(pool.options.address, BigNumber("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").toFixed()).send({from: account, gasPrice: await this.getGasPrice()}))
      }
      promises.push(pool.methods.donate(inputValue.toString()).send({from: account, gasPrice: await this.getGasPrice()}))
      console.log("Starting transaction promises")
      await Promise.all(promises)
    } catch (e){console.log("DONATE ERROR"); console.log(e)}
    console.log("FINISHED WITHDRAW TRANSACTIONS")
    await this.updateBalances()
    await this.setState({isDonating: false})
  }

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>
    }
    return (
      <div className='App h-100'>
        <div className = 'container-fluid container-large d-flex h-100 flex-column'>
          <div className='row' style={{ 'borderBottom': '1px solid rgb(235, 239, 245)'}}>
            <div className='col-6 p-3 d-flex justify-content-start'>
              <img src={humanityIcon} alt='' style={{ width: '25px', height: '25px'}}/>
              <p id='humanity-title'>Compound Interest Funded UBI</p>
            </div>
            <div className='col-6 p-3 d-flex justify-content-end'>
            <a id='learn-apply' href='http://humanitydao.org/'>
              Built for HumanityDAO | Learn & Apply
            </a>

            </div>
          </div>
          <div className='row flex-fill d-flex '>
            <div className='col-12 my-auto'>
              <div className='row'>
                <div className='col-4' style={{ 'border': '1px solid rgb(235, 239, 245)', 'padding': '10px'}}>
                    <p style={{color: 'rgb(112, 112, 112)'}}>Available to claim</p>
                    <p style={{'fontSize': '70px', 'marginTop': '50px', 'marginBottom': '50px'}}>
                      <img src={daiIcon} alt='' style={{ width: '80px', height: '70px'}}/>
                      {this.state.claimableUbiBalance.toString().substring(0,8)}
                    </p>
                    <button style={{fontSize: '25px'}} onClick={this.claim} className="sc-htpNat lnMvqK" disabled={!this.state.isHuman || this.state.isClaiming}>
                      {this.state.isHuman ? this.state.isClaiming?"CLAIMING":"CLAIM" : "NOT HUMAN"}
                    </button>
                </div>
                <div className='col-4' style={{ 'border': '1px solid rgb(235, 239, 245)', 'padding': '10px'}}>
                  <div className='row' style={{color: 'rgb(112, 112, 112)', marginBottom: '0px', paddingBottom: '0px'}}>
                    <div className="col" style={{ marginBottom: '0px', paddingBottom: '0px'}}>
                      <p style={{ 'margin': '0px', paddingBottom: '0px'}}>Overall pool info</p>
                    </div>
                  </div>
                  <div className='row' style={{padding:'20px'}}>
                    <div className='col-12' >
                      <div className='row' style={{'fontSize': '30px'}}>
                        <div className='col-6'>
                          <div className='row'>
                            <img src={daiIcon} alt='' style={{ width: '25px', height: '25px', marginTop: '10px'}}/> <p>Claimable</p>
                          </div>
                          <div className='row' style={{marginTop:'40px'}}>
                            <img src={daiIcon} alt='' style={{ width: '25px', height: '25px', marginTop: '10px'}}/> <p>Deposits</p> 
                          </div>
                          <div className='row' style={{marginTop:'40px'}}>
                            <img src={daiIcon} alt='' style={{ width: '25px', height: '25px', marginTop: '10px'}}/> <p>Total</p> 
                          </div>
                        </div>
                        <div className='col-6'>
                          <div className='row justify-content-end'>
                            <p>{this.state.excessPoolBalance}</p>
                          </div>
                          <div className='row justify-content-end' style={{marginTop:'40px'}}>
                            <p>{this.state.poolDepositBalance}</p> 
                          </div>
                          <div className='row justify-content-end' style={{marginTop:'40px'}}>
                            <p>{this.state.totalPoolBalance}</p> 
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className='col-4' style={{ 'border': '1px solid rgb(235, 239, 245)', 'padding': '10px'}}>
                      <div className='row' style={{color: 'rgb(112, 112, 112)', marginBottom: '0px', paddingBottom: '0px'}}>
                        <div className='col' style={{ marginBottom: '0px', paddingBottom: '0px'}}>
                          <p style={{ 'margin': '0px', paddingBottom: '0px'}}>Your contributions</p>
                        </div>
                      </div>
                      <div className='row' style={{marginTop:'15px'}}>
                        <div className='col-6 set-max' onClick={this.updateValueToWalletBalance}>
                          Wallet balance<br/>
                          <img src={daiIcon} alt='' style={{ width: '20px', height: '20px'}}/>
{(parseInt(this.state.usersDaiBalance) / 10 ** 18).toFixed(6)}
                        </div>
                        <div className='col-6 set-max' onClick={this.updateValueToPoolBalance}>
                          Pool balance<br/>
                          <img src={daiIcon} alt='' style={{ width: '20px', height: '20px'}}/>
{(parseInt(this.state.usersPoolBalance) / 10 ** 18).toFixed(6)}
                        </div>
                      </div>
                      <div className='row'>

                        <div className='col-12'>
                            <div className='row' style={{marginTop: '25px'}}>
                              <div className='col-12'>
                                <div className="form-group">
                                  <label htmlFor="amount">Amount</label>
                                  <input step="any" value={this.state.inputValue.div(BigNumber(10).pow(18)).toFixed()} type="number" className="form-control" id="amount"  onChange={this.updateValue}/>
                                </div>
                              </div>

                            </div>
                            <div className='row' style={{marginTop: '25px'}}>
                              <div className='col-4'>
                                <button style={{width: '100%', fontSize: '15px', padding: '2px'}} onClick={this.withdraw} className="sc-htpNat lnMvqK" disabled={this.state.isWithdrawing || this.state.isDepositing || this.state.isDonating || this.state.inputValue.toString() === "0" || this.state.usersPoolBalance.lt(this.state.inputValue)}>
                                  {this.state.isWithdrawing?"WITHDRAWING":"WITHDRAW" }
                                </button>

                              </div>
                              <div className='col-4'>
                                <button style={{width: '100%', fontSize: '15px', padding: '2px'}} onClick={this.deposit} className="sc-htpNat lnMvqK" disabled={this.state.isWithdrawing || this.state.isDepositing || this.state.isDonating || this.state.inputValue.toString() === "0" || this.state.usersDaiBalance.lt(this.state.inputValue)}>
                                  {this.state.isDepositing?"DEPOSITING":"DEPOSIT"}
                                </button>

                              </div>
                              <div className='col-4'>
                                <button style={{width: '100%', fontSize: '15px', padding: '2px'}} onClick={this.donate} className="sc-htpNat lnMvqK" disabled={this.state.isWithdrawing || this.state.isDepositing || this.state.isDonating || this.state.inputValue.toString() === "0" || this.state.usersDaiBalance.lt(this.state.inputValue)}>
                                  {this.state.isDonating?"DONATING":"DONATE"}
                                </button>

                              </div>
                            </div>
                        </div>
                      </div>
                      <div className='row'>
                      </div>
                    </div>
              </div>
            </div>
          </div>
          <div className='row flex-fill d-flex justify-content-start '>
            
          </div>
        </div>
      </div>
    );
  }
}

export default App;
