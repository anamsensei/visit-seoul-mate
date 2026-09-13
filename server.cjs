const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {createWeatherService,REGIONS}=require('./weather-api.cjs');
const weather=createWeatherService();
const {createCityService,AREAS}=require('./city-api.cjs');
const city=createCityService();
const {createVisitService}=require('./visit-api.cjs');
const visit=createVisitService();
const {createLocalDataService}=require('./local-data.cjs');
const local=createLocalDataService({visitService:visit});
const {createGeminiService}=require('./gemini-api.cjs');
const gemini=createGeminiService();
const {createPlaceResolver}=require('./place-resolver.cjs');
const placeResolver=createPlaceResolver(visit,gemini);
async function readJson(req){let body='';for await(const chunk of req){body+=chunk;if(body.length>20000)throw new Error('BODY_TOO_LARGE');}return JSON.parse(body||'{}');}
function createServer(){return http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  const allowedOrigins=new Set(['https://anamsensei.github.io',...(process.env.ALLOWED_ORIGIN||'').split(',').map(s=>s.trim()).filter(Boolean)]);
  if(origin&&allowedOrigins.has(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  if(req.method==='OPTIONS'){
    res.writeHead(204,{'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'});return res.end();
  }
  let url;try{url=new URL(req.url,'http://localhost');}catch{return reply(400,{error:'INVALID_REQUEST'});}
  if(req.method==='POST'&&url.pathname==='/api/places/resolve'){
    try {
      const parsed=await readJson(req); const text=String(parsed.text||'').trim();
      if(!text||text.length>600)return reply(400,{error:'TEXT_REQUIRED'});
      return reply(200,{mode:'gemini-visitseoul',source:'visitseoul-catalog',...(await placeResolver.resolveLive(text))});
    } catch(error) { return reply(error.message==='BODY_TOO_LARGE'?413:400,{error:error.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':'INVALID_REQUEST'}); }
  }
  if(req.method==='POST'&&url.pathname==='/api/interests/analyze'){
    if(!gemini.configured)return reply(503,{error:'GEMINI_NOT_CONFIGURED'});
    try{
      const body=await readJson(req);
      const selected=Array.isArray(body.selected)?body.selected.map(String).slice(0,12):[];
      const custom=String(body.custom||'').trim().slice(0,300),nationality=String(body.nationality||'').slice(0,80);
      if(!selected.length&&!custom)return reply(400,{error:'INTEREST_REQUIRED'});
      return reply(200,{mode:'live',source:'gemini',profile:await gemini.analyzeInterests({selected,custom,nationality})});
    }catch(error){return reply(error.message==='BODY_TOO_LARGE'?413:502,{error:error.message||'GEMINI_UNAVAILABLE'});}
  }
  if(req.method!=='GET')return reply(405,{error:'METHOD_NOT_ALLOWED'});
  if(url.pathname==='/health')return reply(200,{ok:true,build:'gemini-failover-20260912-1',geminiConfigured:gemini.configured,geminiModel:gemini.model,commit:process.env.RENDER_GIT_COMMIT||null});
  if(url.pathname==='/api/ai/status')return reply(200,{configured:gemini.configured,provider:'gemini',model:gemini.model});
  if(url.pathname==='/api/ai/test'){
    if(!gemini.configured)return reply(503,{ok:false,error:'GEMINI_NOT_CONFIGURED'});
    try{return reply(200,{ok:true,result:await gemini.normalizePlaces('Seonyudo Park')});}
    catch(error){return reply(502,{ok:false,error:error.message||'GEMINI_UNAVAILABLE'});}
  }
  if(url.pathname==='/api/city'){
    const area=url.searchParams.get('area');
    if(!AREAS.includes(area))return reply(400,{error:'INVALID_AREA'});
    try{return reply(200,await city(area));}catch{return reply(502,{error:'CITY_UNAVAILABLE'});}
  }
  if(url.pathname==='/api/weather'){
    const region=url.searchParams.get('region')||'hongdae';
    const hasPosition=url.searchParams.has('lat')||url.searchParams.has('lng');
    const position=hasPosition?{lat:Number(url.searchParams.get('lat')),lng:Number(url.searchParams.get('lng'))}:null;
    if(!Object.hasOwn(REGIONS,region)||hasPosition&&(!url.searchParams.has('lat')||!url.searchParams.has('lng')||!Number.isFinite(position.lat)||!Number.isFinite(position.lng)||position.lat<37.3||position.lat>37.8||position.lng<126.7||position.lng>127.3))return reply(400,{error:'INVALID_REGION'});
    try{return reply(200,await weather(region,position));}catch{return reply(502,{error:'WEATHER_UNAVAILABLE',message:'날씨 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.'});}
  }
  if(url.pathname==='/api/visit/status')return reply(200,{configured:visit.configured,mode:visit.configured?'live':'unconfigured',source:'visitseoul',message:visit.configured?'비짓서울 API 키가 설정되었습니다.':'Render 환경변수 VISITSEOUL_API_KEY가 필요합니다.'});
  if(url.pathname==='/api/visit/inventory'){
    if(!visit.configured)return reply(503,{mode:'unconfigured',source:'visitseoul',error:'VISITSEOUL_NOT_CONFIGURED'});
    const maxPages=Number(url.searchParams.get('maxPages')||50);
    try{return reply(200,await visit.inventory({maxPages}));}
    catch(error){return reply(502,{mode:'error',source:'visitseoul',error:error.message});}
  }
  if(url.pathname==='/api/local/status')return reply(200,{source:'local-signals',providers:local.configured,matchPolicy:'비짓서울 공식 콘텐츠와 매칭된 장소만 후보로 사용'});
  if(url.pathname==='/api/local/insights'){
    const query=(url.searchParams.get('query')||'').trim(); if(query.length<2)return reply(400,{error:'QUERY_REQUIRED'});
    try{return reply(200,{mode:'live',source:'local-signals',...(await local.matchOfficial(query,{categories:(url.searchParams.get('categories')||'').split(','),mood:url.searchParams.get('mood')||''}))});}
    catch(error){return reply(502,{mode:'error',source:'local-signals',error:error.message});}
  }
  if(url.pathname==='/api/visit/recommend'){
    const categories=(url.searchParams.get('categories')||'').split(',').map(s=>s.trim()).filter(Boolean);
    const interests=(url.searchParams.get('interests')||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,8);
    const visited=(url.searchParams.get('visited')||'').split(',').map(s=>s.trim()).filter(Boolean);
    const visitedNames=(url.searchParams.get('visitedNames')||'').split('|').map(s=>s.trim()).filter(Boolean).slice(0,30);
    const regions=(url.searchParams.get('regions')||'').split(',').map(s=>s.trim()).filter(Boolean);
    const region=url.searchParams.get('region')||'hongdae';
    const limit=Number(url.searchParams.get('limit')||5);
    const startHour=Number(url.searchParams.get('startHour')||11),duration=Number(url.searchParams.get('duration')||8);
    if(!Number.isInteger(limit)||limit<1||limit>7||!Number.isFinite(startHour)||startHour<0||startHour>23||![4,6,8,10,12].includes(duration)||startHour+duration>24)return reply(400,{error:'INVALID_SCHEDULE'});
    // Local insights has its own endpoint. It previously delayed this response without
    // affecting place selection; do not fail an official itinerary on social lookup failure.
    try{const result=await visit.recommend({region,regions,categories,interests,visited,visitedNames,limit,startHour,duration}); return reply(200,result);}
    catch(error){return reply(error.message==='VISITSEOUL_NOT_CONFIGURED'?503:502,{mode:'error',source:'visitseoul',error:error.message,message:'비짓서울 API에서 추천 데이터를 가져오지 못했습니다.'});}
  }
  if(url.pathname.startsWith('/api/visit/place/')){
    const id=decodeURIComponent(url.pathname.slice('/api/visit/place/'.length));
    if(!id)return reply(400,{error:'INVALID_CONTENT_ID'});
    try{return reply(200,await visit.detail(id));}catch(error){return reply(error.message==='VISITSEOUL_NOT_CONFIGURED'?503:502,{mode:'error',source:'visitseoul',error:error.message});}
  }
  if(url.pathname==='/api/places/status')return reply(200,{mode:'demo'});
  const staticFiles={
    '/':'index.html','/index.html':'index.html','/visit-ui.js':'visit-ui.js','/kakao-integration.js':'kakao-integration.js','/city-ui.js':'city-ui.js','/weather-ui.js':'weather-ui.js',
    '/city.css':'city.css','/weather.css':'weather.css'
  };
  if(staticFiles[url.pathname]){
    const file=staticFiles[url.pathname];
    const contentType=file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8';
    res.writeHead(200,{'Content-Type':contentType,'Cache-Control':'no-store'});
    fs.createReadStream(path.join(__dirname,file)).pipe(res);return;
  }
  reply(404,{error:'NOT_FOUND'});
});}
if(require.main===module){const port=Number(process.env.PORT||3003);createServer().listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Seoulmate API: http://127.0.0.1:${port}`));}
module.exports={createServer};


