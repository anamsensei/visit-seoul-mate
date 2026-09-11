const ENDPOINT='https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
// Representative forecast grids for each selected itinerary area, not device GPS.
const REGIONS={hongdae:{name:'홍대 · 연남',nx:59,ny:127},yeonhui:{name:'연희 · 연남',nx:59,ny:127},suyu:{name:'수유 · 우이천',nx:61,ny:128},jongno_hyehwa:{name:'혜화 · 종로',nx:60,ny:127},gangnam:{name:'강남 · 압구정',nx:61,ny:126},seongsu:{name:'성수 · 서울숲',nx:61,ny:127},seochon:{name:'서촌 · 부암',nx:60,ny:127},euljiro:{name:'을지로 · 신당',nx:60,ny:127},jamsil:{name:'잠실 · 송리단길',nx:62,ny:126}};
function baseTime(now=new Date(),offsetHours=0){
  // KST, with a conservative 45-minute publication buffer; handles midnight.
  const d=new Date(now.getTime()+9*3600000-45*60000-offsetHours*3600000);
  return {date:d.toISOString().slice(0,10).replaceAll('-',''),time:String(d.getUTCHours()).padStart(2,'0')+'00'};
}
function parseObservation(payload,region){
  const response=payload?.response;
  if(String(response?.header?.resultCode)!=='00')throw new Error(response?.header?.resultCode==='03'?'NO_DATA':'KMA_ERROR');
  const items=response?.body?.items?.item;
  if(!Array.isArray(items)||!items.length)throw new Error('NO_DATA');
  const read=(key,min,max)=>{const raw=items.find(i=>i.category===key)?.obsrValue;if(raw===undefined||raw===null||String(raw).trim()==='')return null;const n=Number(raw);return Number.isFinite(n)&&n>=min&&n<=max?n:null;};
  const temperature=read('T1H',-80,60);if(temperature===null)throw new Error('NO_DATA');
  const first=items.find(i=>i.category==='T1H');
  const date=String(first.baseDate),time=String(first.baseTime).padStart(4,'0');
  if(!/^\d{8}$/.test(date)||!/^\d{4}$/.test(time))throw new Error('NO_DATA');
  const observedAt=`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T${time.slice(0,2)}:${time.slice(2)}:00+09:00`;
  if(!Number.isFinite(Date.parse(observedAt)))throw new Error('NO_DATA');
  return {mode:'live',region,location:REGIONS[region].name,grid:{nx:REGIONS[region].nx,ny:REGIONS[region].ny},temperature,humidity:read('REH',0,100),wind:read('WSD',0,150),rain:read('RN1',0,1000),precipitation:read('PTY',0,7),observedAt,fetchedAt:new Date().toISOString(),source:'기상청 · 초단기실황'};
}
function createWeatherService({key=process.env.KMA_SERVICE_KEY,fetcher=fetch,now=()=>new Date()}={}){
  const cache=new Map(),pending=new Map();
  return async function getWeather(region){
    if(!Object.hasOwn(REGIONS,region))throw new Error('BAD_REGION');
    if(!key?.trim())return {mode:'demo',region,location:REGIONS[region].name};
    if(cache.has(region)&&now().getTime()-cache.get(region).time<10*60000)return cache.get(region).data;
    if(pending.has(region))return pending.get(region);
    const task=(async()=>{
      for(let offset=0;offset<3;offset++){
        const base=baseTime(now(),offset);
        const url=new URL(ENDPOINT);
        let decoded=key.trim();try{decoded=decodeURIComponent(decoded);}catch{}
        url.search=new URLSearchParams({serviceKey:decoded,pageNo:'1',numOfRows:'1000',dataType:'JSON',base_date:base.date,base_time:base.time,nx:String(REGIONS[region].nx),ny:String(REGIONS[region].ny)});
        const result=await fetcher(url,{signal:AbortSignal.timeout(5000)});
        if(!result.ok)throw new Error('KMA_ERROR');
        let payload;try{payload=await result.json();}catch{throw new Error('KMA_ERROR');}
        try{const data=parseObservation(payload,region);cache.set(region,{time:now().getTime(),data});return data;}
        catch(error){if(error.message!=='NO_DATA'||offset===2)throw error;}
      }
    })();
    pending.set(region,task);try{return await task;}finally{pending.delete(region);}
  };
}
module.exports={REGIONS,baseTime,parseObservation,createWeatherService};
