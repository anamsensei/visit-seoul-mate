const CATEGORY_CODES = {
  '문화관광':'Ca0o2d4','쇼핑':'Cu8e6t5','숙박':'Ch4v8z7','역사관광':'Ca1z6p7',
  '음식':'Cl9s3y9','자연관광':'Co6c2n2','체험관광':'Cc9i5o2','축제/공연/행사':'Cv7s8m5'
};
const clean = value => String(value ?? '').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const words = text => clean(text).toLowerCase().split(/[^가-힣a-z0-9]+/).filter(w=>w.length>=2);

function createLocalDataService({ fetchImpl=globalThis.fetch, visitService }={}) {
  const naverId=process.env.NAVER_CLIENT_ID||'', naverSecret=process.env.NAVER_CLIENT_SECRET||'';
  const xToken=process.env.X_BEARER_TOKEN||process.env.TWITTER_BEARER_TOKEN||'';
  const configured={naver:Boolean(naverId&&naverSecret), x:Boolean(xToken), instagram:Boolean(process.env.INSTAGRAM_ACCESS_TOKEN)};
  async function naver(query){
    if(!configured.naver)return [];
    const url='https://openapi.naver.com/v1/search/blog.json?display=100&sort=date&query='+encodeURIComponent(query);
    const r=await fetchImpl(url,{headers:{'X-Naver-Client-Id':naverId,'X-Naver-Client-Secret':naverSecret},signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw new Error(`NAVER_${r.status}`); const json=await r.json();
    return (json.items||[]).map(item=>({provider:'naver-blog',title:clean(item.title),text:clean(item.title+' '+item.description),date:item.postdate||'',url:item.link}));
  }
  async function x(query){
    if(!configured.x)return [];
    const url='https://api.x.com/2/tweets/search/recent?max_results=100&tweet.fields=created_at,lang,text&query='+encodeURIComponent(`(${query}) lang:ko -is:retweet`);
    const r=await fetchImpl(url,{headers:{Authorization:'Bearer '+xToken},signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw new Error(`X_${r.status}`); const json=await r.json();
    return (json.data||[]).map(item=>({provider:'x',title:clean(item.text).slice(0,100),text:clean(item.text),date:item.created_at||'',url:''}));
  }
  async function collect(query){
    const jobs=await Promise.allSettled([naver(query),x(query)]); const posts=jobs.flatMap(j=>j.status==='fulfilled'?j.value:[]);
    const failed=jobs.flatMap((j,i)=>j.status==='rejected'?[i===0?'naver-blog':'x']:[]);
    return {query,posts,providers:configured,failed};
  }
  async function matchOfficial(query,{categories=[]}={}){
    if(!visitService?.configured)return {matches:[],reason:'VISITSEOUL_NOT_CONFIGURED'};
    const local=await collect(query); const wanted=categories.filter(c=>CATEGORY_CODES[c]);
    const cats=wanted.length?wanted:Object.keys(CATEGORY_CODES); const official=[];
    for(const category of cats){try{official.push(...await visitService.list({categoryCode:CATEGORY_CODES[category],keyword:''}));}catch{}}
    const counts=new Map();
    for(const item of local.posts){const ws=words(item.text); for(const place of official){const titleWords=words(place.title); const hit=titleWords.some(w=>ws.includes(w))||clean(item.text).includes(place.title); if(hit){const row=counts.get(place.id)||{place,mentions:0,providers:new Set(),examples:[]}; row.mentions++;row.providers.add(item.provider);if(row.examples.length<3)row.examples.push(item);counts.set(place.id,row);}}}
    return {query,posts:local.posts.length,failedProviders:local.failed,matches:[...counts.values()].sort((a,b)=>b.mentions-a.mentions).map(r=>({...r,providers:[...r.providers]}))};
  }
  return {configured,collect,matchOfficial};
}
module.exports={createLocalDataService};
