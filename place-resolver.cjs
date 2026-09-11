// Multilingual place resolver. The returned IDs are restricted to the Visit Seoul
// catalog used by the Step 2 UI, so free-form input cannot introduce outside places.
const PLACES = Object.freeze([
  ['myeongdong','명동 쇼핑거리','중구','Myeongdong|Myeongdong Shopping Street|明洞|明洞购物街|明洞ショッピング通り'],
  ['gyeongbokgung','경복궁 · 광화문','종로구','Gyeongbokgung|Gyeongbokgung Palace|景福宮|景福宫|경복궁|광화문|Gwanghwamun|พระราชวังคยองบกกุง'],
  ['nseoul','N서울타워 (남산)','용산구','N Seoul Tower|Namsan Tower|南山塔|Nソウルタワー|남산타워|엔서울타워'],
  ['bukchon','북촌한옥마을','종로구','Bukchon Hanok Village|Bukchon Hanok|北村韓屋村|北村韩屋村|北村韓屋マウル'],
  ['hongdae-street','홍대 걷고싶은거리','마포구','Hongdae walking street|Hongdae Street|홍대 걷고 싶은 거리|弘大步行街|弘大'],
  ['ddp','동대문 DDP','중구','DDP|Dongdaemun Design Plaza|東大門デザインプラザ|东大门设计广场|동대문디자인플라자'],
  ['lotte','롯데월드타워','송파구','Lotte World Tower|Lotte Tower|ロッテワールドタワー|乐天世界塔|樂天世界塔'],
  ['ssamzigil','인사동 쌈지길','종로구','Ssamzigil|Ssamziegil|Insadong Ssamziegil|サムジキル|쌈지길'],
  ['yeouido','여의도 한강공원','영등포구','Yeouido Hangang Park|Yeouido Han River Park|汝矣島漢江公園|汝矣岛汉江公园'],
  ['gwangjang','광장시장','종로구','Gwangjang Market|広蔵市場|廣藏市場|广藏市场'],
  ['seoulforest','서울숲','성동구','Seoul Forest|ソウルの森|首尔林|首爾林'],
  ['nationalmuseum','국립중앙박물관','용산구','National Museum of Korea|국립중앙박물관|国立中央博物館|國立中央博物館'],
  ['coexlibrary','별마당 도서관','강남구','Starfield Library|COEX Library|별마당|星空图书馆|ピョルマダン図書館'],
  ['deoksugung','덕수궁','중구','Deoksugung|徳寿宮|德寿宫|德壽宮'],
  ['changdeokgung','창덕궁','종로구','Changdeokgung|昌徳宮|昌德宫|昌德宮']
].map(([id,name,area,aliases]) => ({id,name,area,aliases:aliases.split('|')})));

const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
const catalog = PLACES.map(p => ({...p, keys:[p.name,...p.aliases].map(normalize)}));
const EXTRA_ALIASES = Object.freeze({
  '선유도공원':['Seonyudo Park','Seonyudo Island'],'문화비축기지':['Oil Tank Culture Park'],
  '서울식물원':['Seoul Botanic Park','Seoul Botanical Garden'],'망원시장':['Mangwon Market'],
  '노들섬':['Nodeulseom Island','Nodeul Island'],'서울로7017':['Seoullo 7017','Seoul Skygarden'],
  '익선동':['Ikseon-dong','Ikseon Hanok Village'],'서촌':['Seochon Village','Seochon'],
  '이화벽화마을':['Ihwa Mural Village','Ihwa-dong Mural Village']
});

function score(input, place) {
  const q = normalize(input); if (!q) return 0;
  if (place.keys.includes(q)) return 100;
  let best = 0;
  for (const key of place.keys) {
    if (q.includes(key) || key.includes(q)) best = Math.max(best, 80 * Math.min(q.length,key.length) / Math.max(q.length,key.length));
    const chars = [...new Set([...q].filter(c => key.includes(c)))].length;
    best = Math.max(best, 55 * chars / Math.max([...new Set([...q])].length, 1));
  }
  return best;
}

function resolve(text) {
  const inputs = String(text ?? '').split(/[,，、;；\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 12);
  return inputs.map(input => {
    const ranked = catalog.map(place => ({place, score:score(input, place)})).sort((a,b) => b.score-a.score);
    const ids = ranked.filter(x => x.score >= 72).slice(0, 3).map(x => x.place.id);
    return {input, ids};
  });
}

function createPlaceResolver(visitService) {
  let livePromise;
  async function liveCatalog() {
    if (!visitService?.configured) return catalog;
    if (!livePromise) livePromise = visitService.inventory({maxPages:50}).then(async data => {
      let rows = Array.isArray(data?.places) ? data.places : [];
      // 구버전 백엔드가 inventory에 장소 배열을 포함하지 않아도 직접 목록을 보완합니다.
      if (!rows.length && visitService.list) {
        const jobs=[]; for (const categoryCode of Object.values(visitService.categories||{})) for (let page=1; page<=5; page++) jobs.push({categoryCode,page});
        const found=[]; for (const job of jobs) { try { found.push(...await visitService.list(job)); } catch {} }
        rows=found;
      }
      const merged = rows.map(p => {
        const name=String(p.title||p.name||'');
        const extra=Object.entries(EXTRA_ALIASES).filter(([ko])=>normalize(name).includes(normalize(ko))).flatMap(([,a])=>a);
        return {id:String(p.id),name,area:String(p.address||'미분류'),aliases:[p.title,p.address,p.languages,...(EXTRA_ALIASES[name]||[]),...extra].filter(Boolean).map(String)};
      }).filter(p=>p.id&&p.name);
      if (!merged.length) return catalog;
      const byId=new Map(catalog.map(p=>[p.id,p]));
      for (const p of merged) { const old=byId.get(p.id); const aliases=[...(old?.aliases||[]),...p.aliases]; byId.set(p.id,{...p,aliases:[...new Set(aliases)],keys:[p.name,...aliases].map(normalize)}); }
      return [...byId.values()];
    }).catch(() => catalog);
    return livePromise;
  }
  async function resolveLive(text) {
    const source = await liveCatalog();
    const inputs = String(text ?? '').split(/[,，、;；\n]+/).map(s=>s.trim()).filter(Boolean).slice(0,12);
    return {results:inputs.map(input=>({input,ids:source.map(p=>({p,score:score(input,p)})).sort((a,b)=>b.score-a.score).filter(x=>x.score>=72).slice(0,3).map(x=>x.p.id)})),places:source.map(({id,name,area})=>({id,name,area}))};
  }
  return {resolveLive};
}

module.exports = {catalog, resolve, createPlaceResolver};
