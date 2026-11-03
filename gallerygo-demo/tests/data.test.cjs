const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
test('search suggestion previews point to a photo returned by their preset query',()=>{
  const core=require('../script.js');
  assert.ok(data.meta.search_suggestions?.length >= 3);
  for(const suggestion of data.meta.search_suggestions){
    assert.ok(suggestion.label && suggestion.query);
    assert.ok(core.searchPhotos(data,suggestion.query).some(photo=>photo.id===suggestion.photo_id));
  }
});

test('every category can be browsed and every photo has a unique ID and local images', () => {
  const ids = new Set();
  const expected = ['payment', 'order', 'chat', 'idcard', 'work', 'festival'];
  for (const category of expected) assert.ok(data.photos.some(photo => photo.category === category), `${category} must not be empty`);
  for (const photo of data.photos) {
    assert.ok(photo.id && !ids.has(photo.id), `duplicate photo ${photo.id}`);
    ids.add(photo.id);
    assert.ok(expected.includes(photo.category));
    assert.ok(Array.isArray(photo.tags));
    for (const key of ['thumb', 'full']) {
      assert.ok(photo[key].startsWith('images/'), 'images must be shipped locally');
      assert.ok(fs.statSync(path.join(root, photo[key])).isFile(), `${photo.id} missing ${key}`);
    }
  }
});
test('preset searches, related photos and five tag suggestions reference real photos', () => {
  const byId = new Map(data.photos.map(photo => [photo.id, photo]));
  for (const ids of Object.values(data.search_mapping)) for (const id of ids) assert.ok(byId.has(id), `unknown search result ${id}`);
  for (const photo of data.photos) {
    for (const id of photo.similar_ids) {
      assert.ok(byId.has(id));
      assert.ok(byId.get(id).similar_ids.includes(photo.id), 'similarity links must be reciprocal');
    }
    const group = [photo, ...photo.similar_ids.map(id => byId.get(id))];
    if (group.length > 1) assert.equal(group.filter(item => item.recommended).length, 1);
    assert.equal(new Set(photo.tag_suggestion_ids).size, 5);
    for (const id of photo.tag_suggestion_ids) assert.ok(id !== photo.id && byId.has(id));
  }
});
