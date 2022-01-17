const functions = require('firebase-functions')
const svg2img = require('svg2img')

const util = require('util')
const svg2img_ = util.promisify(svg2img)

const IgApiClient = require('instagram-private-api')




exports.metadata = functions.runWith({ memory: '1GB' }).https.onRequest(async (req, res) => {
	try {

		let { attributes } = await generateImage({ seed: req.query.tokenId })

		let result = {
			name: 'ΞLLISS #' + req.query.tokenId,
			description: '🧿  ΞLLISS is a collection of generative abstract geometric art.\n\n🌱  100% of minting fees go to fund Ethereum public goods on Gitcoin Grants.',
			image: 'https://elliss.xyz/image?tokenId=' + req.query.tokenId,
			attributes,
		}

		res.set('Content-Type', 'application/json');
		res.set('Cache-Control', 'public, max-age=3600');
		res.send(result);

	} catch(e) {
		console.error(e)
		res.status(400).send('Error ' + e)
	}
})

exports.image = functions.runWith({ memory: '1GB' }).https.onRequest(async (req, res) => {
	try {

		let { buffer } = await generateImage({ seed: req.query.tokenId })

		res.set('Content-Type', 'image/png');
		res.set('Cache-Control', 'public, max-age=3600');
		res.send(buffer);

	} catch(e) {
		console.error(e)
		res.status(400).send('Error ' + e)
	}
})

let generateImage = async (config) => {

	try {
		config = config || {}
		let seed = config.seed || Math.floor(Math.random()*Number.MAX_SAFE_INTEGER)
		console.log('seed', seed);
		seed = Number(BigInt((seed)) % BigInt(Number.MAX_SAFE_INTEGER))
		let random = configRandom(seed)

		let h = config.hh || 2048
		let w = config.ww || 2048
		let size = Math.min(w,h)

		let r = (a,b) => (b-a) * random() + a
		let rs = (a,b,s=size) => r(a,b) * s
		let arrayRandom = (a) => a[Math.floor(random()*a.length)]
		let p = (v) => r(0,1) < v


		const window   = require('svgdom')
		const SVG      = require('svg.js')(window)
		const document = window.document
		const canvas = SVG(document.documentElement).size(w,h)


		let colorPaletteIndex = Math.floor(random()*colorPalettes.length)
		let colors = config.customColors || colorPalettes[colorPaletteIndex]

		canvas.rect(w,h).fill(arrayRandom(colors))

		let count = r(5,15) // number of shapes
		let shapeSwitch = p(.1) ? 1 : null // shape: 10% chance of recs only
		let sizeMax = r(.1,.5) + (1/count)
		let sizeMin = 0.1
		let opacityEnabled = p(.2)
		let isStrokeColored = p(.02)
		let strokeMin = .000
		let strokeMax = .005
		let strokeWidth = p(.9) ? r(strokeMin,strokeMax) : null //  90% set globally for all shapes
		let moveMax = r(.2,.5)
		let rotation = p(.5) ? r(0,180) : null //  50% set globally for all shapes

		let getShape = (shapeVar, sizeMax, sizeMin) => {
			if (shapeVar < 0.33) return canvas.circle(rs(sizeMin,sizeMax))
			if (shapeVar < 0.66) { s = rs(sizeMin,sizeMax); return canvas.polygon('0,0 '+s*.5+','+s*.866+' '+s+','+0) }
			if (shapeVar < 1) return canvas.rect(rs(sizeMin,sizeMax), rs(sizeMin,sizeMax))
			return canvas.rect(rs(sizeMin,sizeMax), rs(sizeMin,sizeMax))
		}

		for (let i = 0; i < count; i++) {
			var shape = getShape(shapeSwitch || r(0,1), sizeMax, sizeMin)
			shape.fill({ color: arrayRandom(colors), opacity: opacityEnabled ? r(.1,1) : 1 })
			shape.stroke({ color: isStrokeColored ? arrayRandom(colors) : '#000000', opacity: 1, width: w * (strokeWidth || r(strokeMin,strokeMax)) })
			shape.move(w/2-shape.width()/2, h/2-shape.height()/2)
			shape.dmove(rs(-1*moveMax,moveMax,w), rs(-1*moveMax,moveMax,h))
			shape.rotate(rotation || r(0,180))
		}

		let buffer = await svg2img_(canvas.svg(), config.jpg ? {format:'jpg','quality':100} : null)

		let attributes = [
			{ "trait_type": "Color Palette", "value": colorPaletteIndex+1+""},
			{ "trait_type": "Shapes", "value": shapeSwitch ? "Rectangles Only":"Variable"},
			{ "trait_type": "Transparency", "value": opacityEnabled ? "Yes":"No"},
			{ "trait_type": "Stroke Color", "value": isStrokeColored ? "Dynamic":"Black"},
			{ "trait_type": "Stroke Width", "value": strokeWidth ? "Global":"Dynamic"},
			{ "trait_type": "Rotation", "value": rotation ? "Global":"Dynamic"},
		]

		return { buffer, tokenId: seed, attributes }

	} catch(e) {
		console.error(e)
		return null
	}

}
let configRandom = (seed = 1) => {
	seed = Number(BigInt((seed)) % BigInt(Number.MAX_SAFE_INTEGER))
	function random() {
		 var x = Math.sin(seed++) * 10000;
		 return x - Math.floor(x);
	}
	return random
}





let colorPalettes = [

	['#74DBD8', '#4AA5E1', '#6E59C2', '#FF7F6B', '#FFC663'],
	['#EBA5BF', '#EFCADB', '#F2F5F1', '#9CDEEC', '#11305D', '#D1D5F2'],
	['#ED5537', '#E47D49', '#EBB27D', '#E5D2AF', '#8BB2AA', '#239EA9', '#288EA3', '#3B4D6A'],
	['#D02B2F', '#315F8C', '#B8D9CD', '#FCD265', '#28A791', '#3B2C20'],

	['#C95239', '#4F9CBC', '#7FB7C3', '#E9E2D1', '#28252D'],
	['#4F9CBC', '#7FB7C3', '#E9E2D1', '#28252D'],
	['#2d3561', '#c05c7e', '#f3826f', '#ffb961'],
	['#f38181', '#fce38a', '#eaffd0', '#95e1d3'],
	['#48466d', '#3d84a8', '#46cdcf', '#abedd8'],
	['#cefff1', '#ace7ef', '#a6acec', '#a56cc1'],
	['#3a0088', '#930077', '#e61c5d', '#ffbd39'],
	['#35477d', '#6c5b7b', '#c06c84', '#f67280'],
	['#94978B', '#DBC6BE', '#E7E0D5', '#C59F93', '#554F4A', '#D1D0C7'],

	['#eb586f', '#d8e9f0', '#4aa0d5', '#454553'],
	['#511e78', '#8b2f97', '#cf56a1', '#fcb2bf'],
	['#f23557', '#f0d43a', '#22b2da', '#3b4a6b'],
	['#f9f7f7', '#dbe2ef', '#3f72af', '#112d4e'],
	['#e23e57', '#88304e', '#522546', '#311d3f'],
	['#ffb6b9', '#fae3d9', '#bbded6', '#8ac6d1'],
	['#d3f6f3', '#f9fce1', '#fee9b2', '#fbd1b7'],

	['#77857B', '#C2AD9C', '#5B5E60', '#E3D4CA', '#333333', '#F4F1E9'],
	['#454C56', '#CED2CA', '#9FB1B9', '#738084'],
	['#9A948B', '#ADAEA8', '#CFC8BC', '#77797C', '#D8D4D0'],

	['#000000', '#888888', '#ffffff'],
]

exports.colors = functions.https.onRequest(async (req, res) => {
	try {

		let html = ''

		html += colorPalettes.map((p, i) => {
			colors = p.map(c => '<div style="display:inline-block; height:5em; width:5em; background:' + c + ';"></div>').join('')
			return '<div style="text-align:center; margin:1em 0;">' + i + colors + '</div>'
		}).join('')

		res.send(html);

	} catch(e) {
		console.error(e)
		res.status(400).send('Error ' + e)
	}
})




exports.postToInstagram = functions.runWith({ memory: '1GB' }).pubsub.schedule('0 12,16,20 * * *').timeZone('America/New_York').onRun(async (context) => {
	try {

		let seed = Math.floor(Math.random()*Number.MAX_SAFE_INTEGER)
		let { buffer } = await generateImage({ seed, jpg: true })
		await postToInstagram(buffer, seed)

	} catch(e) {
		console.error(e)
	}
	return null
})

let postToInstagram = async (buffer, tokenId) => {
	const ig = new IgApiClient.IgApiClient()
	let username = functions.config().instagram.username
	let password = functions.config().instagram.password
	ig.state.generateDevice(username)
	await ig.account.login(username, password)


	const publishResult = await ig.publish.photo({
		file: buffer,
		caption: '# '+tokenId+' \n\n#geometricdesign #geometricart #abstractart #abstractgeometric #ai #contemporaryart #contemporarypainting #minimalistic #minimalism #geometricart #suprematism #geometricalabstract #artwork #artgallery #artcurator #modernart #originalart #abstractpainting #abstractart #constructivism #abstractartist #abstractexpressionism #kunst #artwork #finearts #artgallery #art #postsuprematism #instagood #artlover',
	})

	console.log(publishResult)
	return publishResult
}

