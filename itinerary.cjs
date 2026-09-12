// Official place coordinates only. Travel estimates are not map routing results.
const CENTERS={hongdae:[37.556,126.925],yeonhui:[37.573,126.930],suyu:[37.638,127.025],jongno_hyehwa:[37.582,127.002],gangnam:[37.518,127.035],seongsu:[37.545,127.044],seochon:[37.580,126.970],euljiro:[37.566,126.995],jamsil:[37.513,127.103]};
const valid=p=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lng)&&p.lat>=37.3&&p.lat<=37.8&&p.lng>=126.7&&p.lng<=127.3;
function km(a,b){const r=Math.PI/180,h=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lng-a.lng)*r/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(h)));}
function travel(a,b){return a?Math.max(5,Math.ceil(km(a,b)*1.35/4*60)):0;}
const cafe=p=>p.category==='음식'&&/카페|찻집|커피|디저트|베이커리/.test(p.categoryPath||p.title);
const restaurant=p=>p.category==='음식'&&!cafe(p);
const nightlife=p=>/바|펍|술집|주점|칵테일|와인|맥주|포차|브루어리|라운지|이자카야/.test(`${p?.title||''} ${p?.desc||''} ${p?.categoryPath||''}`);
function slots(start,duration){return [{mealSlot:'lunch',from:780,to:840},{mealSlot:'dinner',from:1080,to:1140}].filter(s=>start<=s.to&&start+duration>=Math.max(start,s.from)+60);}
const hhmm=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
function schedule(places,{startHour=11,duration=8}={}){
  const start=Math.round(startHour*60),end=start+duration*60,meals=slots(start,duration*60);
  let best=null;
  function walk(left,route,now,length,mealIndex){
    if(!left.length){if(!best||route[0].startMinute<best.places[0].startMinute||(route[0].startMinute===best.places[0].startMinute&&length<best.distanceKm))best={places:route,distanceKm:length};return;}
    for(let i=0;i<left.length;i++){
      const p=left[i],isNight=Boolean(p.nightSlot),isMeal=restaurant(p)&&!isNight;
      const nightSlot=isNight?{nightSlot:true,from:1260,to:Math.min(1320,end-60)}:null;
      const slot=nightSlot|| (isMeal?meals[mealIndex]:null);
      if(isMeal&&!slot)continue;
      const prev=route.at(-1),minutes=travel(prev,p);let at=now+minutes;
      if(slot){at=Math.max(at,slot.from);if(at>slot.to)continue;}
      const stay=60;if(at+stay>end)continue;
      walk(left.filter((_,j)=>i!==j),[...route,{...p,mealSlot:slot?.mealSlot||null,nightSlot:Boolean(slot?.nightSlot),startMinute:at,endMinute:at+stay,stayMinutes:stay,incomingTravelMinutes:minutes,travelEstimate:true}],at+stay,length+(prev?km(prev,p):0),mealIndex+(isMeal?1:0));
    }
  }
  walk(places,[],start,0,0);
  if(!best)return null;
  // Expand free time into visits (up to 2h), keeping reserved meals and travel intact.
  for(let i=0;i<best.places.length;i++){
    const p=best.places[i],next=best.places[i+1],latest=next?next.startMinute-next.incomingTravelMinutes:end;
    if(!p.mealSlot)p.endMinute=Math.min(latest,p.startMinute+120);
    p.stayMinutes=p.endMinute-p.startMinute;p.startTime=hhmm(p.startMinute);p.endTime=hhmm(p.endMinute);p.routeOrder=i+1;
    p.transit=next?`다음 장소까지 도보 약 ${next.incomingTravelMinutes}분 · 좌표 기반 추정`:null;
    p.travelTime=next?.incomingTravelMinutes||0;
    p.freeAfterMinutes=next?Math.max(0,next.startMinute-p.endMinute-next.incomingTravelMinutes):Math.max(0,end-p.endMinute);
    p.hoursVerified=false;
  }
  return best;
}
function selectItinerary(pool,{region='hongdae',regions=[],limit=5,startHour=11,duration=8}={}){
  const pair=CENTERS[region]||CENTERS.hongdae,center={lat:pair[0],lng:pair[1]};
  const selectedRegions=[...new Set((Array.isArray(regions)?regions:[]).map(String).map(s=>s.trim()).filter(Boolean))];
  const districtRegions=selectedRegions.filter(d=>/구$/.test(d));
  const districtMatch=p=>!districtRegions.length||districtRegions.some(d=>String(p.address||'').includes(d)||String(p.title||'').includes(d));
  const ranked=pool.filter(valid).map(p=>({...p,distanceFromRegionKm:km(center,p)})).filter(p=>districtRegions.length?districtMatch(p):p.distanceFromRegionKm<=5)
    .sort((a,b)=>(b.relevance||0)-(a.relevance||0)||a.distanceFromRegionKm-b.distanceFromRegionKm||a.id.localeCompare(b.id));
  const mealCount=slots(startHour*60,duration*60).length;
  // Try multiple geographic seeds; a top-ranked isolated restaurant must not empty the tour.
  let best=null;
  for(const seed of ranked.slice(0,20)){
    const nearby=[...ranked].sort((a,b)=>km(seed,a)-km(seed,b)||(b.relevance||0)-(a.relevance||0));
    const nightNeeded=startHour*60+duration*60>=1260;
    const night=nightNeeded?nearby.find(nightlife):null;
    const foods=nearby.filter(p=>restaurant(p)&&p!==night).slice(0,mealCount);
    const activityTarget=Math.max(0,limit-foods.length-(night?1:0));
    const activityPool=nearby.filter(p=>!restaurant(p)&&p!==night);
    const activities=[];
    if(districtRegions.length){for(let pass=0;activities.length<activityTarget&&pass<districtRegions.length;pass++){const d=districtRegions[pass];const candidate=activityPool.find(p=>!activities.includes(p)&&(String(p.address||'').includes(d)||String(p.title||'').includes(d)));if(candidate)activities.push(candidate);}}
    for(const p of activityPool)if(activities.length<activityTarget&&!activities.includes(p))activities.push(p);
    if(night&&activities.length+foods.length<limit)activities.push({...night,nightSlot:true});
    let picked=[...activities,...foods];
    if(!picked.length)continue;
    let result=schedule(picked,{startHour,duration});
    while(!result&&picked.length>1){picked=picked.slice(0,-1);result=schedule(picked,{startHour,duration});}
    if(!result)continue;
    const scheduledMeals=picked.filter(p=>restaurant(p)&&!p.nightSlot).length;
    result.complete=picked.length>=limit&&scheduledMeals===mealCount;
    result.missingMeals=mealCount-scheduledMeals;
    result.expandedArea=picked.some(p=>p.distanceFromRegionKm>2.5);
    result.utility=picked.reduce((n,p)=>n+(p.relevance||0),0)-result.distanceKm;
    if(!best||Number(result.complete)>Number(best.complete)||(result.complete===best.complete&&(picked.length>best.places.length||(picked.length===best.places.length&&result.utility>best.utility))))best=result;
  }
  return best||{places:[],complete:false,missingMeals:mealCount,expandedArea:false};
}
module.exports={valid,km,cafe,restaurant,nightlife,slots,schedule,selectItinerary,CENTERS};
