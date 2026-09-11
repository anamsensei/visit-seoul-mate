const AREA_CODES={"양화한강공원":"POI103","광나루한강공원":"POI087","삼각지역":"POI030","가로수길":"POI059","북촌한옥마을":"POI066","오목교역·목동운동장":"POI044","남산공원":"POI091","이촌한강공원":"POI108","천호역":"POI050","응봉산":"POI107","잠실새내역":"POI118","압구정로데오거리":"POI071","DMC(디지털미디어시티)":"POI084","여의서로":"POI126","혜화역":"POI054","망원한강공원":"POI094","창덕궁·종묘":"POI012","반포한강공원":"POI095","건대입구역":"POI015","연남동":"POI073","강남역":"POI014","뚝섬한강공원":"POI093","고척돔":"POI086","서울대입구역":"POI031","잠실종합운동장":"POI109","역삼역":"POI042","익선동":"POI116","동대문역":"POI024","여의도한강공원":"POI105","강서한강공원":"POI085","남대문시장":"POI115","장한평역":"POI049","신촌 스타광장":"POI122","노들섬":"POI092","양재역":"POI041","용리단길":"POI076","인사동":"POI078","명동 관광특구":"POI003","서울대공원":"POI100","보라매공원":"POI123","서촌":"POI067","보신각":"POI010","덕수궁길·정동길":"POI064","종로·청계 관광특구":"POI006","서울숲공원":"POI101","고덕역":"POI016","송현녹지광장":"POI129","발산역":"POI027","구로역":"POI020","성수카페거리":"POI068","연신내역":"POI043","이태원 관광특구":"POI004","어린이대공원":"POI104","신촌·이대역":"POI040","회기역":"POI056","김포공항":"POI061","잠실역":"POI119","서울식물원·마곡나루역":"POI032","서울 암사동 유적":"POI011","신정네거리역":"POI117","시의회 앞":"POI130","구로디지털단지역":"POI019","가산디지털단지역":"POI013","가락시장":"POI058","뚝섬역":"POI025","신논현역·논현역":"POI037","월드컵공원":"POI106","난지한강공원":"POI090","군자역":"POI021","교대역":"POI018","안양천":"POI125","북서울꿈의숲":"POI096","고속터미널역":"POI017","수유역":"POI036","여의도":"POI072","왕십리역":"POI045","잠원한강공원":"POI111","광화문·덕수궁":"POI009","서울역":"POI033","이태원역":"POI047","장지역":"POI048","숭례문":"POI131","성신여대입구역":"POI035","쌍문역":"POI070","신도림역":"POI038","서대문독립공원":"POI124","선릉역":"POI034","용산역":"POI046","영등포 타임스퀘어":"POI074","잠실한강공원":"POI110","홍대입구역(2호선)":"POI055","합정역":"POI053","잠실 관광특구":"POI005","청계산":"POI112","대림역":"POI023","노량진":"POI063","창동 신경제 중심지":"POI079","사당역":"POI029","국립중앙박물관·용산가족공원":"POI089","충정로역":"POI052","신림역":"POI039","광화문광장":"POI088","홍제폭포":"POI128","이태원 앤틱가구거리":"POI077","동대문 관광특구":"POI002","미아사거리역":"POI026","홍대 관광특구":"POI007","아차산":"POI102","경복궁":"POI008","송리단길·호수단길":"POI121","올림픽공원":"POI127"};
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





