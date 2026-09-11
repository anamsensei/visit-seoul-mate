const AREA_CODES={'연남동':'POI073','홍대 관광특구':'POI007','광화문·덕수궁':'POI009','서울숲공원':'POI101','혜화역':'POI054','압구정로데오거리':'POI071','합정역':'POI053','을지로':'을지로','성수':'성수','잠실':'잠실','서촌':'서촌','수유':'수유'};
const AREAS=Object.keys(AREA_CODES);
const list=v=>Array.isArray(v)?v:[];
const first=v=>Array.isArray(v)?v[0]||{}:v||{};
const str=v=>typeof v==='string'||typeof v==='number'?String(v):'';
const num=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
function normalizeCity(payload){
  if(payload.RESULT?.CODE&&payload.RESULT.CODE!=='INFO-000')throw new Error('SEOUL_API_ERROR');
  const c=payload.CITYDATA;if(!c?.AREA_NM)throw new Error('NO_CITY_DATA');
  const p=first(c.LIVE_PPLTN_STTS),w=first(c.WEATHER_STTS);
  const air=(grade,value)=>({grade:str(grade)||'정보 없음',value:['좋음','보통','나쁨','매우 나쁨'].includes(grade)?num(value):null});
  return {mode:'live',area:str(c.AREA_NM),areaCode:str(c.AREA_CD),fetchedAt:new Date().toISOString(),source:'서울 열린데이터광장 · 실시간 도시데이터',
    crowd:{level:str(p.AREA_CONGEST_LVL),message:str(p.AREA_CONGEST_MSG),time:str(p.PPLTN_TIME),replaced:p.REPLACE_YN==='Y',forecast:list(p.FCST_PPLTN).slice(0,6).map(f=>({time:str(f.FCST_TIME),level:str(f.FCST_CONGEST_LVL)}))},
    weather:{temperature:w.TEMP!==''&&w.TEMP!=null&&Number.isFinite(Number(w.TEMP))?Number(w.TEMP):null,humidity:num(w.HUMIDITY),wind:num(w.WIND_SPD),precipitation:str(w.PRECPT_TYPE),rain:str(w.PRECIPITATION),message:str(w.PCP_MSG),time:str(w.WEATHER_TIME),sunset:str(w.SUNSET),uv:str(w.UV_INDEX_LVL),uvMessage:str(w.UV_MSG),pm25:air(w.PM25_INDEX,w.PM25),pm10:air(w.PM10_INDEX,w.PM10),airMessage:str(w.AIR_MSG),forecast:list(w.FCST24HOURS).slice(0,6).map(f=>({time:str(f.FCST_DT),temperature:str(f.TEMP),sky:str(f.SKY_STTS),rainChance:num(f.RAIN_CHANCE)}))},

  };
}
function createCityService({key=process.env.SEOUL_API_KEY,fetcher=fetch}={}){
  const cache=new Map(),pending=new Map();
  return async area=>{
    if(!AREAS.includes(area))throw new Error('INVALID_AREA');
    if(!key?.trim())return {mode:'unconfigured',area};
    if(cache.has(area)&&Date.now()-cache.get(area).at<300000)return cache.get(area).data;
    if(pending.has(area))return pending.get(area);
    const request=(async()=>{
      const url='http://openapi.seoul.go.kr:8088/'+encodeURIComponent(key.trim())+'/json/citydata/1/5/'+AREA_CODES[area];
      const response=await fetcher(url,{signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('SEOUL_API_ERROR');
      const data=normalizeCity(await response.json());
      if(AREA_CODES[area].startsWith('POI')&&data.areaCode!==AREA_CODES[area])throw new Error('AREA_MISMATCH');
      cache.set(area,{at:Date.now(),data});return data;
    })();pending.set(area,request);try{return await request;}finally{pending.delete(area);}
  };
}
module.exports={AREAS,normalizeCity,createCityService};

