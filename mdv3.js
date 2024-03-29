const fet = require("node-fetch"), fetch = (url) => new Promise((resolve) => {
	const anon = () => {
		fet(url, { timeout: 0 }).then((res) => res.text()).then((res) => {
			if (!res || res === undefined || res === 'undefined') {
				console.log(err, res, body)
				console.log(`[Retrying] Err @ ${url}`);
				setTimeout(() => {
					anon();
				}, 5000);
				return;
			}
			resolve(JSON.parse(res));
		});
	}

	anon();
});

const fs = require("fs"),
	loginFile = JSON.parse(fs.readFileSync(`${__dirname}/login.json`, { encoding: "utf-8" }));

class MangadexAPI {
	base = "https://api.mangadex.org";
	uploads = "https://uploads.mangadex.org";

	path = {
		batch: `${__dirname}\\results.bat`,
		IDM: `"C:\\Program Files (x86)\\Internet Download Manager\\IDMan.exe"`,
		contents: `${__dirname}/downloading`,
		shellScript: `${__dirname}\\results.sh`,
	};

	token = null;

	constructor() {
		if (loginFile.token) {
			this.token = loginFile.token;
			return true;
		}
		if (loginFile.username && loginFile.password) {
			return new Promise((resolve) => {
				req.post(`${this.base}/auth/login`, {
					json: {
						username:loginFile.username,
						password: loginFile.password,
					}
				}, (err, res, body) => {
					this.token = body.token.session;
					loginFile.token = body.token.session;
					fs.writeFileSync(`${__dirname}/login.json`, JSON.stringify(loginFile, null, "\t"), { encoding: "utf-8" });
					resolve(this);
				});
			})
			// .then(res => {
			// 	this.token = res.token.session;
			// 	return this;
			// });
		}
	}

	genChapterImgsURL = (hash, pages) => {
		if (!Array.isArray(pages)) pages = [ pages ];
		return pages.map((page) => `${this.uploads}/data/${hash}/${page}`);
	}

	getChapter = (chapterId) => {
		return fetch(`${this.base}/at-home/server/${chapterId}`).then((res) => {
			res.urls = this.genChapterImgsURL(res.chapter.hash, res.chapter.data);
			return res;
		});
	}

	getManga = (mangaId) => {
		return fetch(`${this.base}/manga/${mangaId}`)
	}

	getMangaChapters = (mangaId, {translatedLanguage, limit, offset} = {translatedLanguage: "en", limit: 500, offset: 0}) => {
		return fetch(`${this.base}/manga/${mangaId}/feed?${( new URLSearchParams({ "translatedLanguage[]": translatedLanguage, limit, offset }) ).toString()}`)
	}
}

module.exports = new MangadexAPI();