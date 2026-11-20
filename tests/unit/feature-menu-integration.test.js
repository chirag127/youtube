const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '../..');
const featureParts = ['bookmarks', 'zen', 'channel-rss', 'invidious', 'playlist-filter', 'series-gap', 'playlist-health', 'comments-tools', 'smart-filters', 'time-limiter'];

function scripts(entry) {
	const html = fs.readFileSync(path.join(root, 'menu', entry), 'utf8');
	return [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g)].map(match => match[1]);
}

test.each(['index.html', 'sidepanel.html'])('%s executes every feature after its category and references only existing scripts', entry => {
	const context = vm.createContext({
		chrome: { runtime: { getManifest: () => ({ version: '4' }) } },
		satus: {
			storage: { onchanged() {}, get() {} },
			events: { on() {} },
			user: { browser: { name: () => 'Chrome' } }
		}
	});
	const dependencies = new Set(['skeleton.js', 'skeleton-parts/general.js', 'skeleton-parts/appearance.js', 'skeleton-parts/playlist.js']);
	const files = scripts(entry);
	expect(new Set(files).size).toBe(files.length);
	const loaded = [];
	for (const file of files) {
		expect(fs.existsSync(path.join(root, 'menu', file))).toBe(true);
		const feature = featureParts.some(name => file === `skeleton-parts/${name}.js`);
		if (!feature && !dependencies.has(file)) continue;
		vm.runInContext(fs.readFileSync(path.join(root, 'menu', file), 'utf8'), context, { filename: file });
		if (feature) loaded.push(file);
	}
	expect(loaded.sort()).toEqual(featureParts.map(name => `skeleton-parts/${name}.js`).sort());
});

test('popup and sidepanel keep the same script dependencies and order', () => {
	expect(scripts('sidepanel.html')).toEqual(scripts('index.html'));
});
