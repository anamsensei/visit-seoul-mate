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
  seongsu: ['성수', '서울숲'], seochon: ['서촌', '통인', '부암', '경복궁', '안국'],
  euljiro: ['을지로', '신당', '청계천', '충무로', '종로', '명동'], jamsil: ['잠실', '송리단', '석촌']
});
const DISTRICT_KEYWORDS = Object.freeze({
  '강남구':['강남','압구정','청담','삼성','개포'], '강동구':['강동','천호','암사','고덕'], '강북구':['강북','수유','미아','우이'],
  '강서구':['강서','마곡','발산','김포공항'], '관악구':['관악','신림','서울대입구','낙성대'], '광진구':['광진','건대','구의','군자','어린이대공원'],
  '구로구':['구로','신도림','구로디지털'], '금천구':['금천','가산디지털','독산'], '노원구':['노원','상계','공릉'], '도봉구':['도봉','창동','쌍문'],
  '동대문구':['동대문','회기','청량리','장한평'], '동작구':['동작','노량진','사당'], '마포구':['마포','홍대','연남','합정','망원'],
  '서대문구':['서대문','연희','신촌','이대'], '서초구':['서초','양재','반포','고속터미널'], '성동구':['성동','성수','서울숲','뚝섬','왕십리'],
  '성북구':['성북','성신여대','길음'], '송파구':['송파','잠실','석촌','송리단','가락'], '양천구':['양천','목동','오목교','신정'],
  '영등포구':['영등포','여의도','문래','당산'], '용산구':['용산','이태원','한남','서울역','삼각지'], '은평구':['은평','연신내','불광'],
  '종로구':['종로','혜화','대학로','서촌','북촌','인사동','광화문'], '중구':['중구','을지로','명동','남대문','충무로','신당'], '중랑구':['중랑','망우','면목']
});

const CATEGORY_BY_CODE = Object.fromEntries(Object.entries(CATEGORY_CODES).map(([label, code]) => [code, label]));
const DEFAULT_BASE = 'https://api-call.visitseoul.net';
const LIST_PATH = '/api/v1/contents/list';
const INFO_PATH = '/api/v1/contents/info';

const text = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const first = (...values) => values.find(value => value !== undefined && value !== null && String(value).trim() !== '');
const number = value => { if(value == null || String(value).trim() === '')return null; const n = Number(value); return Number.isFinite(n) ? n : null; };
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
  return { id, title, desc: text(first(item.sumry, item.summary, item.desc, item.description)), category, categoryCode, categoryPath,
    address: text(first(item.traffic?.new_adres, item.traffic?.adres, item.roadAddress, item.road_address, item.address)),
    photo: safeUrl(first(item.main_img, item.mainImage, item.image_url, item.thumbnail)),
    lat: number(first(item.traffic?.map_position_y,item.map_position_y, item.latitude, item.lat, item.map_y)), lng: number(first(item.traffic?.map_position_x,item.map_position_x, item.longitude, item.lng, item.map_x)),
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
    category, categoryCode, categoryPath: text(first(item.cate_depth,fallback.categoryPath)),
    photo: safeUrl(first(item.main_img, fallback.photo)),
    photos: [item.main_img, ...(Array.isArray(item.relate_img) ? item.relate_img : [])].map(safeUrl).filter(Boolean),
    address: text(first(traffic.new_adres, traffic.adres, item.address)),
    lat: number(first(traffic.map_position_y, item.latitude, item.lat, fallback.lat)),
    lng: number(first(traffic.map_position_x, item.longitude, item.lng, fallback.lng)),
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
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(7000) });
        if (!response.ok) {
          const error = new Error(`VISITSEOUL_${response.status}`);
          if (![408, 425, 429, 500, 502, 503, 504].includes(response.status)) throw error;
          lastError = error;
        } else {
          const json = await response.json();
          if (json.result_code != null && Number(json.result_code) !== 200) {
            const code = Number(json.result_code);
            const error = new Error(Number.isInteger(code) ? `VISITSEOUL_${code}` : 'VISITSEOUL_INVALID_RESPONSE');
            if (code !== 408 && code !== 429 && code < 500) throw error;
            lastError = error;
          } else {
            return json;
          }
        }
      } catch (error) {
        lastError = error;
        if (!/VISITSEOUL_(408|425|429|5\d\d)|TIMEOUT|timed? ?out/i.test(String(error?.message || error))) throw error;
      }
      if (attempt < 1) await new Promise(resolve => setTimeout(resolve, 350));
    }
    throw lastError || new Error('VISITSEOUL_REQUEST_FAILED');
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
  const SEOUL_DISTRICTS = Object.freeze(['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구']);
  function districtOf(address='') { return SEOUL_DISTRICTS.find(d => String(address).includes(d)) || '미분류'; }
  async function inventory({ maxPages = 50 } = {}) {
    if (!configured) return { mode:'unconfigured', source:'visitseoul', total:0, districts:{}, categories:{} };
    const places = new Map(), failures = [];
    for (const [category, categoryCode] of Object.entries(CATEGORY_CODES)) {
      let empty = 0;
      for (let page = 1; page <= Math.max(1, Math.min(100, Number(maxPages) || 50)); page += 1) {
        try {
          const rows = await list({ categoryCode, page });
          if (!rows.length) { empty += 1; if (empty >= 1) break; }
          for (const place of rows) if (place?.id && !places.has(place.id)) places.set(place.id, place);
        } catch (error) { failures.push({ category, page, error: error.message }); break; }
      }
    }
    const districts = Object.fromEntries(SEOUL_DISTRICTS.map(d => [d, { total:0, categories:Object.fromEntries(Object.keys(CATEGORY_CODES).map(c => [c,0])) }]));
    districts['미분류'] = { total:0, categories:{} };
    const categories = Object.fromEntries(Object.keys(CATEGORY_CODES).map(c => [c,0]));
    for (const place of places.values()) {
      const district = districtOf(place.address); const row = districts[district] || (districts[district] = { total:0, categories:{} });
      row.total += 1; row.categories[place.category] = (row.categories[place.category] || 0) + 1;
      categories[place.category] = (categories[place.category] || 0) + 1;
    }
    return { mode:'live', source:'visitseoul', total:places.size, categories, districts, failures, generatedAt:new Date().toISOString() };
  }
  async function recommend({ region = 'hongdae', regions = [], categories = [], visited = [], limit = 5, startHour=11, duration=8 } = {}) {
    if (!configured) return { mode: 'unconfigured', source: 'visitseoul', places: [] };
    const {selectItinerary,valid,restaurant,km,CENTERS}=require('./itinerary.cjs');
    const wanted=[...new Set(categories.filter(c=>CATEGORY_CODES[c]))];
    if(!wanted.length)wanted.push('문화관광','음식','체험관광');
    limit=Math.min(5,Math.max(1,Number(limit)||5));
    const selectedRegions=[...new Set((regions.length?regions:[region]).filter(Boolean))];
    const words=[...new Set(selectedRegions.flatMap(r=>DISTRICT_KEYWORDS[r]||REGION_KEYWORDS[r]||[r]).concat(REGION_KEYWORDS[region]||[]))];
    const excluded=new Set(visited.map(String));
    const candidates=new Map(),usable=new Map(),attempted=new Set(),failedCategories=new Set();
    const diagnostics={listRequests:0,listFailures:0,detailRequests:0,detailFailures:0,invalidCoordinates:0,filteredVisited:0};
    const deadline=Date.now()+65000;let successfulLists=0,lastError;
    async function parallel(items,fn){let cursor=0;await Promise.all(Array.from({length:Math.min(4,items.length)},async()=>{while(cursor<items.length&&Date.now()<deadline){const item=items[cursor++];await fn(item);}}));}
    async function collect(jobs){await parallel(jobs,async job=>{
      diagnostics.listRequests++;
      try{const rows=await list(job);successfulLists++;
        for(const p of rows){if(excluded.has(p.id)){diagnostics.filteredVisited++;continue;}if(!candidates.has(p.id))candidates.set(p.id,p);}
      }catch(e){lastError=e;diagnostics.listFailures++;if(job.categoryCode)failedCategories.add(CATEGORY_BY_CODE[job.categoryCode]);}
    });}
    const relevance=p=>words.filter(w=>[p.title,p.desc,p.address].join(' ').includes(w)).length*5+(wanted.includes(p.category)?2:0);
    async function hydrate(){
      // Interleave categories so restaurants cannot consume the entire detail budget.
      const groups=new Map();
      for(const p of [...candidates.values()].filter(p=>!attempted.has(p.id)).sort((a,b)=>relevance(b)-relevance(a))){if(!groups.has(p.category))groups.set(p.category,[]);groups.get(p.category).push(p);}
      const queue=[];while([...groups.values()].some(g=>g.length)){for(const g of groups.values())if(g.length)queue.push(g.shift());}
      let stageAttempts=0;
      for(let offset=0;offset<queue.length&&attempted.size<80&&stageAttempts<24&&Date.now()<deadline;offset+=8){
        await parallel(queue.slice(offset,offset+Math.min(8,80-attempted.size)),async p=>{
          const center=CENTERS[region]||CENTERS.hongdae;
          if(restaurant(p)&&[...usable.values()].filter(v=>restaurant(v)&&km({lat:center[0],lng:center[1]},v)<=5).length>=2)return;
          stageAttempts++;
          attempted.add(p.id);diagnostics.detailRequests++;
          let d;try{d=await detail(p.id,p);}catch(e){lastError=e;diagnostics.detailFailures++;if(valid(p))d={...p,source:'visitseoul',detailUnavailable:true};}
          if(valid(d))usable.set(d.id,{...d,relevance:relevance(d),congestion:null});else diagnostics.invalidCoordinates++;
        });
        if(selectItinerary([...usable.values()],{region,limit,startHour,duration}).complete)break;
      }
    }
    const selectedCategories=[...new Set([...wanted,'음식'])];
    const stages=[
      selectedCategories.map(c=>({categoryCode:CATEGORY_CODES[c],keyword:words[0],page:1})),
      // Category-free regional search also recovers from a failing category endpoint.
      words.map(keyword=>({keyword,page:1})),
      words.flatMap(keyword=>[2,3].map(page=>({keyword,page}))),
      [...new Set([...selectedCategories,'문화관광','쇼핑','역사관광','자연관광','체험관광'])].map(c=>({categoryCode:CATEGORY_CODES[c],keyword:'',page:1}))
    ];
    let result={places:[],complete:false};
    for(const jobs of stages){
      await collect(jobs);await hydrate();
      result=selectItinerary([...usable.values()],{region,limit,startHour,duration});
      if(result.complete||Date.now()>=deadline)break;
    }
    if(!successfulLists&&lastError)throw lastError;
    if(candidates.size&&!usable.size&&lastError)throw lastError;
    return {mode:'live',source:'visitseoul',region,regions:selectedRegions,categories:wanted,places:result.places,
      complete:result.complete,requestedCount:limit,partial:diagnostics.listFailures+diagnostics.detailFailures>0,
      failedCategories:[...failedCategories],expandedArea:result.expandedArea,
      schedule:{startHour,duration,missingMeals:result.missingMeals,travelMethod:'좌표 거리 기반 도보 추정',hoursVerified:false},
      diagnostics:{...diagnostics,candidates:candidates.size,usable:usable.size,selected:result.places.length,budgetExceeded:Date.now()>=deadline},
      generatedAt:new Date().toISOString()};
  }
  return { configured, list, detail, inventory, recommend, categories: CATEGORY_CODES };
}

module.exports = { CATEGORY_CODES, REGION_KEYWORDS, DISTRICT_KEYWORDS, normalizeListItem, normalizeDetail, extractList, createVisitService };


