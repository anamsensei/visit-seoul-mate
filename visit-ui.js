(() => {
  const base = () => (window.SEOULMATE_API_BASE || '').replace(/\/$/, '');
  const statusEl = () => document.getElementById('visit-api-status');
  const setStatus = (message, kind = 'info') => {
    const el = statusEl(); if (!el) return;
    el.textContent = message;
    el.style.background = kind === 'error' ? '#FEF2F2' : kind === 'live' ? '#ECFDF5' : '#EBF2FE';
    el.style.color = kind === 'error' ? '#B91C1C' : kind === 'live' ? '#047857' : '#1E40AF';
    el.style.borderColor = kind === 'error' ? '#FECACA' : kind === 'live' ? '#A7F3D0' : '#BFDBFE';
  };
  const categories = () => [...document.querySelectorAll('[data-visit-category].active')].map(el => el.dataset.visitCategory);
  const visited = () => (window.visitedPlaces || []).map(place => place.id).filter(Boolean);
  const demoButton = () => {
    const el = statusEl(); if (!el || document.getElementById('visit-demo-button')) return;
    const button = document.createElement('button'); button.id = 'visit-demo-button'; button.type = 'button'; button.textContent = '시연용 샘플 일정 보기';
    button.style.cssText = 'display:block;margin-top:8px;border:1px solid #93C5FD;background:#fff;color:#1D4ED8;border-radius:8px;padding:6px 9px;font-size:11px;font-weight:700;cursor:pointer;';
    button.addEventListener('click', () => { window.visitDataMode = 'demo'; window.visitLiveSpots = []; window.renderPlanner?.(); setStatus('시연용 일정입니다. Render에 비짓서울 API 키를 넣으면 공식 데이터로 전환됩니다.'); button.remove(); });
    el.append(button);
  };
  async function loadVisitRecommendations() {
    const endpoint = base() + '/api/visit/recommend';
    setStatus('비짓서울 공식 관광 콘텐츠를 불러오고 있어요…');
    try {
      const params = new URLSearchParams({ region: window.selectedRegionKey || 'hongdae', categories: categories().join(','), visited: visited().join(','), limit: '5' });
      if (location.protocol === 'file:' && !base()) throw new Error('UNCONFIGURED');
      const response = await fetch(endpoint + '?' + params.toString(), { signal: AbortSignal.timeout(25000) });
      if (response.status === 404 || response.status === 503) throw new Error('UNCONFIGURED');
      if (!response.ok) throw new Error('REQUEST');
      const data = await response.json();
      if (data.mode === 'unconfigured') throw new Error('UNCONFIGURED');
      if (data.mode !== 'live' || data.source !== 'visitseoul' || !Array.isArray(data.places) || !data.places.length) throw new Error('EMPTY');
      window.visitDataMode = 'live'; window.visitLiveSpots = data.places;
      window.renderPlanner?.();
      setStatus(`비짓서울 공식 데이터 ${data.places.length}곳을 연결했어요. 추천·좌표·대표사진은 모두 공식 콘텐츠를 사용합니다.`, 'live');
    } catch (error) {
      window.visitDataMode = 'demo'; window.visitLiveSpots = [];
      window.renderPlanner?.(); demoButton();
      setStatus(error.message === 'EMPTY' ? '선택한 조건에 맞는 비짓서울 공식 콘텐츠가 아직 부족해요. 지역·카테고리를 넓혀보세요.' : '비짓서울 API 연결 전입니다. 현재는 시연용 샘플 일정으로 화면을 확인할 수 있어요.', error.message === 'EMPTY' ? 'error' : 'info');
    }
  }
  window.loadVisitRecommendations = loadVisitRecommendations;
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-visit-category]').forEach(el => el.addEventListener('click', () => { if (window.currentStep === 9) loadVisitRecommendations(); }));
  });
})();
