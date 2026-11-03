(function (root) {
  'use strict';
  const normalize = value => String(value || '').normalize('NFKC').toLowerCase()
    .replace(/(\d)[.,](?=\d)/g, '$1').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const stopWords = new Set(['ke', 'di', 'yang', 'dan', 'untuk', 'the', 'a', '的']);
  const words = text => normalize(text).split(' ').filter(word => word && !stopWords.has(word));
  const idsSet = value => value === undefined ? null : new Set(Array.from(value, String));
  function availablePhotos(data, options = {}) {
    const imported = idsSet(options.importedIds);
    const hidden = idsSet(options.hiddenIds) || new Set();
    return (data.photos || []).filter(photo => (!imported || imported.has(photo.id)) && !hidden.has(photo.id) &&
      (!options.category || options.category === 'all' || photo.category === options.category));
  }
  function mappingScore(query, key) {
    if (query === key) return 100;
    const qWords = words(query), kWords = words(key);
    if (!qWords.length || !kWords.length) return 0;
    if (qWords.every(word => kWords.includes(word)) && kWords.every(word => qWords.includes(word))) return 95;
    if (kWords.every(word => qWords.includes(word))) return 80 + Math.min(kWords.length, 10);
    if (/\p{Script=Han}/u.test(query + key) && query.length >= 2 && (query.includes(key) || key.includes(query))) return 75;
    if (qWords.every(word => kWords.includes(word))) return 70 + qWords.length;
    if (qWords.every(word => word.length >= 3 && kWords.some(candidate => candidate.startsWith(word)))) return 60;
    return 0;
  }
  function searchPhotos(data, rawQuery, options = {}) {
    const available = availablePhotos(data, options);
    const query = normalize(rawQuery);
    if (!query) return available;
    const matched = Object.entries(data.search_mapping || {}).map(([key, ids]) => ({ ids, score: mappingScore(query, normalize(key)) })).filter(item => item.score > 0);
    let mappedIds = null;
    if (matched.length) {
      const best = Math.max(...matched.map(item => item.score));
      const bestMatches = matched.filter(item => item.score === best);
      const intersection = bestMatches[0].ids.filter(id => bestMatches.every(match => match.ids.includes(id)));
      mappedIds = new Set(intersection.length ? intersection : bestMatches.flatMap(item => item.ids));
    }
    const queryWords = words(query);
    return available.filter(photo => {
      const personal = options.userTags?.[photo.id] || [];
      if (personal.some(tag => normalize(tag).includes(query))) return true;
      if (mappedIds) return mappedIds.has(photo.id);
      const text = normalize([photo.title, photo.ocr_text, ...(photo.tags || []), ...personal].join(' '));
      return queryWords.length > 0 && queryWords.every(word => text.includes(word));
    });
  }
  function similarGroup(data, id, options = {}) {
    const source = (data.photos || []).find(photo => photo.id === id);
    if (!source) return [];
    const ids = new Set([source.id, ...(source.similar_ids || [])]);
    const available = availablePhotos(data, { ...options, category: 'all' });
    return [source.id, ...(source.similar_ids || [])].filter((item, index, all) => all.indexOf(item) === index)
      .map(item => available.find(photo => photo.id === item)).filter(photo => photo && ids.has(photo.id));
  }
  function tagSuggestions(data, id, options = {}) {
    const source = (data.photos || []).find(photo => photo.id === id);
    if (!source) return [];
    const available = availablePhotos(data, { ...options, category: 'all' });
    const order = source.tag_suggestion_ids || source.similar_ids || [];
    const candidates = [...new Set(order)];
    const tag = normalize(options.tag);
    return candidates.map(candidate => available.find(photo => photo.id === candidate)).filter(photo => photo && photo.id !== id &&
      (!tag || ![...(photo.tags || []), ...(options.userTags?.[photo.id] || [])].some(value => normalize(value) === tag))).slice(0, options.limit ?? 5);
  }
  function applyTag(userTags, ids, rawTag) {
    const tag = Array.from(String(rawTag || '').trim()).slice(0, 24).join('');
    const next = Object.fromEntries(Object.entries(userTags || {}).map(([id, values]) => [id, Array.isArray(values) ? [...values] : []]));
    if (!tag) return next;
    for (const id of new Set(ids)) {
      const values = next[id] || [];
      if (!values.some(value => normalize(value) === normalize(tag))) next[id] = [...values, tag];
    }
    return next;
  }
  function analysisState(elapsedMs) {
    const elapsed = Math.max(0, Number(elapsedMs) || 0);
    return { step: Math.min(3, Math.floor(elapsed / 1700)), progress: Math.min(100, elapsed / 6800 * 100), done: elapsed >= 6800 };
  }
  function planRemoval(data, id, keepId, options = {}) {
    const group = similarGroup(data, id, options);
    return group.some(photo => photo.id === keepId) ? group.filter(photo => photo.id !== keepId).map(photo => photo.id) : [];
  }
  function dateGroups(photos) {
    const grouped = new Map();
    for (const photo of photos) {
      const date = /^\d{4}-\d{2}-\d{2}/.test(photo.date || '') ? photo.date.slice(0, 10) : '';
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date).push(photo);
    }
    return [...grouped].sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => ({ date, photos: items }));
  }
  function cleanupGroups(data, options = {}) {
    const seen = new Set(), groups = [];
    for (const photo of availablePhotos(data, options)) {
      if (seen.has(photo.id)) continue;
      const group = similarGroup(data, photo.id, options);
      group.forEach(item => seen.add(item.id));
      if (group.length > 1) groups.push(group);
    }
    return groups;
  }
  function rememberSearch(history, rawQuery) {
    const query=Array.from(String(rawQuery || '').replace(/\s+/g,' ').trim()).slice(0,80).join('');
    const previous=Array.isArray(history)?history.filter(value=>typeof value==='string'):[];
    if(!query)return [...previous];
    return [query,...previous.filter(value=>normalize(value)!==normalize(query))].slice(0,8);
  }
  const core = { normalize, searchPhotos, availablePhotos, similarGroup, tagSuggestions, applyTag, analysisState, planRemoval, dateGroups, cleanupGroups, rememberSearch };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  root.GalleryGoCore = core;
})(typeof globalThis !== 'undefined' ? globalThis : this);

(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const core = globalThis.GalleryGoCore;
  const $ = selector => document.querySelector(selector);
  const STORAGE_KEY = 'gallerygo-h5-v1';
  const PAGE_KEY = 'gallerygo-h5-page';
  const state = {
    data: null, selected: new Set(), imported: [], hidden: new Set(), userTags: {},
    category: 'all', browseCategory: 'all', query: '', mode: 'photos', detailRoot: null, searchHistory: [],
    previewId: null, keepId: null, tagPhoto: null, pendingTag: '', tagCandidates: [],
    analysisFrame: null, tagTimer: null, toastTimer: null, toastAction: null,
    tagRun: 0, returnFocus: null, returnFocusId: null, storageWarned: false, cleanupChoices: {}, searchOrigin: 'photos'
  };
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  const byId = id => state.data.photos.find(photo => photo.id === id);
  const categoryName = id => state.data.categories.find(category => category.id === id)?.name || '图片';
  const visibleOptions = () => ({ importedIds: state.imported, hiddenIds: state.hidden, userTags: state.userTags });
  function imageFor(photo, full = false) {
    const image = node('img');
    image.src = full ? photo.full : photo.thumb;
    image.alt = photo.title || `${categoryName(photo.category)} ${photo.id}`;
    image.decoding = 'async';
    image.addEventListener('error', () => {
      image.src = 'images/placeholder.svg';
      image.alt = '图片暂不可用';
    }, { once: true });
    return image;
  }
  function notify(message, action, label = '撤销') {
    clearTimeout(state.toastTimer);
    $('#toast-message').textContent = message;
    $('#toast').hidden = false;
    state.toastAction = action || null;
    $('#toast-action').hidden = !action;
    $('#toast-action').textContent = label;
    state.toastTimer = setTimeout(() => { $('#toast').hidden = true; state.toastAction = null; }, action ? 7000 : 3300);
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, userTags: state.userTags, hiddenIds: [...state.hidden], importedIds: state.imported, searchHistory:state.searchHistory }));
    } catch (_) {
      if (!state.storageWarned) notify('当前浏览器无法保存，更改仍在本次使用中生效');
      state.storageWarned = true;
    }
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || saved.version !== 1) return;
      const valid = new Set(state.data.photos.map(photo => photo.id));
      state.imported = Array.isArray(saved.importedIds) ? saved.importedIds.filter(id => valid.has(id)) : [];
      state.hidden = new Set(Array.isArray(saved.hiddenIds) ? saved.hiddenIds.filter(id => valid.has(id)) : []);
      state.searchHistory=Array.isArray(saved.searchHistory)?saved.searchHistory.filter(value=>typeof value==='string'&&value.trim()).map(value=>value.slice(0,80)).slice(0,8):[];
      state.userTags = Object.fromEntries(Object.entries(saved.userTags || {}).filter(([id, tags]) => valid.has(id) && Array.isArray(tags)).map(([id, tags]) => [id, tags.filter(tag => typeof tag === 'string').map(tag => Array.from(tag).slice(0, 24).join(''))]));
    } catch (_) { /* A stale or unavailable browser store must not block the demo. */ }
  }
  function showPage(name) {
    document.querySelectorAll('.page').forEach(page => {
      const active = page.id === `page-${name}`;
      page.hidden = !active;
      page.classList.toggle('is-active', active);
    });
    try { sessionStorage.setItem(PAGE_KEY, name === 'gallery' ? 'gallery' : 'welcome'); } catch (_) {}
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function updateSelection() {
    const count = state.selected.size;
    $('#selection-count').textContent = `已选 ${count} 张`;
    $('#analyze-button').disabled = count === 0;
    $('#select-all').textContent = count === state.data.photos.length ? '取消全选' : '全选';
  }
  function renderImport() {
    const grid = $('#import-grid');
    grid.replaceChildren();
    $('#import-total').textContent = state.data.photos.length;
    for (const photo of state.data.photos) {
      const label = node('label', 'import-tile');
      const checkbox = node('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.selected.has(photo.id);
      checkbox.setAttribute('aria-label', `选择${photo.title || photo.id}`);
      checkbox.dataset.selectId = photo.id;
      const image = imageFor(photo);
      image.loading = 'lazy';
      label.append(image, checkbox, node('span', 'selection-dot', '✓'));
      grid.append(label);
    }
    updateSelection();
  }
  function stopAnalysis() {
    if (state.analysisFrame !== null) cancelAnimationFrame(state.analysisFrame);
    state.analysisFrame = null;
  }
  function runAnalysis() {
    if (!state.selected.size) return;
    stopAnalysis();
    state.imported = state.data.photos.filter(photo => state.selected.has(photo.id)).map(photo => photo.id);
    persist();
    $('#analysis-count').textContent = `${state.imported.length} 张图片`;
    $('#analysis-copy').textContent = '让每一张重要图片，更容易被找到。';
    showPage('analysis');
    const start = performance.now();
    let lastStep = -1;
    function frame(now) {
      const current = core.analysisState(now - start);
      $('#progress-value').textContent = `${Math.floor(current.progress)}%`;
      $('#progress-fill').style.width = `${current.progress}%`;
      $('#analysis-progress').setAttribute('aria-valuenow', Math.floor(current.progress));
      if (current.step !== lastStep || current.done) {
        document.querySelectorAll('[data-analysis-step]').forEach((step, index) => {
          const done = current.done || index < current.step;
          step.classList.toggle('active', !current.done && index === current.step);
          step.classList.toggle('done', done);
          step.querySelector('.step-state').textContent = done ? '✓' : '';
          if (index === current.step) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
        });
        lastStep = current.step;
      }
      if (current.done) {
        state.analysisFrame = null;
        state.query = ''; state.category = 'all'; state.browseCategory = 'all'; state.mode = 'photos';
        $('#search-input').value = '';
        renderGallery(); showPage('gallery');
        notify(`已整理 ${state.imported.length} 张示例图片，试试用印尼语找图`);
      } else state.analysisFrame = requestAnimationFrame(frame);
    }
    state.analysisFrame = requestAnimationFrame(frame);
  }
  function renderTabs() {
    $('#category-tabs').replaceChildren();
    for (const category of state.data.categories) {
      const button = node('button', 'category-tab', category.name);
      button.dataset.category = category.id;
      button.type = 'button'; button.id = `tab-${category.id}`;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', category.id === state.category ? 'true' : 'false');
      button.setAttribute('aria-controls', 'gallery-grid'); button.tabIndex = category.id === state.category ? 0 : -1;
      button.addEventListener('click', () => { state.category = category.id; renderGallery(); });
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const index = state.data.categories.findIndex(item => item.id === state.category);
        const target = state.data.categories[(index + (event.key === 'ArrowRight' ? 1 : -1) + state.data.categories.length) % state.data.categories.length];
        state.category = target.id; renderGallery(); $(`#tab-${target.id}`).focus();
      });
      $('#category-tabs').append(button);
    }
    const scroller = $('#category-tabs');
    const active = scroller.querySelector('[aria-selected="true"]');
    if (active && scroller.clientWidth) {
      const bounds = scroller.getBoundingClientRect();
      const tabBounds = active.getBoundingClientRect();
      if (tabBounds.left < bounds.left + 16) scroller.scrollLeft -= bounds.left + 16 - tabBounds.left;
      else if (tabBounds.right > bounds.right - 16) scroller.scrollLeft += tabBounds.right - bounds.right + 16;
    }
  }
  function renderAlbumGrid() {
    const grid = $('#album-grid'); grid.replaceChildren();
    for (const category of state.data.categories.filter(item => item.id !== 'all')) {
      const photos = core.availablePhotos(state.data, { ...visibleOptions(), category: category.id });
      const button = node('button', 'album-card'); button.type = 'button';
      button.dataset.category = category.id;
      button.setAttribute('aria-label', `打开${category.name}相册，${photos.length}张`);
      const art = node('div', 'album-art');
      if (photos[0]) art.append(imageFor(photos[0]));
      art.append(node('span', '', category.symbol || '▦'));
      button.append(art, node('h3', '', category.name), node('p', '', `${photos.length} 张图片`));
      button.addEventListener('click', () => { state.mode = 'photos'; state.category = category.id; renderGallery(); });
      grid.append(button);
    }
  }
  function photoButton(photo) {
      const button = node('button', 'photo-tile'); button.type = 'button'; button.dataset.photoId = photo.id;
      button.setAttribute('aria-label', `查看${photo.title || photo.id}`);
      const image = imageFor(photo); image.loading = 'lazy';
      button.append(image);
      if (state.userTags[photo.id]?.length) button.append(node('span', 'photo-tag-dot', '#'));
      button.addEventListener('click', () => { if(state.query)recordSearch(state.query); state.returnFocus = button; state.returnFocusId = photo.id; openDetails(photo.id); });
      return button;
  }
  function dateLabel(date) {
    if (!date) return '日期未知';
    const now = new Date(), localDate = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
    if (date === localDate) return '今天';
    const [year, month, day] = date.split('-').map(Number);
    return `${year}年${month}月${day}日`;
  }
  function renderCleanup() {
    const groups = core.cleanupGroups(state.data, visibleOptions());
    const container = $('#cleanup-groups'); container.replaceChildren();
    $('#cleanup-summary').textContent = groups.length ? `${groups.length} 组相似照片 · 选择喜欢的版本保留` : '整理完成，暂未发现相似照片';
    groups.forEach((group, index) => {
      const root = group[0].id;
      const keep = group.some(photo => photo.id === state.cleanupChoices[root]) ? state.cleanupChoices[root] : (group.find(photo => photo.recommended) || group[0]).id;
      state.cleanupChoices[root] = keep;
      const card = node('section','cleanup-card');
      const heading = node('div','cleanup-card-header'); heading.append(node('h2','',`相似照片 ${String(index+1).padStart(2,'0')}`),node('span','subtle',`${group.length} 张`));
      const grid = node('div','similar-grid');
      group.forEach(photo => {
        const button = node('button',`similar-card${keep === photo.id ? ' selected' : ''}`);
        button.type = 'button'; button.dataset.cleanupPhotoId = photo.id;
        button.setAttribute('aria-label',`保留${photo.title || photo.id}${photo.recommended ? '，推荐保留' : ''}`);
        button.setAttribute('aria-pressed',String(keep === photo.id)); button.append(imageFor(photo));
        if (photo.recommended) button.append(node('span','recommended-badge','推荐保留'));
        if (keep === photo.id) button.append(node('span','similar-check','✓'));
        button.addEventListener('click', () => { state.cleanupChoices[root] = photo.id; renderCleanup(); container.querySelector(`[data-cleanup-photo-id="${photo.id}"]`)?.focus(); });
        grid.append(button);
      });
      const footer = node('div','cleanup-card-footer');
      const preview = node('button','text-button','查看大图'); preview.type='button';
      preview.addEventListener('click',()=>{state.returnFocus=preview;state.returnFocusId=keep;openDetails(keep);});
      const remove = node('button','cleanup-remove',`保留所选，清理其余 ${group.length-1} 张`); remove.type='button';
      remove.addEventListener('click',()=>{
        const before=[...state.hidden], removed=core.planRemoval(state.data,root,keep,visibleOptions());
        removed.forEach(id=>state.hidden.add(id));persist();renderGallery();$('#cleanup-back').focus();
        notify(`已保留1张，演示隐藏 ${removed.length} 张`,()=>{state.hidden=new Set(before);persist();renderGallery();notify('已恢复本次整理的图片');});
      });
      footer.append(preview,remove); card.append(heading,grid,footer);container.append(card);
    });
  }
  function recordSearch(query){state.searchHistory=core.rememberSearch(state.searchHistory,query);persist();}
  function runSuggestedSearch(query){recordSearch(query);setQuery(query);$('#search-input').blur();window.scrollTo(0,0);}
  function renderSearchDiscovery(){
    const examples=$('#search-examples');examples.replaceChildren();
    const presets=state.data.meta?.search_suggestions || (state.data.meta?.search_examples || []).map(query=>({query,label:query}));
    for(const preset of presets){
      const button=node('button','search-suggestion');button.type='button';button.setAttribute('aria-label',`搜索示例：${preset.label}`);
      const results=core.searchPhotos(state.data,preset.query,visibleOptions());
      const preview=results.find(photo=>photo.id===preset.photo_id)||results[0];
      if(preview)button.append(imageFor(preview));else button.append(node('span','suggestion-placeholder','⌕'));
      const copy=node('span','suggestion-copy');copy.append(node('strong','',preset.label),node('small','',preset.query));
      button.append(copy,node('span','suggestion-arrow','↗'));button.addEventListener('click',()=>runSuggestedSearch(preset.query));examples.append(button);
    }
    const history=$('#recent-searches');history.replaceChildren();
    for(const query of state.searchHistory){const button=node('button','recent-chip',query);button.type='button';button.addEventListener('click',()=>runSuggestedSearch(query));history.append(button);}
    $('#recent-empty').hidden=state.searchHistory.length>0;$('#clear-history').hidden=state.searchHistory.length===0;
    const categories=$('#search-categories');categories.replaceChildren();
    for(const category of state.data.categories.filter(item=>item.id!=='all')){
      const button=node('button','search-category-card');button.type='button';button.dataset.category=category.id;
      const photos=core.availablePhotos(state.data,{...visibleOptions(),category:category.id});
      if(photos[0])button.append(imageFor(photos[0]));
      const copy=node('span','');copy.append(node('strong','',category.name),node('small','',`${photos.length} 张图片`));button.append(copy);
      button.addEventListener('click',()=>{state.category=category.id;state.mode='photos';renderGallery();window.scrollTo(0,0);});categories.append(button);
    }
  }
  function renderGallery() {
    const albums=state.mode==='albums', search=state.mode==='search', cleanup=state.mode==='cleanup';
    $('#page-gallery').dataset.view=state.mode;
    $('#gallery-title').textContent=albums?'相册':search?'搜索':cleanup?'相似图清理':'照片';
    $('#reimport-button').hidden=search||cleanup;
    $('#cleanup-back').hidden=!cleanup;
    $('#search-back').hidden=!search;
    renderTabs(); $('#clear-search').hidden=!state.query;
    $('#search-area').hidden=!search;
    $('#search-recommendations').hidden=!search||Boolean(state.query);
    $('#restore-button').hidden=state.hidden.size===0||search;
    $('#category-tabs').parentElement.hidden=!search||!state.query;
    $('#gallery-toolbar').hidden=cleanup||(search&&!state.query);
    $('#cleanup-entry').hidden=!albums; $('#cleanup-panel').hidden=!cleanup;
    $('#gallery-footer').hidden=search||cleanup;
    const groups=core.cleanupGroups(state.data,visibleOptions());
    $('#cleanup-entry-count').textContent=`${groups.length} 组相似照片`;
    const grid=$('#gallery-grid');grid.replaceChildren();grid.hidden=albums||cleanup||(search&&!state.query);
    $('#album-grid').hidden=!albums;
    document.querySelectorAll('[data-nav]').forEach(button=>button.classList.toggle('active',button.dataset.nav===(cleanup?'albums':state.mode)));
    if(cleanup){renderCleanup();$('#empty-state').hidden=true;return;}
    if(albums){renderAlbumGrid();$('#empty-state').hidden=true;$('#gallery-section-title').textContent='我的相册';$('#gallery-count').textContent='6 个任务分类';return;}
    if(search&&!state.query){renderSearchDiscovery();$('#empty-state').hidden=true;return;}
    const photos=core.searchPhotos(state.data,state.query,{...visibleOptions(),category:state.category});
    $('#gallery-section-title').textContent=search?'搜索结果':state.category==='all'?'按日期排列':categoryName(state.category);
    $('#gallery-count').textContent=`${photos.length} 张图片`;
    $('#empty-state').hidden=photos.length!==0;
    $('#empty-copy').textContent=state.query?`没有找到与“${state.query}”相关的图片，试试其他关键词或分类。`:'这个分类还没有可见图片，可以切换分类或重新选择。';
    for(const group of core.dateGroups(photos)){
      const section=node('section','date-group');section.dataset.date=group.date;
      const heading=node('h2','date-heading',dateLabel(group.date));
      const items=node('div','photo-grid timeline-grid');
      group.photos.forEach(photo=>items.append(photoButton(photo)));
      section.append(heading,items);grid.append(section);
    }
  }
  function setQuery(raw) {
    const value = String(raw || '').trim();
    if (value && !state.query) { state.browseCategory = state.category; state.category = 'all'; }
    if (!value && state.query) state.category = state.browseCategory;
    state.query = value; state.mode = 'search';
    $('#search-input').value = raw || '';
    renderGallery();
  }
  function lockScroll() { document.body.style.overflow = 'hidden'; }
  function unlockScroll() { if ($('#detail-overlay').hidden && $('#tag-overlay').hidden) document.body.style.overflow = ''; }
  function openDetails(id) {
    const photo = byId(id); if (!photo) return;
    state.detailRoot = id; state.previewId = id;
    const group = core.similarGroup(state.data, id, visibleOptions());
    state.keepId = group.find(item => item.recommended)?.id || id;
    renderDetails(); $('#detail-overlay').hidden = false; lockScroll(); $('#detail-sheet').focus();
  }
  function renderDetails() {
    const photo = byId(state.previewId); if (!photo) return;
    $('#detail-title').textContent = photo.title || '图片详情';
    $('#detail-category').textContent = categoryName(photo.category);
    $('#detail-category').dataset.category = photo.category;
    const image = $('#detail-image'); image.src = photo.full; image.alt = photo.title || photo.id;
    image.onerror = () => { image.onerror = null; image.src = 'images/placeholder.svg'; };
    $('#detail-date').textContent = dateLabel(photo.date?.slice(0,10));
    $('#detail-ocr').textContent = photo.ocr_text || '此图片暂无预设文字。';
    const tags = [...new Set([...(photo.tags || []), ...(state.userTags[photo.id] || [])])];
    $('#detail-tags').replaceChildren();
    for (const tag of tags) {
      const button = node('button', `tag-chip${state.userTags[photo.id]?.includes(tag) ? ' user-tag' : ''}`, tag);
      button.type = 'button'; button.setAttribute('aria-label', `按标签搜索：${tag}`);
      button.addEventListener('click', () => { closeDetails(); setQuery(tag); $('#search-input').focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      $('#detail-tags').append(button);
    }
    if (!tags.length) $('#detail-tags').append(node('span', 'subtle', '添加一个属于你的标签。'));
  }
  function closeTag() {
    clearTimeout(state.tagTimer); state.tagTimer = null; state.tagRun++;
    $('#tag-overlay').hidden = true; unlockScroll();
    if (!$('#detail-overlay').hidden) $('#add-tag-button').focus();
  }
  function closeDetails() {
    closeTag(); $('#detail-overlay').hidden = true; unlockScroll();
    const thumbnails = [...document.querySelectorAll('#gallery-grid [data-photo-id],#cleanup-groups [data-cleanup-photo-id]')];
    const target = state.returnFocus?.isConnected ? state.returnFocus :
      thumbnails.find(button => (button.dataset.photoId || button.dataset.cleanupPhotoId) === state.returnFocusId) ||
      thumbnails.find(button => button.dataset.photoId === state.previewId) || thumbnails[0] || $('#reimport-button');
    target.focus();
  }
  function openTag() {
    state.tagPhoto = state.previewId; state.pendingTag = ''; state.tagCandidates = [];
    $('#tag-title').textContent = '添加专属标签';
    $('#tag-input-panel').hidden = false; $('#tag-learning-panel').hidden = true; $('#tag-recommend-panel').hidden = true;
    $('#tag-input').value = ''; $('#tag-error').textContent = '';
    $('#tag-overlay').hidden = false; lockScroll(); $('#tag-input').focus();
  }
  function startTagLearning(event) {
    event.preventDefault();
    const tag = Array.from($('#tag-input').value.trim()).slice(0, 24).join('');
    if (!tag) { $('#tag-error').textContent = '请输入一个标签名称'; $('#tag-input').focus(); return; }
    state.pendingTag = tag;
    state.userTags = core.applyTag(state.userTags, [state.tagPhoto], tag); persist(); renderDetails(); renderGallery();
    $('#tag-input-panel').hidden = true; $('#tag-learning-panel').hidden = false;
    $('#tag-title').textContent = '越来越懂你的图库'; $('#tag-sheet').focus();
    const run = ++state.tagRun;
    state.tagTimer = setTimeout(() => {
      if (run !== state.tagRun || $('#tag-overlay').hidden) return;
      state.tagCandidates = core.tagSuggestions(state.data, state.tagPhoto, { ...visibleOptions(), tag, limit: 5 });
      $('#tag-learning-panel').hidden = true; $('#tag-recommend-panel').hidden = false;
      $('#tag-title').textContent = '让标签，多整理一点';
      $('#tag-recommend-caption').textContent = `“${tag}” · 另有 ${state.tagCandidates.length} 张关联图片`;
      $('#tag-recommend-grid').replaceChildren();
      for (const photo of state.tagCandidates) {
        const item = node('div', 'tag-recommend-item'); item.dataset.recommendId = photo.id;
        item.append(imageFor(photo), node('span', '', '✓')); $('#tag-recommend-grid').append(item);
      }
      $('#confirm-all-tags').textContent = state.tagCandidates.length ? `全部确认 · ${state.tagCandidates.length} 张` : '完成';
      $('#tag-sheet').focus();
    }, 1500);
  }
  function confirmTags() {
    const ids = state.tagCandidates.map(photo => photo.id);
    state.userTags = core.applyTag(state.userTags, ids, state.pendingTag); persist();
    const tag = state.pendingTag; closeTag(); renderDetails(); renderGallery();
    notify(ids.length ? `已为 ${ids.length} 张关联图片添加“${tag}”` : `标签“${tag}”已保存`);
  }
  function setupEvents() {
    $('#start-button').addEventListener('click', () => { renderImport(); showPage('import'); });
    $('#import-back').addEventListener('click', () => showPage('welcome'));
    $('#analysis-back').addEventListener('click', () => { stopAnalysis(); renderImport(); showPage('import'); });
    $('#import-grid').addEventListener('change', event => {
      const id = event.target.dataset.selectId; if (!id) return;
      if (event.target.checked) state.selected.add(id); else state.selected.delete(id); updateSelection();
    });
    $('#select-all').addEventListener('click', () => {
      state.selected = state.selected.size === state.data.photos.length ? new Set() : new Set(state.data.photos.map(photo => photo.id)); renderImport();
    });
    $('#analyze-button').addEventListener('click', runAnalysis);
    let searchTimer;
    $('#search-input').addEventListener('input', event => {
      clearTimeout(searchTimer); const value = event.target.value;
      searchTimer = setTimeout(() => setQuery(value), 120);
    });
    $('#search-input').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); clearTimeout(searchTimer);recordSearch(event.target.value); setQuery(event.target.value); event.target.blur(); } });
    $('#clear-search').addEventListener('click', () => { clearTimeout(searchTimer); setQuery(''); $('#search-input').focus(); });
    $('#clear-history').addEventListener('click',()=>{const before=[...state.searchHistory];state.searchHistory=[];persist();renderSearchDiscovery();notify('已清空最近搜索',()=>{state.searchHistory=before;persist();renderSearchDiscovery();notify('已恢复最近搜索');});});
    $('#empty-reset').addEventListener('click', () => { clearTimeout(searchTimer); setQuery(''); state.mode = 'photos'; state.category = 'all'; state.browseCategory = 'all'; renderGallery(); window.scrollTo(0,0); });
    $('#reimport-button').addEventListener('click', () => { state.selected = new Set(state.imported.length ? state.imported : state.data.photos.map(photo => photo.id)); renderImport(); showPage('import'); });
    $('#restore-button').addEventListener('click', () => { state.hidden.clear(); persist(); renderGallery(); notify('已恢复所有演示隐藏的图片'); });
    $('#cleanup-entry').addEventListener('click',()=>{state.mode='cleanup';renderGallery();window.scrollTo(0,0);});
    $('#cleanup-back').addEventListener('click',()=>{state.mode='albums';renderGallery();$('#cleanup-entry').focus();});
    $('#search-back').addEventListener('click',()=>{clearTimeout(searchTimer);$('#search-input').blur();setQuery('');state.mode=state.searchOrigin;renderGallery();document.querySelector(`[data-nav="${state.mode}"]`)?.focus();});
    document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => {
      clearTimeout(searchTimer);
      if (button.dataset.nav === 'search') { state.searchOrigin=state.mode==='albums'?'albums':'photos';state.mode='search';renderGallery();window.scrollTo(0,0);return; }
      setQuery(''); state.mode = button.dataset.nav; state.category = 'all'; state.browseCategory = 'all'; renderGallery(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
    $('#detail-close').addEventListener('click', closeDetails);
    $('#detail-overlay').addEventListener('click', event => { if (event.target === $('#detail-overlay')) closeDetails(); });
    $('#tag-close').addEventListener('click', closeTag);
    $('#tag-overlay').addEventListener('click', event => { if (event.target === $('#tag-overlay')) closeTag(); });
    $('#add-tag-button').addEventListener('click', openTag);
    $('#tag-form').addEventListener('submit', startTagLearning);
    $('#confirm-all-tags').addEventListener('click', confirmTags);
    $('#skip-tags').addEventListener('click', () => { closeTag(); renderDetails(); renderGallery(); });
    const updateKeyboard = () => {
      const viewport=window.visualViewport;
      const inset=viewport?Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop):0;
      document.documentElement.style.setProperty('--keyboard-inset',`${inset}px`);
    };
    window.visualViewport?.addEventListener('resize',updateKeyboard);
    window.visualViewport?.addEventListener('scroll',updateKeyboard);
    $('#search-input').addEventListener('focus',()=>{$('#page-gallery').classList.add('search-focused');updateKeyboard();});
    $('#search-input').addEventListener('blur',()=>{$('#page-gallery').classList.remove('search-focused');updateKeyboard();});
    // Keep the input focused until its button's click completes; otherwise blur
    // moves this bottom bar before pointerup and the first tap can be lost.
    $('#search-area').addEventListener('pointerdown',event=>{
      if(event.target.closest('button')) event.preventDefault();
    });
    $('#toast-action').addEventListener('click', () => { const action = state.toastAction; state.toastAction = null; if (action) action(); });
    document.addEventListener('keydown', event => {
      const active = !$('#tag-overlay').hidden ? $('#tag-sheet') : !$('#detail-overlay').hidden ? $('#detail-sheet') : null;
      if (!active) return;
      if (event.key === 'Escape') { event.preventDefault(); if (!$('#tag-overlay').hidden) closeTag(); else closeDetails(); }
      if (event.key === 'Tab') {
        const focusable = [...active.querySelectorAll('button:not(:disabled),input,summary,[tabindex="0"]')].filter(element => element.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (!first) { event.preventDefault(); active.focus(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === active)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === active)) { event.preventDefault(); first.focus(); }
      }
    });
  }
  function validateData(data) {
    if (!data || !Array.isArray(data.photos) || !data.photos.length || !Array.isArray(data.categories) || !data.search_mapping) throw new Error('本地图库数据不完整');
    const ids = new Set();
    for (const photo of data.photos) {
      if (!photo.id || ids.has(photo.id) || !data.categories.some(category => category.id === photo.category) ||
        ![photo.thumb, photo.full].every(value => typeof value === 'string' && value.startsWith('images/'))) throw new Error('本地图片记录有误');
      ids.add(photo.id);
    }
  }
  async function prepareOffline() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    try {
      await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      $('#cache-status').textContent = '本地资源已缓存 · 可离线体验';
    } catch (_) { $('#cache-status').textContent = '本地示例图库 · 无需上传'; }
  }
  async function init() {
    try {
      const response = await fetch('data.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('无法读取本地图库');
      const data = await response.json(); validateData(data); state.data = data;
      restore();
      state.selected = new Set(state.imported.length ? state.imported : data.photos.map(photo => photo.id));
      document.querySelectorAll('[data-hero]').forEach(image => {
        const choices = [data.photos[0], data.photos.find(photo => photo.category === 'order'), data.photos.find(photo => photo.category === 'festival')];
        image.src = (choices[Number(image.dataset.hero)] || data.photos[0]).thumb;
      });
      setupEvents(); $('#start-button').disabled = false;
      $('#load-status').textContent = `${data.photos.length} 张示例图片已就绪 · 6 个任务分类`;
      let resume = false;
      try { resume = sessionStorage.getItem(PAGE_KEY) === 'gallery' && state.imported.length > 0; } catch (_) {}
      if (resume) { renderGallery(); showPage('gallery'); }
      // Local-only images are warmed up so an already loaded demo remains usable on weak networks.
      data.photos.forEach(photo => { const image = new Image(); image.src = photo.full; });
      prepareOffline();
    } catch (error) {
      $('#load-status').textContent = '图库尚未就绪，请通过本地预览服务打开后重试。';
      $('#start-button').textContent = '重新加载'; $('#start-button').disabled = false;
      $('#start-button').addEventListener('click', () => location.reload(), { once: true });
      console.error('GalleryGo data loading:', error.message);
    }
  }
  init();
})();
