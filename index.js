const fs = require("fs"),
	path = require("path");
const ndz = require("node-stream-zip"),
	request = require("request"),
	archiver = require("archiver");

let scanDir = path.resolve(`${__dirname}/data`);
let dlDir = `${__dirname}/downloading`;
let logFile = `${__dirname}/log.txt`;
let fileStream = fs.createWriteStream(logFile, { encoding: "utf-8", flags: "a" });

function log(msg) {
	let d = new Date();
	let logMsg = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()} | ${msg}`;
	console.log(logMsg);
	fileStream.write(`${logMsg}\n`);
}
async function downloadChapter(chapterObj) {
	let chapterData = await mdAPI.getChapter(chapterObj.id);
	let path = `${dlDir}/${chapterObj.id}`;

	if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
	return chapterData.urls.reduce((cp, url, index, {length: arr}) => cp.then((e) => new Promise((resolve) => {
		let localName = `${index}${url.match(/.[a-z]+$/g)[0]}`
		setTimeout(() => {
			request(url).pipe(fs.createWriteStream(`${path}/${localName}`)).on("close", function() {
				log(`Downloaded: ${index + 1}/${arr}: ${chapterObj.id}/${localName}`);
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
			.reduce((cp, { name }) => cp.then(() => new Promise(resolve => {
				log(`Reading dir: ${scanDir}/${name}`);
				idsTable[ name ] = {
					mdId: null,
					chapters: [],
					willDownload: [],
				};
				let files = fs.readdirSync(`${scanDir}/${name}`);

				files.reduce((ccp, file) => ccp.then(() => new Promise(async (res2) => {
					let zip = new ndz.async({ file: `${scanDir}/${name}/${file}` });
					let hasComicInfo = /comicinfo\.xml/gi.test( Object.keys(await zip.entries()).toString() );

					if (idsTable[name].mdId == null && hasComicInfo) {
						let match = (await zip.entryData("ComicInfo.xml")).toString("utf-8").match(/(?<=title\/)[^\\\/<\n]+/gi);
						idsTable[name].mdId = (match.length) ? match[0] : "";
					}
					idsTable[name].chapters.push( file.match(/\d+(\.\d+)?/g)[0] );
					res2();
				})), Promise.resolve()).finally(() => {
					resolve();
				});
			})), Promise.resolve()).finally(() => res(idsTable));
	}).then((items) => {
		log("Fetching items...");
		return Object.keys(items).reduce((cp, mangaName, index, { length: totalLen }) => cp.then(() => new Promise(res => {
			log(`Fetching ${index +1}/${totalLen}: ${mangaName}`);
			if (items[mangaName].mdId !== null) {
				mdAPI.getMangaChapters(items[mangaName].mdId)
					.then((mdRespose) => {
						if (mdRespose?.data?.length !== items[mangaName].chapters.length) {
							log(`${mangaName} | Filtering Chapters...`);
							// console.log(mdRespose)
							items[mangaName].willDownload = mdRespose.data.filter((chapter) => !items[mangaName].chapters.includes( chapter.attributes.chapter || "1" ) );
						}
						res();
					});
			} else {
				res();
			}
		})), Promise.resolve()).then(() => {
			log(`Remove manga(s) with no new updates from download list...`);
			Object.keys(items).filter((mangaName) => !items[mangaName].willDownload.length && delete items[mangaName]);
			return items;
		});
	}).then((items) => {
		let keys = Object.keys(items);
		if (keys.length) {
			log("Download & Compress Chapters...");
			return keys.reduce((cp, mangaName) => cp.then(() => new Promise(resolve => {
				log(`Downloading Manga: ${mangaName}`);
				items[mangaName].willDownload.reduce((cp2, chapter) => 
					cp2.then(() => downloadChapter(chapter)).then(() => compressChapter(mangaName, chapter.id, chapter.attributes.chapter))
				, Promise.resolve()).finally(() => resolve());
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
		new Error("Token/Login Credentials not found.");
	}
})();