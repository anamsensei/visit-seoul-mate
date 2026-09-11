(() => {
  // For a separate backend, set this to its HTTPS endpoint; never put a key here.
  const endpoint=window.SEOULMATE_WEATHER_ENDPOINT||((window.SEOULMATE_API_BASE||'').replace(/\/$/,'')+'/api/weather');
  const $=id=>document.getElementById('weather-'+id);
  let generation=0,controller,timer,lastRegion=null,lastData=null,lastCheck=0;
  const names={hongdae:'홍대 · 연남',yeonhui:'연희 · 연남',suyu:'수유 · 우이천',jongno_hyehwa:'혜화 · 종로',gangnam:'강남 · 압구정',seongsu:'성수 · 서울숲',seochon:'서촌 · 부암',euljiro:'을지로 · 신당',jamsil:'잠실 · 송리단길'};
  const districtRegion={마포구:'hongdae',중구:'euljiro',종로구:'jongno_hyehwa',성동구:'seongsu',송파구:'jamsil',강남구:'gangnam',서초구:'gangnam',용산구:'euljiro',서대문구:'yeonhui',강북구:'suyu',도봉구:'suyu'};
  const apiRegion=()=>districtRegion[window.selectedRegionKey]||window.selectedRegionKey||'hongdae';
  const sample={dry:{temperature:24.3,humidity:58,wind:2.1,rain:0,precipitation:0},rain:{temperature:20.8,humidity:86,wind:3.6,rain:2.5,precipitation:1},snow:{temperature:-1.2,humidity:74,wind:2.8,rain:0.4,precipitation:3}};
  function demo(){const region=window.selectedRegionKey||'hongdae';return {...sample[$('scenario').value],mode:'demo',region,location:names[region]||'서울'};}
  function render(data){
    lastData=data;
    const isDemo=data.mode==='demo';
    const types={0:['강수 없음','◌'],1:['비','☂'],2:['비 / 눈','❄'],3:['눈','❄'],4:['소나기','☂'],5:['빗방울','☂'],6:['빗방울 / 눈날림','❄'],7:['눈날림','❄']};
    const [condition,icon]=types[data.precipitation]||['강수 정보 없음','—'];
    $('region').textContent=data.location;
    $('temperature').textContent=Number.isFinite(data.temperature)?String(data.temperature):'—';
    $('condition').textContent=condition;$('icon').textContent=icon;
    $('humidity').textContent=data.humidity==null?'—':data.humidity+'%';
    $('wind').textContent=data.wind==null?'—':data.wind+' m/s';
    $('rain').textContent=data.rain==null?'—':data.rain+' mm';
    const stale=!isDemo&&Date.now()-Date.parse(data.observedAt)>2*3600000;
    $('badge').textContent=isDemo?'예시 날씨':stale?'이전 관측':'기상청 관측';
    $('badge').classList.toggle('sample',isDemo||stale);
    $('card').classList.toggle('rainy',data.precipitation>0);
    $('demo').hidden=!isDemo;
    $('time').textContent=isDemo?'시연용 예시 · 실제 관측 정보가 아닙니다':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(data.observedAt))+' 관측 · 한국 시간';
    $('source').textContent=isDemo?'연결 예정: 기상청 초단기실황':'출처: 기상청 초단기실황 · 선택 지역 대표 격자';
    $('advice').textContent=data.precipitation>0?(data.precipitation===3||data.precipitation===7?'눈이 내리고 있어요. 이동할 때 미끄러운 길을 조심해요.':'우산을 챙겨요. 야외 일정 사이에 실내에서 쉬어가도 좋아요.'):data.temperature>=30?'더운 날씨예요. 물을 챙기고 그늘에서 쉬어가요.':data.temperature<5?'쌀쌀한 날씨예요. 따뜻한 겉옷을 챙겨요.':'다음 장소로 출발하기 전, 날씨를 한 번 확인해요.';
    $('status').textContent=isDemo?'API 연결 전에는 예시 날씨로 화면을 확인할 수 있어요.':stale?'최신 관측이 늦어지고 있어요. 관측 시각을 확인해주세요.':'이 화면에서 10분마다 확인해요. 관측값은 발표 주기에 따라 갱신돼요.';
  }
  window.applyCityWeather=function(city){
    controller?.abort();generation++;$('refresh').disabled=false;
    window.cityWeatherActive=city;
    const w=city.weather;
    const date=w.time.replace(' ','T')+':00+09:00';
    const precipitation={'없음':0,'비':1,'비/눈':2,'눈':3,'소나기':4,'빗방울':5,'빗방울/눈날림':6,'눈날림':7}[w.precipitation]??null;
    if(!Number.isFinite(Date.parse(date))){$('temperature').textContent='—';$('condition').textContent='날씨 정보 없음';$('humidity').textContent='—';$('wind').textContent='—';$('rain').textContent='—';$('time').textContent='기준 시각 미제공';}
    else render({mode:'live',region:window.selectedRegionKey,location:city.area,temperature:w.temperature,humidity:w.humidity,wind:w.wind,rain:w.rain!==''&&Number.isFinite(Number(w.rain))?Number(w.rain):null,precipitation,observedAt:date});
    $('region').textContent=city.area;$('badge').textContent=city.mode==='snapshot'?'공개 샘플 · 저장 자료':'서울시 제공 날씨';
    $('source').textContent='출처: 서울 실시간 도시데이터 · '+city.area;
    $('demo').hidden=true;
    $('status').textContent=city.mode==='snapshot'?'저장된 공개 샘플입니다. 현재 여행 지역의 날씨가 아닙니다.':'조회 지역 기준입니다. 관측 시각을 확인해주세요.';
  };
  window.clearCityWeather=function(){window.cityWeatherActive=null;load();};
  async function load(){
    if(window.cityWeatherActive){window.applyCityWeather(window.cityWeatherActive);return;}

    controller?.abort();controller=new AbortController();const seq=++generation;
    const region=apiRegion();lastRegion=region;lastCheck=Date.now();
    if(lastData?.region!==region){lastData=null;$('temperature').textContent='—';$('condition').textContent='날씨 확인 중';$('humidity').textContent='—';$('wind').textContent='—';$('rain').textContent='—';$('time').textContent='';$('badge').textContent='확인 중';$('region').textContent=names[region]||'서울';}
    $('refresh').disabled=true;$('status').textContent='날씨 정보를 확인하고 있어요…';
    const timeout=setTimeout(()=>controller?.abort(),18000);
    try{
      if(location.protocol==='file:'&&!window.SEOULMATE_WEATHER_ENDPOINT){render(demo());return;}
      const response=await fetch(endpoint+'?region='+encodeURIComponent(region),{signal:controller.signal});
      if(seq!==generation)return;
      // Static hosting has no API route. A failed live API must never become sample weather.
      if(response.status===404){render(demo());return;}
      if(!response.ok)throw new Error('API');
      if(!(response.headers.get('content-type')||'').includes('application/json')){render(demo());return;}
      const data=await response.json();if(seq!==generation)return;
      if(data.mode==='demo'){render(demo());return;}
      if(data.mode!=='live'||data.region!==region||!Number.isFinite(data.temperature)||!Number.isFinite(Date.parse(data.observedAt)))throw new Error('DATA');
      render(data);
    }catch{
      if(seq!==generation)return;
      if(lastData?.mode==='live'){$('badge').textContent='갱신 실패 · 이전 관측';$('badge').classList.add('sample');}
      else{$('badge').textContent='연결 확인 필요';$('demo').hidden=true;}
      $('status').textContent='날씨를 불러오지 못했어요. 새로고침으로 다시 시도해주세요.';
    }finally{clearTimeout(timeout);if(seq===generation)$('refresh').disabled=false;}
  }
  function activate(){
    const active=window.currentStep===9&&!document.hidden;
    if(active){if(!timer)timer=setInterval(load,600000);if(!lastData||lastRegion!==apiRegion()||Date.now()-lastCheck>=600000)load();}
    else{clearInterval(timer);timer=null;controller?.abort();generation++;$('refresh').disabled=false;}
  }
  $('refresh').addEventListener('click',load);
  $('scenario').addEventListener('change',()=>render(demo()));
  const prior=updateUI;updateUI=function(){prior();activate();};
  document.addEventListener('visibilitychange',activate);
  window.addEventListener('pagehide',()=>{clearInterval(timer);controller?.abort();generation++;});
})();
