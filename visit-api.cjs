const CATEGORY_CODES = Object.freeze({
  '문화관광': 'Ca0o2d4',
  '쇼핑': 'Cu8e6t5',
  '숙박': 'Ch4v8z7',
  '역사관광': 'Ca1z6p7',
  '음식': 'Cl9s3y9',
  '자연관광': 'Co6c2n2',
  '체험관광': 'Cc9i5o2',
  '축제/공연/행사': 'Cv7s8m5'
});

const REGION_KEYWORDS = Object.freeze({
  hongdae: ['홍대', '연남', '합정'], yeonhui: ['연희', '연남'], suyu: ['수유', '우이'],
  jongno_hyehwa: ['혜화', '대학로', '종로'], gangnam: ['강남', '압구정', '도산'],
  seongsu: ['성수', '서울숲'], seochon: ['서촌', '통인', '부암'],
  euljiro: ['을지로', '신당', '청계천'], jamsil: ['잠실', '송리단', '석촌']
});

const CATEGORY_BY_CODE = Object.fromEntries(Object.entries(CATEGORY_CODES).map(([label, code]) => [code, label]));
const DEFAULT_BASE = 'https://api-call.visitseoul.net';
const LIST_PATH = '/api/v1/contents/list';
const INFO_PATH = '/api/v1/contents/info';

const text = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const first = (...values) => values.find(value => value !== undefined && value !== null && String(value).trim() !== '');
const number = value => { const n = Number(value); return Number.isFinite(n) ? n : null; };
const safeUrl = value => { try { const u = new URL(String(value)); return /^https?:$/.test(u.protocol) ? u.toString() : ''; } catch { return ''; } };
function distanceKm(a, b) { const rad = Math.PI / 180, p = (b.lat - a.lat) * rad, q = (b.lng - a.lng) * rad; const h = Math.sin(p / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(q / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h))); }
function orderRoute(places) { if (places.length < 2) return places; const remaining = places.slice(); const ordered = [remaining.shift()]; while (remaining.length) { const last = ordered.at(-1); let best = 0, score = Infinity; remaining.forEach((p, i) => { const d = distanceKm(last, p); if (d < score) { score = d; best = i; } }); ordered.push(remaining.splice(best, 1)[0]); } return ordered.map((p, i) => ({ ...p, routeOrder: i + 1 })); }
function arrangeMealStops(places) {
  const food = places.filter(p => p.category === '음식');
  const lunch = food[0] ? { ...food[0], mealSlot: 'lunch', preferredStart: 13 } : null;
  const dinner = food[1] ? { ...food[1], mealSlot: 'dinner', preferredStart: 18 } : null;
  const nonFood = places.filter(p => p !== food[0] && p !== food[1]);
  const ordered = [];
  if (nonFood.length) ordered.push(nonFood.shift());
  if (lunch) ordered.push(lunch);
  while (nonFood.length && ordered.length < places.length - (dinner ? 1 : 0)) ordered.push(nonFood.shift());
  if (dinner) ordered.push(dinner);
  return ordered.map((p, i) => ({ ...p, routeOrder: i + 1 }));
}

function normalizeListItem(item) {
  if (!item || typeof item !== 'object') return null;
  const categoryCode = first(item.com_ctgry_sn, item.comCtgrySn, item.category_code);
  const categoryPath = text(first(item.cate_depth, item.category, item.category_name));
  const category = CATEGORY_BY_CODE[categoryCode] || Object.keys(CATEGORY_CODES).find(k => categoryPath.includes(k)) || '문화관광';
  const id = text(first(item.cid, item.content_id, item.contentId, item.id));
  const title = text(first(item.post_sj, item.title, item.name, item.content_name));
  if (!id || !title) return null;
  return { id, title, desc: text(first(item.sumry, item.summary, item.desc, item.description)), category, categoryCode,
    photo: safeUrl(first(item.main_img, item.mainImage, item.image_url, item.thumbnail)),
    updatedAt: text(first(item.updt_dt_text, item.updated_at, item.updateDate)),
    languages: text(item.multi_lang_list) };
}

function normalizeDetail(raw, fallback = {}) {
  const item = raw?.data || raw?.result?.data || raw?.result || raw?.content || raw;
  if (!item || typeof item !== 'object') return null;
  const traffic = item.traffic || {};
  const extra = item.extra || {};
  const categoryCode = first(item.com_ctgry_sn, fallback.categoryCode);
  const categoryPath = text(first(item.cate_depth, fallback.category));
  const category = CATEGORY_BY_CODE[categoryCode] || Object.keys(CATEGORY_CODES).find(k => categoryPath.includes(k)) || fallback.category || '문화관광';
  const id = text(first(item.cid, fallback.id));
  const title = text(first(item.post_sj, fallback.title));
  if (!id || !title) return null;
  const tags = Array.isArray(item.tag) ? item.tag.map(text).filter(Boolean) : text(item.tag).split(/[,|]/).map(text).filter(Boolean);
  return { ...fallback, id, source: 'visitseoul', title,
    desc: text(first(item.sumry, item.post_desc, fallback.desc)),
    tag: tags.length ? '#' + tags.slice(0, 3).join(' #') : '#' + category,
    category, categoryCode,
    photo: safeUrl(first(item.main_img, fallback.photo)),
    photos: [item.main_img, ...(Array.isArray(item.relate_img) ? item.relate_img : [])].map(safeUrl).filter(Boolean),
    address: text(first(traffic.new_adres, traffic.adres, item.address)),
    lat: number(first(traffic.map_position_y, item.latitude, item.lat)),
    lng: number(first(traffic.map_position_x, item.longitude, item.lng)),
    hours: text(first(extra.cmmn_use_time, item.hours)),
    closed: text(first(extra.closed_days, item.closed_days)),
    transport: text(first(traffic.subway_info, item.transport)),
    detailUrl: `https://visitseoul.net/contents/${encodeURIComponent(id)}`,
    languages: text(first(item.multi_lang_list, fallback.languages)),
    apiUpdatedAt: text(first(item.updt_dt_text, fallback.updatedAt)) };
}

function extractList(json) {
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.contents)) return json.contents;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.result?.data)) return json.result.data;
  if (Array.isArray(json?.result?.contents)) return json.result.contents;
  return [];
}

function createVisitService(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const key = options.apiKey ?? process.env.VISITSEOUL_API_KEY ?? process.env.VISIT_SEOUL_API_KEY ?? '';
  const base = (options.baseUrl || process.env.VISITSEOUL_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
  const ttl = Number(options.cacheTtlMs || process.env.VISITSEOUL_CACHE_TTL_MS || 600000);
  const listCache = new Map(); const detailCache = new Map();
  const configured = Boolean(key);
  if (typeof fetchImpl !== 'function') throw new Error('FETCH_UNAVAILABLE');

  async function requestJson(url, init) {
    const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`VISITSEOUL_${response.status}`);
    const json = await response.json();
    if (json.result_code != null && Number(json.result_code) !== 200) {
      const code = Number(json.result_code);
      throw new Error(Number.isInteger(code) ? `VISITSEOUL_${code}` : 'VISITSEOUL_INVALID_RESPONSE');
    }
    return json;
  }
  async function list({ categoryCode, keyword = '', page = 1 } = {}) {
    if (!configured) throw new Error('VISITSEOUL_NOT_CONFIGURED');
    const cacheKey = JSON.stringify([categoryCode, keyword, page]); const cached = listCache.get(cacheKey);
    if (cached && Date.now() - cached.at < ttl) return cached.value;
    const body = { lang_code_id: 'ko', sort_type: 'latest', page_no: page };
    if (categoryCode) body.com_ctgry_sn = categoryCode; if (keyword) body.keyword = keyword;
    const json = await requestJson(base + LIST_PATH, { method: 'POST', headers: { Accept: 'application/json;charset=UTF-8', 'Content-Type': 'application/json;charset=UTF-8', 'VISITSEOUL-API-KEY': key }, body: JSON.stringify(body) });
    if (!Array.isArray(json.data)) throw new Error('VISITSEOUL_INVALID_RESPONSE');
    const value = extractList(json).map(normalizeListItem).filter(Boolean); listCache.set(cacheKey, { at: Date.now(), value }); return value;
  }
  async function detail(id, fallback = {}) {
    if (!configured) throw new Error('VISITSEOUL_NOT_CONFIGURED');
    const cached = detailCache.get(id); if (cached && Date.now() - cached.at < ttl) return cached.value;
    const json = await requestJson(base + INFO_PATH, { method: 'POST', headers: { Accept: 'application/json;charset=UTF-8', 'Content-Type': 'application/json;charset=UTF-8', 'VISITSEOUL-API-KEY': key }, body: JSON.stringify({ cid: id }) });
    const value = normalizeDetail(json, fallback); if (!value) throw new Error('VISITSEOUL_INVALID_DETAIL'); detailCache.set(id, { at: Date.now(), value }); return value;
  }
  async function recommend({ region = 'hongdae', categories = [], visited = [], limit = 5 } = {}) {
    if (!configured) return { mode: 'unconfigured', source: 'visitseoul', places: [], message: 'Render에 VISITSEOUL_API_KEY를 설정해주세요.' };
    const wanted = categories.filter(category => CATEGORY_CODES[category]).length ? categories.filter(category => CATEGORY_CODES[category]) : ['문화관광', '음식', '체험관광'];
    // 하루 코스에는 식사 슬롯을 항상 확보하되, 음식 장소는 점심·저녁 최대 1곳씩만 사용합니다.
    const fetchCategories = [...new Set([...wanted, '음식'])];
    const visitedSet = new Set(visited.map(String)); const words = REGION_KEYWORDS[region] || [];
    const regionalKeyword = words[0] || '';
    const failures = [];
    const failedCategories = new Set();
    let successfulLists = 0;
    async function collectLists(keyword) {
      const results = await Promise.allSettled(fetchCategories.map(category => list({ categoryCode: CATEGORY_CODES[category], keyword })));
      return results.flatMap((result, i) => {
        if (result.status === 'fulfilled') { successfulLists++; return [result.value]; }
        failures.push(result.reason); failedCategories.add(fetchCategories[i]); return [];
      });
    }
    const lists = await collectLists(regionalKeyword);
    const candidates = new Map(); lists.flat().forEach(item => { if (!visitedSet.has(item.id) && !candidates.has(item.id)) candidates.set(item.id, item); });
    // 지역 키워드 검색 결과가 적을 때만 같은 카테고리의 공식 목록으로 보충합니다.
    if (candidates.size < limit) {
      const broad = await collectLists('');
      broad.flat().forEach(item => { if (!visitedSet.has(item.id) && !candidates.has(item.id)) candidates.set(item.id, item); });
    }
    if (!successfulLists && failures.length) throw failures[0];
    const scored = [...candidates.values()].map(item => {
      const hay = `${item.title} ${item.desc}`; const hits = words.filter(word => hay.includes(word)).length;
      return { item, score: hits * 5 + (wanted.includes(item.category) ? 2 : 0) };
    }).sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'ko'));
    const detailSelected = scored.slice(0, Math.max(limit * 2, limit));
    const detailResults = await Promise.allSettled(detailSelected.map(({ item }) => detail(item.id, item)));
    const detailed = detailResults.flatMap(result => {
      if (result.status === 'fulfilled') return [result.value];
      failures.push(result.reason); return [];
    });
    if (detailSelected.length && !detailed.length && failures.length) throw failures.at(-1);
    const places = detailed.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng)).map((p, index) => ({ ...p, relevance: scored[index]?.score || 0, travelTime: 8, transit: '다음 장소까지 이동', congestion: null }));
    const regional = places.filter(p => words.some(word => `${p.title} ${p.desc} ${p.address}`.includes(word)));
    const ranked = (regional.length >= Math.min(2, limit) ? regional : places);
    const food = ranked.filter(p => p.category === '음식');
    const nonFood = ranked.filter(p => p.category !== '음식');
    const mealPlaces = food.slice(0, 2);
    const selected = [...nonFood.slice(0, Math.max(0, limit - mealPlaces.length)), ...mealPlaces].slice(0, limit);
    const withMeals = arrangeMealStops(selected);
    return { mode: 'live', source: 'visitseoul', region, categories: [...new Set([...wanted, '음식'])], places: withMeals, partial: failures.length > 0, failedCategories: [...failedCategories], generatedAt: new Date().toISOString() };
  }
  return { configured, list, detail, recommend, categories: CATEGORY_CODES };
}

module.exports = { CATEGORY_CODES, REGION_KEYWORDS, normalizeListItem, normalizeDetail, extractList, createVisitService };
