const fs = require("fs"),
	path = require("path");
const ndz = require("node-stream-zip"),
	request = require("request"),
	archiver = require("archiver");

const envs = {
	isDocker: process.env.IS_DOCKER || false,
	timeout: process.env.TIMEOUT || 0,
};

let scanDir = path.resolve(`${__dirname}/data`);
let dlDir = `${__dirname}/downloading`;
let logFile = `${__dirname}/log.txt`;
let fileStream = fs.createWriteStream(logFile, { encoding: "utf-8", flags: "a" });

function log(msg) {
	let d = new Date(), dStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
	console.log(`${(envs.isDocker === "true") ? "" : `${dStr} | `}${msg}`);
	fileStream.write(`${dStr} | ${msg}\n`);
}
async function downloadChapter(chapterObj) {
	let chapterData = await mdAPI.getChapter(chapterObj.chapterId);
	let path = `${dlDir}/${chapterObj.chapterId}`;

	if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
	return chapterData.urls.reduce((cp, url, index, {length: arr}) => cp.then((e) => new Promise((resolve) => {
		let localName = `${index}${url.match(/.[a-z]+$/g)[0]}`
		setTimeout(() => {
			request(url).pipe(fs.createWriteStream(`${path}/${localName}`)).on("close", function() {
				log(`Downloaded: ${index + 1}/${arr}: ${chapterObj.chapterId}/${localName}`);
				resolve();
			});
		}, 100);
	})), Promise.resolve());
}
function compressChapter(serie, chapterId, chapter) {
	log(`Compressing: ${serie}/${chapter} | ${chapterId}`)
	return new Promise((resolve) => {
		if (!chapter) chapter = 1;
		let archive = archiver("zip");
		archive.pipe(fs.createWriteStream(`${scanDir}/${serie}/Ch. ${chapter}.zip`)).on("close", () => {
			fs.rmSync(`${dlDir}/${chapterId}`, { recursive: true, force: true });
			resolve();
		});
		archive.directory(`${dlDir}/${chapterId}`, false);
		archive.finalize();
	});
}

function init() {
	new Promise((res) => {
		log("Initializing...");
		log("Listing offline assets...");
		let idsTable = {};
		fs.readdirSync(scanDir, { encoding: "utf-8", withFileTypes: true })
			.filter((item) => item.isDirectory())
			.reduce((cp, { name }, index, { length: totalLen }) => cp.then(() => new Promise(async (resolve) => {
				log(`Reading dir: ${index +1}/${totalLen}:${scanDir}/${name}`);
				idsTable[ name ] = {
					mdId: null,
					chapters: [],
				};
				let files = fs.readdirSync(`${scanDir}/${name}`);

				for (let file of files) {
					let zip = new ndz.async({ file: `${scanDir}/${name}/${file}` });
					let hasComicInfo = /comicinfo\.xml/gi.test( Object.keys(await zip.entries()).toString() );

					if (idsTable[name].mdId == null && hasComicInfo) {
						let match = (await zip.entryData("ComicInfo.xml")).toString("utf-8").match(/(?<=title\/)[^\\\/<\n]+/gi);
						idsTable[name].mdId = (match.length) ? match[0] : "";
					}
					idsTable[name].chapters.push( file.match(/\d+(\.\d+)?/g)[0] );
				}
				resolve();
			})), Promise.resolve()).finally(() => {
				log(`Timeout for ${envs.timeout} second(s) to avoid rate limit.`);
				setTimeout(() => {
					res(idsTable);
				}, +envs.timeout * 1000);
			});
	})
	.then((items) => {
		let dlList = [],
			hashTable = {};
		log("Fetching items...");
		return Object.keys(items).reduce((cp, mangaName, index, { length: totalLen }) => cp.then(() => new Promise(res => {
			log(`Fetching ${index +1}/${totalLen}: ${mangaName}`);
			let manga = items[mangaName];
			hashTable[mangaName] = manga.chapters;
			if (manga.mdId === null) return res();
			mdAPI.getMangaChapters(manga.mdId).then((mdResponse) => {
				for (let item of mdResponse.data) {
					if (!hashTable[mangaName].includes(item.attributes.chapter)) {
						dlList.push({
							name: mangaName,
							chapter: item.attributes.chapter,
							chapterId: item.id
						});
						hashTable[mangaName].push(item.attributes.chapter);
					}
				}
				res();
			});
		})), Promise.resolve()).then((res) => dlList);
	})
	.then((items) => {
		if (items.length) {
			log(`Download & Compress ${items.length} Chapter(s)...`);
			return items.reduce((cp, item, index, {length: total}) => cp.then(() => new Promise((res) => {
				log(`${index +1}/${total} || ${item.chapterId} | ${item.name}/${item.chapter}`);
				Promise.resolve(downloadChapter(item))
					.then(() => compressChapter(item.name, item.chapterId, item.chapter))
					.then(() => {
						log(`Timeout for ${envs.timeout} second(s) to avoid rate limit.`);
						setTimeout(() => {
							res();
						}, +envs.timeout * 1000);
					})
			})), Promise.resolve());
		}
	})
	.finally(() => log("Done."));
}

let mdAPI = null;
(async () => {
	mdAPI = await require("./mdv3.js");
	if (mdAPI.token) {
		console.log(mdAPI);
		init();
	} else {
		throw new Error("Token/Login Credentials not found.");
	}
})();