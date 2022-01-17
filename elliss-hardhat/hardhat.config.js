require("@nomiclabs/hardhat-waffle");

require('dotenv').config();
const { PRIVATE_KEY } = process.env;


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
	const accounts = await hre.ethers.getSigners();

	for (const account of accounts) {
		console.log(account.address);
	}
});


// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
	solidity: "0.8.4",
	paths: {
		artifacts: '../elliss-react/src/artifacts',
	},
	networks: {
		hardhat: {
			chainId: 1337
		},
		rinkeby: {
			url: "https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
			accounts: [`0x${PRIVATE_KEY}`]
		}

	}

};
