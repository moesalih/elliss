/* global BigInt */

import React from "react";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";

import { BigNumber, ethers } from 'ethers'
import Web3Modal from "web3modal"
import WalletConnectProvider from "@walletconnect/web3-provider";


import Elliss from './artifacts/contracts/Elliss.sol/Elliss.json'
import config from './config'

const providerOptions = {
	walletconnect: {
		package: WalletConnectProvider,
		options: {
			infuraId: "9aa3d95b3bc440fa88ea12eaa4456161"
		}
	}
};


class Index extends React.Component {

	constructor(props) {
		super(props);
		this.state = { tokenId: 0 }
	}

	async componentDidMount() {
		this.updateImageSize()
		window.addEventListener("resize", this.updateImageSize.bind(this))
		
		this.randomize()
	}

	updateImageSize() {
		let size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.6)
		this.setState({ imageStyle: { 'width': size + 'px', 'height': size + 'px' } })
	}

	randomize() {
		console.log('randomize');
		this.updateSeed(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
	}
	setSeed() {
		console.log('setSeed');
		let seed = window.prompt('Enter Number/Hex')
		if (!seed) return
		this.updateSeed(seed)
	}
	async updateSeed(seed) {
		let tokenId = this.seedToTokenId(seed)
		if (tokenId === undefined) return
		console.log('updateSeed', seed, tokenId);

		await this.setState({ tokenId: tokenId, imageURL: '/transparent.png', tokenOwner: null })
		setTimeout(() => {
			this.setState({ imageURL: 'https://elliss.xyz/image?tokenId=' + tokenId })
		}, 50);

		this.fetchOwner()
	}
	seedToTokenId(seed) {
		try {
			return Number(BigInt((seed)) % BigInt(Number.MAX_SAFE_INTEGER))
		} catch (error) {
			window.alert('Invalid input')
			return undefined
		}
	}






	async connect() {
		console.log('Contract ABI', Elliss.abi);

		try {
			const web3Modal = new Web3Modal({ providerOptions })
			const connection = await web3Modal.connect()
			const provider = new ethers.providers.Web3Provider(connection)

			await this.setState({ provider })

			let network = await provider.getNetwork()
			console.log('web3Modal', connection, provider, network);

			if (!network) return

			let chainConfig = config[parseInt(network.chainId)]
			if (!chainConfig) {
				window.alert('Current chain is not supported. ΞLLISS is only available on Rinkeby.')
				return
			}
			console.log('Chain', network.chainId, chainConfig);
			await this.setState({ chainConfig })

			let accounts = await connection.request({ method: 'eth_requestAccounts' });
			let account = accounts[0]
			await this.setState({ account })
			console.log('account', account);

			this.fetchPrice()
			this.fetchOwner()
			this.test()

		} catch (err) {
			console.log("Error:", err)
		}
	}

	async test() {
		if (!this.state.chainConfig) return

		try {
			const provider = this.state.provider
			const contract = new ethers.Contract(this.state.chainConfig.contractAddress, Elliss.abi, provider)

			let balanceOf = await contract.balanceOf(this.state.account)
			balanceOf = balanceOf.toNumber()
			console.log('balanceOf:', balanceOf)

			for (let i = 0; i < balanceOf; i++) {
				let tokenId = await contract.tokenOfOwnerByIndex(this.state.account, i)
				let tokenURI = await contract.tokenURI(tokenId)
				console.log('token:', tokenId.toString(), tokenURI)
			}


		} catch (err) {
			console.log("Error:", err)
		}
	}
	async fetchPrice() {
		if (!this.state.chainConfig) return

		try {
			const provider = this.state.provider
			const contract = new ethers.Contract(this.state.chainConfig.contractAddress, Elliss.abi, provider)

			const price = await contract.price()
			let priceString = parseFloat(ethers.utils.formatEther(price)).toFixed(4)
			this.setState({ price, priceString })
			console.log('price:', priceString)

		} catch (err) {
			console.log("Error:", err)
		}
	}
	async fetchOwner() {
		if (!this.state.chainConfig) return
		if (!this.state.tokenId) return

		try {
			const provider = this.state.provider
			const contract = new ethers.Contract(this.state.chainConfig.contractAddress, Elliss.abi, provider)
			this.setState({ tokenOwner: null })

			let tokenOwner = await contract.ownerOf(this.state.tokenId)
			tokenOwner = tokenOwner.toLowerCase()
			this.setState({ tokenOwner })
			console.log('tokenOwner:', tokenOwner)

		} catch (err) {
			console.log("Error:", err)
		}
	}
	async mint() {
		if (!this.state.chainConfig) return

		try {
			await this.setState({ status: 'minting' })

			await this.fetchPrice()

			const provider = this.state.provider
			const signer = provider.getSigner()
			const contract = new ethers.Contract(this.state.chainConfig.contractAddress, Elliss.abi, signer)

			const transaction = await contract.mint(this.state.tokenId, { value: this.state.price })
			await transaction.wait()
			await this.fetchOwner()

			await this.setState({ status: 'minted' })

			await this.fetchPrice()

		} catch (err) {
			console.log("Error:", err)
			await this.setState({ status: 'error' })
			let errorMessage = (err.data && err.data.message) || err.message
			if (errorMessage) window.alert(errorMessage)
		}
	}



	render() {
		return (
			<div className="container">
				<div className="fullscreen text-center d-flex flex-column align-items-center justify-content-center my-5">

					<div className="form-inline">
						<button className="btn btn-outline-dark btn-sm rounded-pill px-3 mx-2" onClick={this.randomize.bind(this)}>Randomize</button>
						<button className="btn btn-outline-dark btn-sm rounded-pill px-3 mx-2" onClick={this.setSeed.bind(this)}>Enter Number/Hex</button>
					</div>
					<div className="mt-4 mb-n4 h5">
						<span className="font-weight-bold">ΞLLISS</span> <span className="text-muted">#{this.state.tokenId}</span>
					</div>

					<div className="image shadow position-relative my-5" style={this.state.imageStyle} >
						<div className="position-absolute w-100 h-100  d-flex  align-items-center justify-content-center" style={{ 'zIndex': '0' }}><div className="spinner-border spinner-border-smx text-muted"></div></div>
						<img className="position-relative w-100 h-100" src={this.state.imageURL} alt="" style={{ 'zIndex': '1' }} />
					</div>


					<div className="mb-5 mx-3">
						{!this.state.provider &&
							<button className="btn btn-dark btn-lg rounded-pill px-4 " onClick={this.connect.bind(this)} >Connect Wallet</button>
						}
						{this.state.status !== 'minting' && this.state.priceString && !this.state.tokenOwner &&
							<button className="btn btn-dark btn-lg rounded-pill px-4 " onClick={this.mint.bind(this)} >Mint for {this.state.priceString}Ξ</button>
						}
						{this.state.status === 'minting' &&
							<button className="btn btn-dark btn-lg rounded-pill px-4 " disabled >Minting...</button>
						}
						{this.state.tokenOwner && this.state.tokenOwner === this.state.account &&
							<button className="btn btn-success btn-lg rounded-pill px-4 " >Owned <i className="feather icon-check font-weight-bold ml-2"></i></button>
						}
						{this.state.tokenOwner && this.state.tokenOwner !== this.state.account &&
							<button className="btn btn-dark btn-lg rounded-pill px-4 disbled" disabled >Owned by {this.state.tokenOwner.substring(0, 8)}</button>
						}
					</div>

					<div className="mb-5  text-muted" style={{ 'maxWidth': '90%' }}>
						<div className="mb-2">🧿&nbsp; <span className="font-weight-bold">ΞLLISS</span> is a collection of generative abstract geometric art.</div>
						<div className="mb-2">🌱&nbsp; 100% of minting fees go to fund Ethereum public goods on Gitcoin Grants.</div>
						<div className="mb-2">📈&nbsp; Mint price goes up by 1% with every mint, starting at 0.01Ξ.</div>
					</div>
					<div className="mb-5 small text-muted">
						Created by <a href="https://twitter.com/moesalih_" target="_blank" className="text-reset font-weight-bold my-2">MOΞ</a>
						<span className="mx-2 text-black-50">·</span>
						<a href="https://github.com/moesalih/elliss" target="_blank" className="text-reset text-decoration-none  ">GitHub</a>
						<span className="mx-2 text-black-50">·</span>
						<a href="https://instagram.com/elliss.xyz" target="_blank" className="text-reset text-decoration-none  ">Instagram</a>
					</div>

				</div>
			</div>
		)
	}

}



function AppRouter() {

	return (
		<Router>
			<div>
				<Route path="/" exact component={Index} />
			</div>
		</Router>
	);
}

export default AppRouter;
