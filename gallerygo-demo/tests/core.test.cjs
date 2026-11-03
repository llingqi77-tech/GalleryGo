const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const appPath = path.join(__dirname, '..', 'script.js');
const core = fs.existsSync(appPath) ? require(appPath) : {};
const fixture = {
  photos: [
    { id: '001', category: 'payment', ocr_text: 'GoPay Transfer Andi Rp 250.000', tags: ['transfer'], similar_ids: ['002', '003'], recommended: false, tag_suggestion_ids: ['002', '003', '004', '005', '006'] },
    { id: '002', category: 'payment', ocr_text: 'GoPay Andi', tags: ['gopay'], similar_ids: ['001', '003'], recommended: true },
    { id: '003', category: 'payment', ocr_text: 'GoPay', tags: [], similar_ids: ['001', '002'], recommended: false },
    { id: '004', category: 'order', ocr_text: 'Pesanan Shopee', tags: [], similar_ids: [], recommended: true },
    { id: '005', category: 'festival', ocr_text: 'Keluarga', tags: [], similar_ids: [] },
    { id: '006', category: 'chat', ocr_text: 'WhatsApp', tags: [], similar_ids: [] }
  ],
  search_mapping: { gopay: ['001', '002', '003'], 'bukti transfer minggu lalu': ['001', '002', '003'], pesanan: ['004'] }
};

test('core interface is available without a DOM', () => {
  assert.equal(typeof core.searchPhotos, 'function', 'searchPhotos must implement real JSON-driven searching');
});
test('recent searches are newest first, normalized, unique, bounded and immutable', () => {
  const before=['gopay','pesanan'];
  assert.deepEqual(core.rememberSearch(before,' GOPAY '),['GOPAY','pesanan']);
  assert.deepEqual(before,['gopay','pesanan']);
  assert.deepEqual(core.rememberSearch(before,'   '),before);
  assert.equal(core.rememberSearch(Array.from({length:8},(_,i)=>`query ${i}`),'new query').length,8);
});
test('timeline groups photos by date newest first, preserving input and missing dates last', () => {
  const photos = [{id:'a',date:'2026-01-03'}, {id:'b',date:'2026-11-01'}, {id:'c',date:'2026-01-03'}, {id:'d'}];
  assert.deepEqual(core.dateGroups(photos).map(group => [group.date, group.photos.map(p=>p.id)]),
    [['2026-11-01',['b']], ['2026-01-03',['a','c']], ['', ['d']]]);
  assert.deepEqual(photos.map(p=>p.id),['a','b','c','d']);
});
test('cleanup has one group per similar set and excludes unavailable singletons', () => {
  assert.deepEqual(core.cleanupGroups(fixture, {}).map(group=>group.map(p=>p.id)), [['001','002','003']]);
  assert.deepEqual(core.cleanupGroups(fixture, {importedIds:['001','002','004'],hiddenIds:['002']}), []);
});
test('Indonesian exact and case-insensitive mapping finds only mapped IDs', () => {
  assert.deepEqual(core.searchPhotos(fixture, '  GOPAY ').map(p => p.id), ['001', '002', '003']);
});
test('fuzzy Indonesian phrase works with reordered words', () => {
  assert.deepEqual(core.searchPhotos(fixture, 'minggu lalu bukti transfer').map(p => p.id), ['001', '002', '003']);
});
test('Latin mapping matches words rather than unrelated substrings', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8'));
  assert.deepEqual(core.searchPhotos(data, 'presiden'), []);
  assert.deepEqual(core.searchPhotos(data, 'danau'), []);
  assert.ok(core.searchPhotos(data, 'tolong cari bukti transfer minggu lalu').length > 0);
  assert.ok(core.searchPhotos(data, '上周转账记录').length > 0);
});
test('a query outside mapping can match actual OCR and unknown query returns none', () => {
  assert.deepEqual(core.searchPhotos(fixture, 'Shopee').map(p => p.id), ['004']);
  assert.deepEqual(core.searchPhotos(fixture, 'qzx987'), []);
});
test('search enforces imported IDs, hidden IDs and category filters', () => {
  assert.deepEqual(core.searchPhotos(fixture, 'gopay', { importedIds: ['001', '002'], hiddenIds: ['002'] }).map(p => p.id), ['001']);
  assert.deepEqual(core.searchPhotos(fixture, 'gopay', { category: 'order' }), []);
  assert.deepEqual(core.searchPhotos(fixture, '', { importedIds: [], category: 'all' }), []);
});
test('empty query restores category browsing and user tags are searchable', () => {
  assert.deepEqual(core.searchPhotos(fixture, '', { category: 'order' }).map(p => p.id), ['004']);
  assert.deepEqual(core.searchPhotos(fixture, '我的猫', { userTags: { '005': ['我的猫'] } }).map(p => p.id), ['005']);
});
test('similar group includes its source once and excludes unavailable images', () => {
  assert.deepEqual(core.similarGroup(fixture, '001', {}).map(p => p.id), ['001', '002', '003']);
  assert.deepEqual(core.similarGroup(fixture, '001', { importedIds: ['001', '002'], hiddenIds: ['002'] }).map(p => p.id), ['001']);
  assert.deepEqual(core.similarGroup(fixture, 'missing', {}), []);
});
test('tag suggestions use preset IDs and never return source or hidden/already tagged photos', () => {
  assert.deepEqual(core.tagSuggestions(fixture, '001', {}).map(p => p.id), ['002', '003', '004', '005', '006']);
  assert.deepEqual(core.tagSuggestions(fixture, '001', { hiddenIds: ['002'], userTags: { '003': ['旅行'] }, tag: '旅行' }).map(p => p.id), ['004', '005', '006']);
});
test('tag recommendations never fill unavailable presets with unrelated photos', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8'));
  assert.deepEqual(core.tagSuggestions(data, '001', { hiddenIds: ['002'] }).map(p => p.id), ['003', '004', '009', '010']);
  const restricted = { ...fixture, photos: fixture.photos.map(photo => photo.id === '001' ? { ...photo, tag_suggestion_ids: ['002'] } : photo) };
  assert.deepEqual(core.tagSuggestions(restricted, '001', {}).map(p => p.id), ['002']);
  assert.deepEqual(core.tagSuggestions(restricted, '001', { hiddenIds: ['002'] }), []);
});
test('applying a tag is immutable, trims text and avoids case-insensitive duplicates', () => {
  const before = { '001': ['Travel'] };
  const after = core.applyTag(before, ['001', '002'], ' travel ');
  assert.deepEqual(after, { '001': ['Travel'], '002': ['travel'] });
  assert.deepEqual(before, { '001': ['Travel'] });
  assert.deepEqual(core.applyTag(before, ['001'], '   '), before);
});
test('analysis spans four ordered steps and finishes at 6800ms', () => {
  assert.equal(core.analysisState(0).step, 0);
  assert.equal(core.analysisState(1700).step, 1);
  assert.equal(core.analysisState(3400).step, 2);
  assert.equal(core.analysisState(5100).step, 3);
  assert.equal(core.analysisState(6799).done, false);
  assert.deepEqual(core.analysisState(6800), { step: 3, progress: 100, done: true });
});

test('demo removal keeps the chosen image and cannot affect unrelated or unimported images', () => {
  assert.deepEqual(core.planRemoval(fixture, '001', '002', { importedIds: ['001', '002', '004'] }), ['001']);
  assert.deepEqual(core.planRemoval(fixture, '001', '005', {}), []);
  assert.deepEqual(fixture.photos[0].similar_ids, ['002', '003']);
});
