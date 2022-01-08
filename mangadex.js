// const fet = require("node-fetch"), fetch = (url) => fet(url, {timeout: 0}).then((a) => a.json());
const req = require("request"), fetch = (url) => new Promise((resolve) => {
	req(url, (err, res, body) => {
		resolve(JSON.parse(body));
	});
});

class MangadexAPI {
	base = "https://api.mangadex.org";
	uploads = "https://uploads.mangadex.org/data";
	path = {
		batch: `${__dirname}\\results.bat`,
		IDM: `"C:\\Program Files (x86)\\Internet Download Manager\\IDMan.exe"`,
		contents: `${__dirname}/downloading`,
		shellScript: `${__dirname}\\results.sh`,
	};

	constructor() {}

	genChapterImgsURL = (hash, pages) => {
		if (!Array.isArray(pages)) pages = [ pages ];
		return pages.map((page) => `${this.uploads}/${hash}/${page}`);
	}

	getChapter = (chapterId) => {
		return fetch(`${this.base}/chapter/${chapterId}`)
	}

	getManga = (mangaId) => {
		return fetch(`${this.base}/manga/${mangaId}`)
	}

	getMangaChapters = (mangaId, {translatedLanguage, limit, offset} = {translatedLanguage: "en", limit: 500, offset: 0}) => {
		return fetch(`${this.base}/manga/${mangaId}/feed?${( new URLSearchParams({ "translatedLanguage[]": translatedLanguage, limit, offset }) ).toString()}`)
	}
}
module.exports = new MangadexAPI();