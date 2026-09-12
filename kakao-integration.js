(function () {
  'use strict';

  const KAKAO_MAPS_JAVASCRIPT_KEY = 'cd0632d24114b56e0a35949cc35b04cd';
  const districts = {
    jongno:['종로구',37.5735,126.9790,'도심 역사문화 · 궁궐 · 한옥','조선시대 한양의 중심부로 서울의 대표 역사유산이 밀집한 지역입니다.','고궁과 북촌·서촌, 인사동·익선동을 함께 둘러보기 좋습니다.'],
    jung:['중구',37.5641,126.9979,'서울 도심 · 근현대 · 쇼핑','남대문·명동·을지로를 중심으로 근현대 서울의 변화가 쌓인 지역입니다.','남산, 명동, 덕수궁, 을지로의 쇼핑과 야간 골목을 즐길 수 있습니다.'],
    yongsan:['용산구',37.5326,126.9906,'한강 · 글로벌 문화 · 박물관','한강과 맞닿은 교통 요지로 국제적인 문화가 공존해 온 지역입니다.','국립중앙박물관, 이태원·한남동과 한강을 연결하기 좋습니다.'],
    seongdong:['성동구',37.5633,127.0369,'성수 · 서울숲 · 산업재생','공장과 수제화 산업 공간이 새로운 문화·창업 공간으로 재해석된 지역입니다.','서울숲, 성수 팝업스토어, 카페와 편집숍을 함께 즐기기 좋습니다.'],
    gwangjin:['광진구',37.5385,127.0823,'한강 · 어린이대공원 · 대학가','한강 동쪽의 교통 거점과 대학가 문화가 함께 발달한 지역입니다.','어린이대공원, 아차산, 건대입구와 한강 산책을 조합하기 좋습니다.'],
    dongdaemun:['동대문구',37.5744,127.0396,'전통시장 · 대학가 · 생활서울','청량리와 제기동의 철도·시장·주거가 함께 발달한 생활 중심지입니다.','경동시장·서울약령시와 대학가의 로컬 먹거리를 경험하기 좋습니다.'],
    jungnang:['중랑구',37.6063,127.0927,'중랑천 · 용마산 · 로컬산책','중랑천과 산지 사이에 형성된 서울 동북권 생활 지역입니다.','용마산·망우산과 중랑천 자전거길, 동네 맛집을 즐기기 좋습니다.'],
    seongbuk:['성북구',37.5894,127.0167,'성북동 · 한양도성 · 예술','한양도성 북쪽의 오래된 주거지와 문화예술인의 흔적이 풍부합니다.','성북동 골목, 길상사, 한양도성과 대학가를 연결하기 좋습니다.'],
    gangbuk:['강북구',37.6396,127.0257,'북한산 · 근현대사 · 자연','북한산 기슭의 마을과 근현대 역사 공간이 자리한 지역입니다.','북한산·우이동의 자연과 역사 공간을 함께 돌아보기 좋습니다.'],
    dobong:['도봉구',37.6688,127.0471,'도봉산 · 숲길 · 음악문화','도봉산을 배경으로 자연과 주거문화가 연결된 서울 북부 지역입니다.','도봉산, 둘레길과 창동 문화공간을 중심으로 여행하기 좋습니다.'],
    nowon:['노원구',37.6542,127.0568,'불암산 · 수락산 · 가족여행','서울 동북권의 대표 생활권으로 성장한 지역입니다.','불암산·수락산과 화랑대 철도공원 등 자연 여행에 어울립니다.'],
    eunpyeong:['은평구',37.6027,126.9291,'북한산 · 한옥마을 · 진관사','북한산 자락의 마을과 오래된 사찰 문화가 이어지는 지역입니다.','은평한옥마을, 진관사, 북한산 둘레길을 함께 체험하기 좋습니다.'],
    seodaemun:['서대문구',37.5791,126.9368,'독립운동 · 대학가 · 안산','근현대사와 교육기관, 독립운동의 기억이 남은 지역입니다.','서대문형무소역사관, 안산자락길, 신촌·연희동을 연결하기 좋습니다.'],
    mapo:['마포구',37.5663,126.9019,'홍대 · 연남 · 한강 · 문화','한강의 포구와 철도 주변이 홍대 문화와 만나 발전한 지역입니다.','홍대·연남동·망원시장·한강공원의 공연과 야간문화를 즐기기 좋습니다.'],
    yangcheon:['양천구',37.5170,126.8666,'목동 · 안양천 · 생활문화','목동 신시가지와 안양천을 중심으로 생활 인프라가 발달한 지역입니다.','안양천 산책과 목동 상권의 차분한 로컬 여행에 적합합니다.'],
    gangseo:['강서구',37.5509,126.8495,'김포공항 · 한강서부 · 식물원','한강 서쪽 평야와 공항을 기반으로 발전한 서울의 서쪽 관문입니다.','서울식물원, 마곡, 궁산·양천향교를 중심으로 둘러보기 좋습니다.'],
    guro:['구로구',37.4955,126.8877,'산업단지 · 다문화 · 안양천','구로공단의 산업 역사와 현대 디지털 산업이 공존하는 지역입니다.','G밸리, 안양천, 구로시장에서 생활·산업의 변화를 느낄 수 있습니다.'],
    geumcheon:['금천구',37.4569,126.8955,'G밸리 · 산업유산 · 로컬','구로공단의 역사와 현대 디지털 산업단지의 변화를 보여주는 곳입니다.','산업단지와 로컬시장, 안양천 주변의 색다른 도시 풍경을 경험할 수 있습니다.'],
    yeongdeungpo:['영등포구',37.5264,126.8962,'여의도 · 한강 · 현대도심','철도와 공업을 기반으로 성장해 금융·방송 중심지가 된 지역입니다.','여의도 한강공원, 더현대·IFC와 문래창작촌을 즐기기 좋습니다.'],
    dongjak:['동작구',37.5124,126.9393,'한강 · 현충원 · 노량진','한강 남쪽 교통축과 주거지, 노량진 생활문화가 공존합니다.','현충원 산책, 노량진 수산시장과 한강 전망을 묶기 좋습니다.'],
    gwanak:['관악구',37.4784,126.9516,'관악산 · 대학가 · 청년문화','관악산 아래 마을과 대학가가 형성된 서울 남서권 지역입니다.','관악산, 샤로수길과 신림동에서 자연과 젊은 상권을 경험할 수 있습니다.'],
    seocho:['서초구',37.4837,127.0324,'한강 · 예술 · 강남생활권','한강 남쪽의 주거·업무지와 전문 문화 기능이 발달한 지역입니다.','예술의전당, 반포한강공원, 서래마을과 양재천을 연결하기 좋습니다.'],
    gangnam:['강남구',37.5172,127.0473,'K-트렌드 · 패션 · 비즈니스','대규모 도시개발을 통해 대표 업무·상업 중심지로 성장했습니다.','가로수길·압구정·청담·코엑스의 쇼핑과 미식 트렌드를 경험할 수 있습니다.'],
    songpa:['송파구',37.5145,127.1059,'한성백제 · 석촌호수 · 잠실','한성백제 역사유산과 잠실의 현대 관광지가 공존하는 지역입니다.','석촌호수, 롯데월드타워, 올림픽공원과 송리단길을 즐기기 좋습니다.'],
    gangdong:['강동구',37.5301,127.1238,'암사동 · 한강 · 선사문화','암사동 선사유적에서 서울의 오래된 생활 흔적을 확인할 수 있습니다.','암사동 유적, 고덕·길동 녹지와 한강 주변 산책에 잘 맞습니다.']
  };
  const data = Object.fromEntries(Object.entries(districts).map(([key,d]) => [key,{name:d[0],lat:d[1],lng:d[2],keyword:d[3],history:d[4],feature:d[5],radius:6500}]));
  const state = {map:null,places:null,info:null,markers:[],overlays:[],selected:new Set(),activeKey:null,results:{attraction:[],food:[],cafe:[]},activeType:'attraction',seq:0};
  let sdkPromise;

  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function loadSdk(){
    if(window.kakao?.maps) return Promise.resolve();
    if(sdkPromise) return sdkPromise;
    sdkPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.id='kakao-maps-sdk'; script.async=true;
      script.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_MAPS_JAVASCRIPT_KEY)}&autoload=false&libraries=services`;
      script.onload=()=>window.kakao?.maps?resolve():reject(new Error('카카오맵 SDK 초기화 실패'));
      script.onerror=()=>reject(new Error('카카오맵 SDK 다운로드 실패'));
      document.head.appendChild(script);
    });
    return sdkPromise;
  }
  function mapsReady(){return loadSdk().then(()=>new Promise((resolve,reject)=>window.kakao?.maps?.load?window.kakao.maps.load(resolve):reject(new Error('카카오맵 로더 없음'))));}
  function syncSelection(){
    const names=[...state.selected].map(k=>data[k].name);
    window.selectedDistricts=new Set(names); window.selectedRegions=names; window.selectedRegionKey=names[0]||'hongdae';
    const count=document.getElementById('district-selected-count'), list=document.getElementById('district-selected-list');
    if(count) count.textContent=`${names.length}개 선택`;
    if(list) list.innerHTML=names.length?[...state.selected].map(k=>`<span style="display:inline-flex;align-items:center;gap:5px;padding:6px 8px;border:1px solid #BFDBFE;background:#EFF6FF;color:#1D4ED8;border-radius:999px;font-size:10px;font-weight:800;"><button type="button" onclick="showDistrictKakaoPreview('${k}')" style="border:0;background:transparent;color:inherit;font:inherit;padding:0;cursor:pointer;">${esc(data[k].name)}</button><button type="button" onclick="removeSelectedDistrict('${k}',event)" style="width:16px;height:16px;border:0;border-radius:50%;background:#DBEAFE;color:#1D4ED8;cursor:pointer;">×</button></span>`).join(''):'<span style="font-size:10px;color:#94A3B8;">지도에서 여행할 자치구를 여러 개 선택해보세요.</span>';
    state.overlays.forEach(o=>{const on=state.selected.has(o.key),active=state.activeKey===o.key;o.button.style.background=active?'#1A56DB':on?'#EBF2FE':'#FFF';o.button.style.color=active?'#FFF':on?'#1A56DB':'#0F172A';});
  }
  function clearMarkers(){state.markers.forEach(m=>m.setMap(null));state.markers=[];state.info?.close();}
  async function ensureDistrictMap(){
    await mapsReady();
    if(!window.kakao.maps.services?.Places) throw new Error('카카오 장소검색 라이브러리 없음');
    const el=document.getElementById('district-kakao-map'); if(!el) throw new Error('지도 영역 없음');
    if(!state.map){
      state.map=new window.kakao.maps.Map(el,{center:new window.kakao.maps.LatLng(37.5665,126.9780),level:9});
      state.places=new window.kakao.maps.services.Places(); state.info=new window.kakao.maps.InfoWindow({zIndex:10});
      state.map.addControl(new window.kakao.maps.ZoomControl(),window.kakao.maps.ControlPosition.RIGHT);
      Object.entries(data).forEach(([key,d])=>{const b=document.createElement('button');b.type='button';b.textContent=d.name;b.style.cssText='padding:5px 7px;border:1px solid #CBD5E1;border-radius:999px;background:#FFF;color:#0F172A;font-size:9px;font-weight:900;white-space:nowrap;box-shadow:0 1px 5px #0f172a2e;cursor:pointer';b.onclick=e=>{e.stopPropagation();window.showDistrictKakaoPreview(key)};const o=new window.kakao.maps.CustomOverlay({position:new window.kakao.maps.LatLng(d.lat,d.lng),content:b,yAnchor:.5,zIndex:3});o.setMap(state.map);state.overlays.push({key,button:b,overlay:o});});
    }
    requestAnimationFrame(()=>state.map.relayout());
  }
  function search(keyword,category,d,seq){return new Promise(resolve=>state.places.keywordSearch(keyword,(rows,status)=>{if(seq!==state.seq||status!==window.kakao.maps.services.Status.OK)return resolve([]);const own=rows.filter(p=>`${p.address_name||''} ${p.road_address_name||''}`.includes(d.name));resolve((own.length?own:rows).slice(0,5));},{category_group_code:category,location:new window.kakao.maps.LatLng(d.lat,d.lng),radius:d.radius,size:15,sort:window.kakao.maps.services.SortBy.ACCURACY}));}
  function renderResults(type){
    state.activeType=type; clearMarkers(); const d=data[state.activeKey], rows=state.results[type]||[];
    const title=document.getElementById('district-live-title'),list=document.getElementById('district-place-list'); if(title)title.textContent=`${d.name} ${{attraction:'대표 관광명소',food:'맛집',cafe:'카페'}[type]} · 카카오 장소검색`;
    if(list)list.innerHTML=rows.length?rows.map((p,i)=>`<button type="button" onclick="focusDistrictPlace('${type}',${i})" style="width:100%;text-align:left;padding:10px;border:1px solid #E2E8F0;border-radius:10px;background:#FFF;cursor:pointer;"><strong>${i+1}. ${esc(p.place_name)}</strong><div style="font-size:10px;color:#64748B;margin-top:3px;">${esc(p.road_address_name||p.address_name||p.category_name)}</div></button>`).join(''):'<div style="padding:18px;text-align:center;color:#64748B;">검색 결과가 없습니다.</div>';
    const bounds=new window.kakao.maps.LatLngBounds();rows.forEach(p=>{const pos=new window.kakao.maps.LatLng(+p.y,+p.x),m=new window.kakao.maps.Marker({map:state.map,position:pos});window.kakao.maps.event.addListener(m,'click',()=>{state.info.setContent(`<div style="padding:7px;font-size:11px;"><strong>${esc(p.place_name)}</strong></div>`);state.info.open(state.map,m)});state.markers.push(m);bounds.extend(pos)});if(rows.length)state.map.setBounds(bounds,45,45,45,45);
  }
  window.showSeoulDistrictOverview=async function(){const loading=document.getElementById('district-map-loading');try{if(loading){loading.style.display='flex';loading.textContent='서울 전체 지도를 불러오는 중...'}await ensureDistrictMap();state.activeKey=null;clearMarkers();state.overlays.forEach(o=>o.overlay.setMap(state.map));state.map.setCenter(new window.kakao.maps.LatLng(37.5665,126.9780));state.map.setLevel(9);document.getElementById('district-info-panel').style.display='none';document.getElementById('district-overview-guide').style.display='block';document.getElementById('district-reset-btn').style.display='none';syncSelection();loading.style.display='none'}catch(e){if(loading){loading.style.display='flex';loading.textContent='카카오맵을 불러오지 못했습니다. Kakao Developers의 사이트 도메인을 확인해주세요.'}}};
  window.showDistrictKakaoPreview=async function(key){const d=data[key],loading=document.getElementById('district-map-loading');if(!d)return;state.selected.add(key);state.activeKey=key;syncSelection();const seq=++state.seq;try{if(loading){loading.style.display='flex';loading.textContent=`${d.name} 정보를 불러오는 중...`}await ensureDistrictMap();if(seq!==state.seq)return;state.overlays.forEach(o=>o.overlay.setMap(o.key===key?state.map:null));state.map.panTo(new window.kakao.maps.LatLng(d.lat,d.lng));state.map.setLevel(6);document.getElementById('district-info-panel').style.display='block';document.getElementById('district-overview-guide').style.display='none';document.getElementById('district-reset-btn').style.display='block';document.getElementById('district-info-name').textContent=d.name;document.getElementById('district-info-keyword').textContent=d.keyword;document.getElementById('district-info-history').textContent=d.history;document.getElementById('district-info-feature').innerHTML=`<strong>여행 포인트</strong> · ${esc(d.feature)}`;const [attraction,food,cafe]=await Promise.all([search(`${d.name} 관광명소`,'AT4',d,seq),search(`${d.name} 맛집`,'FD6',d,seq),search(`${d.name} 카페`,'CE7',d,seq)]);if(seq!==state.seq)return;state.results={attraction,food,cafe};document.querySelectorAll('#step6 [id^="district-tab-"]').forEach(x=>x.classList.remove('active'));document.getElementById('district-tab-attraction').classList.add('active');renderResults('attraction');loading.style.display='none'}catch(e){if(loading){loading.style.display='flex';loading.textContent='카카오맵 또는 장소검색 연결에 실패했습니다. 사이트 도메인을 확인해주세요.'}}};
  window.removeSelectedDistrict=function(key,event){event?.stopPropagation();state.selected.delete(key);if(state.activeKey===key)window.showSeoulDistrictOverview();else syncSelection();window.loadVisitRecommendations?.()};
  window.filterDistrictPlaces=function(type,el){document.querySelectorAll('#step6 [id^="district-tab-"]').forEach(x=>x.classList.remove('active'));el?.classList.add('active');renderResults(type)};
  window.focusDistrictPlace=function(type,index){if(type!==state.activeType)renderResults(type);const p=state.results[type]?.[index],m=state.markers[index];if(!p||!m)return;const pos=new window.kakao.maps.LatLng(+p.y,+p.x);state.map.panTo(pos);state.map.setLevel(4);state.info.setContent(`<div style="padding:7px;font-size:11px;"><strong>${esc(p.place_name)}</strong></div>`);state.info.open(state.map,m)};

  const route={map:null,user:null,dest:null,line:null,spot:null,position:null,watch:null};
  function status(text,type='info'){const el=document.getElementById('route-live-status');if(!el)return;el.textContent=text;el.style.background=type==='error'?'#FEF2F2':type==='success'?'#ECFDF5':'#EFF6FF';el.style.color=type==='error'?'#B91C1C':type==='success'?'#047857':'#1D4ED8'}
  function geo(){return new Promise((resolve,reject)=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),reject,{enableHighAccuracy:true,maximumAge:5000,timeout:15000}):reject(new Error('위치 기능 없음')))}
  function meters(a,b){const R=6371000,p1=a.lat*Math.PI/180,p2=b.lat*Math.PI/180,dp=(b.lat-a.lat)*Math.PI/180,dl=(b.lng-a.lng)*Math.PI/180,h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
  async function drawRoute(origin,spot){await mapsReady();const el=document.getElementById('kakao-route-map');route.map=new window.kakao.maps.Map(el,{center:new window.kakao.maps.LatLng(spot.lat,spot.lng),level:5});const a=new window.kakao.maps.LatLng(origin.lat,origin.lng),b=new window.kakao.maps.LatLng(spot.lat,spot.lng);const dot=document.createElement('div');dot.style.cssText='width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 2px 8px #0005';route.user=new window.kakao.maps.CustomOverlay({map:route.map,position:a,content:dot,yAnchor:.5,xAnchor:.5,zIndex:10});route.dest=new window.kakao.maps.Marker({map:route.map,position:b});route.line=new window.kakao.maps.Polyline({map:route.map,path:[a,b],strokeWeight:4,strokeColor:'#2563EB',strokeOpacity:.65,strokeStyle:'shortdash'});const bounds=new window.kakao.maps.LatLngBounds();bounds.extend(a);bounds.extend(b);route.map.setBounds(bounds,45,45,45,45)}
  window.openRouteNavigation=async function(spot){const modal=document.getElementById('route-navigation-modal');if(!modal||!spot)return;route.spot=spot;modal.style.display='flex';document.getElementById('route-summary-box').innerHTML=`📍 <strong>${esc(spot.title)}</strong><br>현재 위치를 확인하는 중...`;document.getElementById('route-step-list').innerHTML='<div class="route-seg-card"><div class="route-seg-icon icon-walk">GPS</div><div><strong>현재 위치 확인</strong><div style="font-size:11px;color:var(--text-sub);">브라우저 위치 권한을 확인하고 있습니다.</div></div></div>';status('📡 현재 위치를 확인하고 있습니다...');try{if(!Number.isFinite(+spot.lat)||!Number.isFinite(+spot.lng))throw new Error('목적지 좌표 없음');route.position=await geo();await drawRoute(route.position,{...spot,lat:+spot.lat,lng:+spot.lng});const d=meters(route.position,spot),walk=Math.max(1,Math.round(d/75));document.getElementById('route-summary-box').innerHTML=`📍 <strong>${esc(spot.title)}</strong><br>직선거리 ${d>=1000?(d/1000).toFixed(1)+'km':Math.round(d)+'m'} · 도보 약 ${walk}분`;document.getElementById('route-step-list').innerHTML=`<div class="route-seg-card"><div class="route-seg-icon" style="background:#FACC15;color:#3B3000;">K</div><div><strong>카카오맵 실제 길찾기</strong><div style="font-size:11px;color:var(--text-sub);">아래 버튼을 눌러 도보·대중교통 경로를 확인하세요.</div></div></div>`;status(`📍 ${spot.title} 목적지가 설정되었습니다.`);if(navigator.geolocation)route.watch=navigator.geolocation.watchPosition(p=>{route.position={lat:p.coords.latitude,lng:p.coords.longitude};if(route.user&&window.kakao?.maps)route.user.setPosition(new window.kakao.maps.LatLng(route.position.lat,route.position.lng));if(meters(route.position,spot)<=60)status(`🎉 ${spot.title}에 도착했습니다!`,'success')},()=>{}, {enableHighAccuracy:true,maximumAge:3000,timeout:15000})}catch(e){status('⚠️ GPS 또는 지도를 불러오지 못했습니다. 위치 권한과 사이트 도메인을 확인해주세요.','error')}};
  window.openKakaoMapExternalRoute=function(){if(!route.spot)return;window.open(`https://map.kakao.com/link/to/${encodeURIComponent(route.spot.title)},${+route.spot.lat},${+route.spot.lng}`,'_blank','noopener,noreferrer')};
  window.closeRouteModal=function(){if(route.watch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(route.watch);route.watch=null;document.getElementById('route-navigation-modal').style.display='none'};

  const priorUpdate=window.updateUI;
  if(typeof priorUpdate==='function') window.updateUI=function(){priorUpdate();if(window.currentStep===6)setTimeout(()=>window.showSeoulDistrictOverview(),0)};
  if(window.currentStep===6) window.showSeoulDistrictOverview();
})();
