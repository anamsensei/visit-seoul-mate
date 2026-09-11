(() => {
  const base = () => (window.SEOULMATE_API_BASE || '').replace(/\/$/, '');
  const statusEl = () => document.getElementById('visit-api-status');
  let generation = 0, controller;
  const setStatus = (message, kind = 'info') => {
    const el = statusEl(); if (!el) return;
    el.textContent = message;
    el.style.background = kind === 'error' ? '#FEF2F2' : kind === 'live' ? '#ECFDF5' : '#EBF2FE';
    el.style.color = kind === 'error' ? '#B91C1C' : kind === 'live' ? '#047857' : '#1E40AF';
  };
  function action(label, callback) {
    const el = statusEl(); if (!el) return;
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.style.cssText = 'display:inline-block;margin:8px 6px 0 0;border:1px solid #93C5FD;background:#fff;color:#1D4ED8;border-radius:8px;padding:8px;font-size:12px;cursor:pointer;';
    button.addEventListener('click', callback); el.append(button);
  }
  function messageFor(error) {
    const code = error.message;
    if (code === 'UNCONFIGURED' || code === 'VISITSEOUL_NOT_CONFIGURED') return '서버에 비짓서울 API 키가 설정되어 있지 않아요.';
    if (/VISITSEOUL_(401|403)$/.test(code)) return '비짓서울에서 인증을 거절했어요. 키와 사용 승인 상태를 확인해주세요.';
    if (code === 'VISITSEOUL_429') return '비짓서울 조회 한도에 도달했어요. 잠시 후 다시 시도해주세요.';
    if (/VISITSEOUL_5\d\d$/.test(code)) return '비짓서울 데이터 조회에서 서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.';
    if (code === 'EMPTY') return '조건에 맞는 공식 장소가 없어요. 지역이나 카테고리를 바꿔주세요.';
    if (error.name === 'AbortError' || error.name === 'TimeoutError') return '서버 응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.';
    if (code === 'ROUTE_MISSING') return '추천 API 주소를 찾지 못했어요. 서버 배포 상태를 확인해주세요.';
    if (error instanceof TypeError) return '서버에 연결하지 못했어요. 네트워크나 서버 접근 설정을 확인해주세요.';
    return '추천 응답을 처리하지 못했어요. 다시 시도해주세요.';
  }
  async function loadVisitRecommendations() {
    controller?.abort(); controller = new AbortController();
    const seq = ++generation, activeController = controller;
    const region = window.selectedRegionKey || 'hongdae';
    const categories = [...document.querySelectorAll('[data-visit-category].active')].map(el => el.dataset.visitCategory);
    const visited = (window.visitedPlaces || []).map(place => place.id).filter(Boolean);
    window.visitDataMode = 'loading'; window.visitLiveSpots = []; window.renderPlanner?.();
    setStatus('비짓서울 공식 관광 콘텐츠를 불러오고 있어요…');
    const slowTimer = setTimeout(() => { if (seq === generation) setStatus('서버를 깨우거나 관광 콘텐츠를 조회하고 있어요. 첫 연결은 시간이 걸릴 수 있어요.'); }, 12000);
    const deadline = setTimeout(() => activeController.abort(), 90000);
    try {
      if (location.protocol === 'file:' && !base()) throw new Error('ROUTE_MISSING');
      const duration=Number(document.getElementById('duration-picker')?.value)||8;
      const startHour=Number(document.getElementById('start-time-picker')?.value)||11;
      const limit=duration===4?3:duration===6?4:5;
      const params = new URLSearchParams({ region, categories: categories.join(','), visited: visited.join(','), limit:String(limit),startHour:String(startHour),duration:String(duration) });
      const response = await fetch(base() + '/api/visit/recommend?' + params, { signal: activeController.signal });
      if (response.status === 404) throw new Error('ROUTE_MISSING');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'REQUEST');
      if (data.mode === 'unconfigured') throw new Error('UNCONFIGURED');
      if (data.mode !== 'live' || data.source !== 'visitseoul' || !Array.isArray(data.places)) throw new Error('INVALID_RESPONSE');
      if (!data.places.length) throw new Error('EMPTY');
      if (seq !== generation || window.selectedRegionKey !== region) return;
      window.visitDataMode = 'live'; window.visitLiveSpots = data.places;
      window.renderPlanner?.();
      const complete=data.complete===true;
      setStatus(complete?`${duration}시간 코스 · 비짓서울 공식 장소 ${data.places.length}곳${data.expandedArea?' · 선택 권역 주변까지 검색 범위를 넓혔어요.':''}`:`일정 구성 미완료 (${data.places.length}/${limit}곳). 식사 시간·이동 조건에 맞는 장소를 더 확보해야 해요.`,complete?'live':'info');
      if (!complete) action('일정 다시 구성', loadVisitRecommendations);
    } catch (error) {
      if (seq !== generation || window.selectedRegionKey !== region) return;
      window.visitDataMode = 'error'; window.visitLiveSpots = []; window.renderPlanner?.();
      setStatus(messageFor(error), 'error');
      action('다시 시도', loadVisitRecommendations);
      action('시연 일정 보기', () => {
        generation++; controller?.abort(); window.visitDataMode = 'demo'; window.visitLiveSpots = []; window.renderPlanner?.();
        setStatus('시연용 샘플 일정입니다. 실제 API 추천이 아닙니다.');
        action('공식 추천 다시 조회', loadVisitRecommendations);
      });
    } finally { clearTimeout(slowTimer); clearTimeout(deadline); }
  }
  window.loadVisitRecommendations = loadVisitRecommendations;
})();

