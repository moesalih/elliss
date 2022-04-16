/* global BigInt */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route } from "react-router-dom";

import '@rainbow-me/rainbowkit/dist/index.css';
import { RainbowKitProvider, darkTheme, getDefaultWallets, connectorsForWallets, ConnectButton } from '@rainbow-me/rainbowkit';
import { WagmiProvider, chain, useAccount, useNetwork, useSigner } from 'wagmi';
import { ethers, providers } from 'ethers';


import Elliss from './artifacts/contracts/Elliss.sol/Elliss.json'
import config from './config'





function Index() {

	const faq = [
		{q: 'How are the images generated?', a: 'Each image is completely unique and is generated based on the item number. The item number is used to seed a random number generator, then a set of random numbers is generated from that and used to randomize the parameters that go into the drawing algorithm.'},
		{q: 'Can I mint any item number?', a: 'Yes, you can radomize to mint a random item, or you can enter your desired item number or even a hex value. This allows you to generate an item based on any number that is special to you including any ethereum address or an arbitrary transaction hash.'},
		{q: 'How many unique items are possible?', a: 'There are ~9 quadrillion (2^53 - 1) possible items.'},
		{q: 'Are there properties or traits for each item?', a: 'Yes, there are 6 properties encoded in each item’s metadata with varying probabilities. Those properties are typically displayed with each item in your wallet or on NFT marketplaces like OpenSea and LooksRare. The 6 properties are: Color Palette, Shapes, Transparency, Stroke Color, Stroke Width, Rotation.'},
		{q: 'Is there a royalty fee on secondary sales?', a: 'Yes, there’s a 1% royalty on secondary sales to fund contract deployment and server costs.'},
	]


	const [imageStyle, setImageStyle] = useState(null);
	const [tokenId, setTokenId] = useState(0);
	const [imageURL, setImageURL] = useState('');
	const [tokenOwner, setTokenOwner] = useState('');
	const [price, setPrice] = useState(null);
	const [priceString, setPriceString] = useState('');
	const [status, setStatus] = useState(null);
	const [showFAQ, setShowFAQ] = useState(false);


	// const provider = useProvider()
	const [signerResoponse, getSigner] = useSigner()
	let signer = signerResoponse.data

	const [networkResponse, switchNetwork] = useNetwork()
	let network = networkResponse.data

	let chainConfig = (network && network.chain) ? config[parseInt(network.chain.id)] : null

	const [accountResponse, disconnect] = useAccount()
	let accountAddress = accountResponse.data ? accountResponse.data.address.toLowerCase() : null;

	// console.log('✨', signer, network, chainConfig, accountAddress);


	useEffect(() => {
		updateImageSize()
		window.addEventListener("resize", updateImageSize)
		randomize()
	}, [])

	useEffect(() => {
		// console.log('useEffect: signer, chainConfig, accountAddress, tokenId');
		if (!chainConfig) {
			setPrice(null)
			setPriceString('')
			setTokenOwner('')
		}
		fetchPrice()
		fetchOwner()
	}, [signer, chainConfig, accountAddress, tokenId])





	function updateImageSize() {
		let size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.6)
		setImageStyle({ 'width': size + 'px', 'height': size + 'px' })
	}

	function randomize() {
		console.log('randomize');
		updateSeed(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
	}
	function setSeed() {
		console.log('setSeed');
		let seed = window.prompt('Enter Number/Hex')
		if (!seed) return
		updateSeed(seed)
	}
	async function updateSeed(seed) {
		let tokenId = seedToTokenId(seed)
		if (tokenId === undefined) return
		console.log('updateSeed', seed, tokenId);

		setTokenId(tokenId)
		setImageURL('/transparent.png')
		setTokenOwner(null)
		setTimeout(() => {
			setImageURL('https://elliss.xyz/image?tokenId=' + tokenId)
		}, 50);
	}
	function seedToTokenId(seed) {
		try {
			return Number(BigInt((seed)) % BigInt(Number.MAX_SAFE_INTEGER))
		} catch (error) {
			window.alert('Invalid input')
			return undefined
		}
	}







	async function test() {
		if (!chainConfig) return

		try {
			const contract = new ethers.Contract(chainConfig.contractAddress, Elliss.abi, signer)

			let balanceOf = await contract.balanceOf(accountAddress)
			balanceOf = balanceOf.toNumber()
			console.log('balanceOf:', balanceOf)

			for (let i = 0; i < balanceOf; i++) {
				let tokenId = await contract.tokenOfOwnerByIndex(accountAddress, i)
				let tokenURI = await contract.tokenURI(tokenId)
				console.log('token:', tokenId.toString(), tokenURI)
			}


		} catch (err) {
			console.log("Error:", err)
		}
	}
	async function fetchPrice() {
		if (!chainConfig || !signer) return

		try {
			const contract = new ethers.Contract(chainConfig.contractAddress, Elliss.abi, signer)

			const price = await contract.price()
			let priceString = parseFloat(ethers.utils.formatEther(price)).toFixed(4)
			setPrice(price)
			setPriceString(priceString)
			console.log('price:', priceString)

		} catch (err) {
			console.log("Error:", err)
		}
	}
	async function fetchOwner() {
		if (!chainConfig || !signer) return
		if (!tokenId) return

		try {
			const contract = new ethers.Contract(chainConfig.contractAddress, Elliss.abi, signer)
			setTokenOwner(null)

			let tokenOwner = await contract.ownerOf(tokenId)
			tokenOwner = tokenOwner.toLowerCase()
			setTokenOwner(tokenOwner)
			console.log('tokenOwner:', tokenOwner)

		} catch (err) {
			// console.log("Error:", err)
		}
	}
	async function mint() {
		if (!chainConfig) return

		try {
			setStatus('minting')

			await fetchPrice()

			const contract = new ethers.Contract(chainConfig.contractAddress, Elliss.abi, signer)

			const transaction = await contract.mint(tokenId, { value: price })
			await transaction.wait()
			await fetchOwner()

			setStatus('minted')

			await fetchPrice()

		} catch (err) {
			console.log("Error:", err)
			setStatus('error')
			let errorMessage = (err.data && err.data.message) || err.message
			if (errorMessage) window.alert(errorMessage)
		}
	}




	return (
		<div className="container">
			<div className="fullscreen text-center d-flex flex-column align-items-center justify-content-center my-5">

				<div className="form-inline">
					<button className="btn btn-outline-dark btn-sm rounded-pill px-3 mx-2" onClick={randomize}>Randomize</button>
					<button className="btn btn-outline-dark btn-sm rounded-pill px-3 mx-2" onClick={setSeed}>Enter Number/Hex</button>
				</div>
				<div className="mt-4 mb-n4 h5">
					<span className="font-weight-bold">ΞLLISS</span> <span className="text-muted">#{tokenId}</span>
				</div>

				<div className="image shadow position-relative my-5" style={imageStyle} >
					<div className="position-absolute w-100 h-100  d-flex  align-items-center justify-content-center" style={{ 'zIndex': '0' }}><div className="spinner-border spinner-border-smx text-muted"></div></div>
					<img className="position-relative w-100 h-100" src={imageURL} alt="" style={{ 'zIndex': '1' }} />
				</div>


				<div className="mb-5 mx-3">
					{status !== 'minting' && priceString && !tokenOwner &&
						<button className="btn btn-dark btn-lg rounded-pill px-4 " onClick={mint} >Mint for {priceString}Ξ</button>
					}
					{status === 'minting' &&
						<button className="btn btn-dark btn-lg rounded-pill px-4 " disabled >Minting...</button>
					}
					{tokenOwner && tokenOwner === accountAddress &&
						<button className="btn btn-success btn-lg rounded-pill px-4 " >Owned <i className="feather icon-check font-weight-bold ml-2"></i></button>
					}
					{tokenOwner && tokenOwner !== accountAddress &&
						<button className="btn btn-dark btn-lg rounded-pill px-4 disbled" disabled >Owned by {tokenOwner.substring(0, 8)}...</button>
					}

					<div className="my-3 text-center">
						<div className="d-inline-block">
							<ConnectButton chainStatus="none" showBalance={false} />
						</div>
					</div>
					{network && network.chain && !chainConfig &&
						<div className='small text-danger'>Current chain is not supported. ΞLLISS is only available on Ethereum mainnet or Rinkeby.</div>
					}

				</div>

				<div className="mb-5  text-muted" style={{ 'maxWidth': '90%' }}>
					<div className="mb-2">🧿&nbsp; <span className="font-weight-bold">ΞLLISS</span> is a collection of generative abstract geometric art.</div>
					<div className="mb-2">🌱&nbsp; 100% of minting fees go to fund Ethereum public goods on Gitcoin Grants.</div>
					<div className="mb-2">📈&nbsp; Mint price goes up by 1% with every mint, starting at 0.01Ξ.</div>
				</div>

				<div className="mb-5  text-muted " style={{ 'maxWidth': '40em' }}>
					<div className="mb-4 font-weight-bold" role="button" onClick={() => setShowFAQ(!showFAQ)}>FAQ {!showFAQ?'↓':'↑'}</div>
					{showFAQ && faq.map((item, index) => 
						<div key={index} className="mb-4 text-left">
							<div className="font-weight-bold">{item.q}</div>
							<div className="text-muted">{item.a}</div>
						</div>
					)}
				</div>

				<div className="mb-5 small text-muted">
					Created by <a href="https://twitter.com/moesalih_" target="_blank" className="text-reset font-weight-bold my-2">MOΞ</a>
					<span className="mx-2 text-black-50">·</span>
					<a href="https://etherscan.io/address/0xd3321d33f55b71bd4463b3584adbacce13b8e17f" target="_blank" className="text-reset text-decoration-none  ">Etherscan</a>
					<span className="mx-2 text-black-50">·</span>
					<a href="https://github.com/moesalih/elliss" target="_blank" className="text-reset text-decoration-none  ">GitHub</a>
					<span className="mx-2 text-black-50">·</span>
					<a href="https://instagram.com/elliss.xyz" target="_blank" className="text-reset text-decoration-none  ">Instagram</a>
				</div>

			</div>
		</div>
	)
}








function AppRouter() {

	const infuraId = "9aa3d95b3bc440fa88ea12eaa4456161";
	const infuraProvider = ({ chainId }) => new providers.InfuraProvider(chainId, infuraId);

	const chains = [
		{ ...chain.mainnet, name: 'Ethereum' },
		{ ...chain.rinkeby, name: 'Rinkeby' },
	];

	const wallets = getDefaultWallets({
		chains,
		infuraId,
		appName: 'ΞLLISS',
		jsonRpcUrl: ({ chainId }) => chains.find(x => x.id === chainId) ? chains.find(x => x.id === chainId).rpcUrls[0] : chain.mainnet.rpcUrls[0],
	});

	const connectors = connectorsForWallets(wallets);


	return (
		<RainbowKitProvider chains={chains} theme={darkTheme()} >
			<WagmiProvider autoConnect connectors={connectors} provider={infuraProvider}>
				<Router>
					<div>
						<Route path="/" exact component={Index} />
					</div>
				</Router>
			</WagmiProvider>
		</RainbowKitProvider>

	);
}

export default AppRouter;
