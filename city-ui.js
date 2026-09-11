(() => {
  const $=id=>document.getElementById('city-'+id);
  const endpoint=(window.SEOULMATE_API_BASE||'').replace(/\/$/,'')+'/api/city';
  const cache=new Map();let seq=0,controller,timer,lastRegion=null;
  const planAreas={HD_1:'연남동',HD_2:'홍대 관광특구'};
  const presets={hongdae:'연남동',yeonhui:'연남동',jongno_hyehwa:'혜화역',gangnam:'압구정로데오거리',seongsu:'서울숲공원'};
  const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  // 서울시 API는 개별 매장이 아닌 지역 단위 혼잡 단계를 제공합니다.
  // 화면의 70점 기준 경고를 위해 단계만 점수로 환산합니다.
  const crowdScore=level=>({ '여유':20, '보통':50, '약간 붐빔':70, '붐빔':90 }[level] ?? null);
  const time=t=>t||'기준 시각 미제공';
  const fresh=d=>d?.mode==='live'&&!d.crowd.replaced&&Date.now()-Date.parse(d.crowd.time.replace(' ','T')+':00+09:00')<15*60000;
  function rows(target,items,empty){const root=$(target);root.replaceChildren();if(!items.length){root.append(node('p',empty));return;}items.forEach(item=>root.append(item));}
  function block(title,body){const e=node('div');e.className='city-row';e.append(node('strong',title),node('p',body));return e;}
  function render(d){
    const snapshot=d.mode==='snapshot';
    $('content').hidden=false;$('area-name').textContent=d.area;
    $('badge').textContent=snapshot?'공개 샘플 · 저장 자료':'서울시 데이터';
    $('crowd').textContent=d.crowd.level||'정보 없음';
    $('message').textContent=d.crowd.message||'혼잡도 메시지가 없습니다.';
    $('time').textContent='인구 기준 '+time(d.crowd.time)+(snapshot?' · 현재 여행 지역의 실시간 값이 아닙니다':fresh(d)?'':' · 지연 또는 대체 자료, 경고 판단에서 제외');
    rows('forecast',d.crowd.forecast.map(f=>block(f.time.slice(11),f.level)),'혼잡도 예측 정보가 없습니다.');
    const w=d.weather;
    $('air').textContent='초미세먼지 '+w.pm25.grade+(w.pm25.value===null?'':' · '+w.pm25.value+' ㎍/㎥');
    $('pm10').textContent='미세먼지 '+w.pm10.grade+(w.pm10.value===null?'':' · '+w.pm10.value+' ㎍/㎥');
    $('uv').textContent='자외선 '+(w.uv||'정보 없음');$('sunset').textContent='일몰 '+(w.sunset||'정보 없음');
    $('air-note').textContent=[w.airMessage,w.uvMessage,'날씨·환경 기준 '+time(w.time)].filter(Boolean).join(' ');
    rows('weather-forecast',w.forecast.map(f=>block(f.time.length===12?f.time.slice(8,10)+':'+f.time.slice(10):f.time,`${f.temperature||'—'}°C · ${f.sky||'정보 없음'} · 강수확률 ${f.rainChance===null?'—':f.rainChance+'%'}`)),'시간대별 예보가 없습니다.');
    $('status').textContent=snapshot?'서울시 공개 샘플의 실제 응답을 저장한 미리보기입니다. 지역 선택 후 새로고침하면 연결을 다시 확인합니다.':'지역 단위 정보입니다. 개별 가게의 대기 인원·영업 여부를 뜻하지 않습니다.';
    window.applyCityWeather?.(d);
    if(!snapshot)cache.set($('area').value,d);
    refreshBadges();
  }
  function refreshBadges(){
    document.querySelectorAll('#planner-timeline .tag-cong').forEach((el,i)=>{const p=window.currentDisplayedSpots[i],area=planAreas[p?.id],d=cache.get(area)||cache.get($('area').value);
      el.className='tag-cong cong-mid';
      const score=crowdScore(d?.crowd?.level);
      el.textContent=d&&fresh(d)&&score!==null?`${d.area||area||$('area').value} · 지역 혼잡도 ${score}%`:(d?.area||area)?(d.area||area)+' · 정보 확인 필요':'지역 혼잡도 확인 중';
      if(score!==null&&score>=70)el.className='tag-cong cong-high';
    });
  }
  window.cityShouldWarn=plan=>{
    const d=cache.get(planAreas[plan.id])||cache.get($('area').value);
    const score=crowdScore(d?.crowd?.level);
    if(!fresh(d)||score===null)return false;
    const sensitivity=Number(document.querySelector('#mood-selector .active')?.dataset.congestionSens||50);
    return score>=90||(sensitivity>=80&&score>=70);
  };
  window.cityAfterPlans=refreshBadges;
  async function load(){
    const version=++seq;controller?.abort();controller=new AbortController();
    $('refresh').disabled=true;$('status').textContent='서울시 지역 정보를 확인하고 있어요…';
    $('content').hidden=true;$('badge').textContent='조회 중';
    window.clearCityWeather?.();
    try{
      if(location.protocol==='file:'&&!window.SEOULMATE_API_BASE)throw new Error('UNCONFIGURED');
      const response=await fetch(endpoint+'?area='+encodeURIComponent($('area').value),{signal:controller.signal});
      if(version!==seq)return;
      if(!response.ok)throw new Error(response.status===404?'UNCONFIGURED':'ERROR');
      const d=await response.json();if(version!==seq)return;
      if(d.mode!=='live')throw new Error('UNCONFIGURED');
      render(d);
    }catch(e){if(version!==seq)return;$('badge').textContent='연결 대기';$('status').textContent=e.message==='UNCONFIGURED'?'서버에 서울시 키를 설정하면 연결됩니다. 아래에서 공개 샘플 화면을 먼저 볼 수 있어요.':'조회에 실패했어요. 인증키·서버 연결 상태를 확인한 후 다시 시도해주세요.';refreshBadges();}
    finally{if(version===seq)$('refresh').disabled=false;}
  }
  $('refresh').addEventListener('click',load);$('area').addEventListener('change',load);
  $('sample').addEventListener('click',()=>{seq++;controller?.abort();$('refresh').disabled=false;$('area').value='광화문·덕수궁';render(CITY_SNAPSHOT);});
  function activate(){
    if(window.currentStep===9&&!document.hidden){
      if(lastRegion!==window.selectedRegionKey){lastRegion=window.selectedRegionKey;if(presets[lastRegion])$('area').value=presets[lastRegion];load();}
      if(!timer)timer=setInterval(load,300000);
      refreshBadges();
    }else{clearInterval(timer);timer=null;seq++;controller?.abort();lastRegion=null;}
  }
  const previous=updateUI;updateUI=function(){previous();activate();};
  document.addEventListener('visibilitychange',activate);
  window.addEventListener('pagehide',()=>{clearInterval(timer);seq++;controller?.abort();});
})();
