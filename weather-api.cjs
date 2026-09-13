const ENDPOINT='https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
// Representative forecast grids for each selected itinerary area, not device GPS.
const REGIONS={hongdae:{name:'홍대 · 연남',nx:59,ny:127},yeonhui:{name:'연희 · 연남',nx:59,ny:127},suyu:{name:'수유 · 우이천',nx:61,ny:128},jongno_hyehwa:{name:'혜화 · 종로',nx:60,ny:127},gangnam:{name:'강남 · 압구정',nx:61,ny:126},seongsu:{name:'성수 · 서울숲',nx:61,ny:127},seochon:{name:'서촌 · 부암',nx:60,ny:127},euljiro:{name:'을지로 · 신당',nx:60,ny:127},jamsil:{name:'잠실 · 송리단길',nx:62,ny:126}};
function baseTime(now=new Date(),offsetHours=0){
  // KST, with a conservative 45-minute publication buffer; handles midnight.
  const d=new Date(now.getTime()+9*3600000-45*60000-offsetHours*3600000);
  return {date:d.toISOString().slice(0,10).replaceAll('-',''),time:String(d.getUTCHours()).padStart(2,'0')+'00'};
}
function gpsGrid(lat,lng){
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<37.3||lat>37.8||lng<126.7||lng>127.3)throw new Error('BAD_POSITION');
  const rad=Math.PI/180,re=6371.00877/5,slat1=30*rad,slat2=60*rad,olon=126*rad,olat=38*rad;
  let sn=Math.log(Math.cos(slat1)/Math.cos(slat2))/Math.log(Math.tan(Math.PI*.25+slat2*.5)/Math.tan(Math.PI*.25+slat1*.5));
  const sf=Math.tan(Math.PI*.25+slat1*.5)**sn*Math.cos(slat1)/sn;
  const ro=re*sf/Math.tan(Math.PI*.25+olat*.5)**sn;
  const ra=re*sf/Math.tan(Math.PI*.25+lat*rad*.5)**sn;
  let theta=lng*rad-olon;if(theta>Math.PI)theta-=2*Math.PI;if(theta< -Math.PI)theta+=2*Math.PI;theta*=sn;
  return {nx:Math.floor(ra*Math.sin(theta)+43+.5),ny:Math.floor(ro-ra*Math.cos(theta)+136+.5)};
}
function parseObservation(payload,region,place=REGIONS[region]){
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
  return {mode:'live',region,location:place.name,grid:{nx:place.nx,ny:place.ny},temperature,humidity:read('REH',0,100),wind:read('WSD',0,150),rain:read('RN1',0,1000),precipitation:read('PTY',0,7),observedAt,fetchedAt:new Date().toISOString(),source:'기상청 · 초단기실황'};
}
function createWeatherService({key=process.env.KMA_SERVICE_KEY,fetcher=fetch,now=()=>new Date()}={}){
  const cache=new Map(),pending=new Map();
  return async function getWeather(region,position){
    if(!Object.hasOwn(REGIONS,region))throw new Error('BAD_REGION');
    const place=position?{name:'GPS 현재 위치 주변',...gpsGrid(position.lat,position.lng)}:REGIONS[region];
    if(!place)throw new Error('BAD_REGION');
    const cacheKey=position?`gps:${place.nx}:${place.ny}`:region;
    const resultRegion=position?'gps':region;
    if(!key?.trim())return {mode:'demo',region:resultRegion,location:place.name};
    if(cache.has(cacheKey)&&now().getTime()-cache.get(cacheKey).time<10*60000)return cache.get(cacheKey).data;
    if(pending.has(cacheKey))return pending.get(cacheKey);
    const task=(async()=>{
      for(let offset=0;offset<3;offset++){
        const base=baseTime(now(),offset);
        const url=new URL(ENDPOINT);
        let decoded=key.trim();try{decoded=decodeURIComponent(decoded);}catch{}
        url.search=new URLSearchParams({serviceKey:decoded,pageNo:'1',numOfRows:'1000',dataType:'JSON',base_date:base.date,base_time:base.time,nx:String(place.nx),ny:String(place.ny)});
        const result=await fetcher(url,{signal:AbortSignal.timeout(5000)});
        if(!result.ok)throw new Error('KMA_ERROR');
        let payload;try{payload=await result.json();}catch{throw new Error('KMA_ERROR');}
        try{const data=parseObservation(payload,resultRegion,place);cache.set(cacheKey,{time:now().getTime(),data});return data;}
        catch(error){if(error.message!=='NO_DATA'||offset===2)throw error;}
      }
    })();
    pending.set(cacheKey,task);try{return await task;}finally{pending.delete(cacheKey);}
  };
}
module.exports={REGIONS,baseTime,parseObservation,gpsGrid,createWeatherService};
