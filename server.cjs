const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createWeatherService, REGIONS } = require('./weather-api.cjs');
const weather = createWeatherService();
const { createCityService, AREAS } = require('./city-api.cjs');
const city = createCityService();

// 권역별 기본 대표 스팟 (비짓서울 API 지연 또는 검색 실패 시 안전 폴백)
const FALLBACK_SPOTS = {
  hongdae: [
    { id: "VS_HD_1", title: "연남동 동진시장 플리마켓 & 골목", desc: "인디 창작자들의 감성 디자인 소품과 핸드메이드 굿즈 명소", tag: "#쇼핑·체험", transit: "도보 8분", congestion: 30, travelTime: 8, lat: 37.5623, lng: 126.9248, photo: "https://korean.visitseoul.net/comm/getImage?srvcId=POST&parentSn=45426&fileTy=POSTIMG&fileNo=1" },
    { id: "VS_HD_2", title: "홍대 걷고싶은거리 버스킹 존", desc: "인디 뮤지션 라이브 공연과 젊은 거리의 열기를 느끼는 코스", tag: "#축제·공연", transit: "도보 10분", congestion: 80, travelTime: 10, lat: 37.5558, lng: 126.9238, photo: "https://korean.visitseoul.net/comm/getImage?srvcId=POST&parentSn=47385&fileTy=POSTIMG&fileNo=1" },
    { id: "VS_HD_3", title: "와우산로 K-패션 플래그십 스트리트", desc: "한국 20대 로컬 스트리트 패션과 디자이너 브랜드 쇼핑 스팟", tag: "#쇼핑·패션", transit: "도보 6분", congestion: 50, travelTime: 6, lat: 37.5539, lng: 126.9255, photo: "https://korean.visitseoul.net/comm/getImage?srvcId=POST&parentSn=46972&fileTy=POSTIMG&fileNo=1" },
    { id: "VS_HD_4", title: "산울림 소극장 골목 바이닐 카페", desc: "골목 안 아늑한 분위기에서 바이닐 음악과 커피를 즐기는 쉼터", tag: "#문화관광", transit: "도보 8분", congestion: 35, travelTime: 8, lat: 37.5562, lng: 126.9304, photo: "https://korean.visitseoul.net/comm/getImage?srvcId=POST&parentSn=47386&fileTy=POSTIMG&fileNo=1" },
    { id: "VS_HD_5", title: "합정 당인리 크래프트 비어 펍", desc: "로컬 수제 맥주와 함께 투어의 하루를 마무리하는 감성 펍", tag: "#음식·미식", transit: "도보 12분", congestion: 40, travelTime: 12, lat: 37.5492, lng: 126.9189, photo: "https://korean.visitseoul.net/comm/getImage?srvcId=POST&parentSn=47387&fileTy=POSTIMG&fileNo=1" }
  ]
};

const REGION_KEYWORDS = {
  hongdae: '홍대',
  yeonhui: '연희동',
  suyu: '수유',
  jongno_hyehwa: '대학로',
  gangnam: '압구정',
  seongsu: '성수',
  seochon: '서촌',
  euljiro: '을지로',
  jamsil: '잠실'
};

async function fetchVisitSeoulSpots(region) {
  const apiKey = process.env.VISIT_SEOUL_KEY || '7f0c8357-716d-4060-9983-ce7d5d73f93c';
  const keyword = REGION_KEYWORDS[region] || '홍대';
  
  try {
    const targetUrl = `https://api.visitseoul.net/openapi/service/attractions/list?key=${apiKey}&keyword=${encodeURIComponent(keyword)}&pageSize=8&page=1&lang=ko`;
    const response = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) throw new Error(`VisitSeoul HTTP ${response.status}`);
    const data = await response.json();
    const items = data?.items || data?.data || [];

    if (!Array.isArray(items) || items.length === 0) {
      return FALLBACK_SPOTS[region] || FALLBACK_SPOTS.hongdae;
    }

    return items.map((item, idx) => ({
      id: `VS_${region}_${item.contentId || idx}`,
      title: item.title || item.postTitle || `${keyword} 로컬 명소`,
      desc: item.summary || item.postSummary || '비짓서울 공식 인증 서울 명소입니다.',
      tag: item.cateName ? `#${item.cateName}` : '#문화관광',
      transit: '도보 8분',
      congestion: 30 + (idx * 10),
      travelTime: 8,
      lat: parseFloat(item.mapY || item.lat || 37.5562),
      lng: parseFloat(item.mapX || item.lng || 126.9248),
      photo: item.firstImage || item.thumbUrl || 'https://korean.visitseoul.net/comm/getImage?srvcId=POST&parentSn=45426&fileTy=POSTIMG&fileNo=1'
    }));
  } catch (err) {
    console.warn(`[VisitSeoul] API fetch failed (${err.message}). Using fallback data.`);
    return FALLBACK_SPOTS[region] || FALLBACK_SPOTS.hongdae;
  }
}

function createServer() {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    // GitHub Pages 등 모든 오리진 또는 지정 오리진에 대해 CORS 허용
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    const reply = (status, data) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify(data));
    };

    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      return reply(400, { error: 'INVALID_REQUEST' });
    }

    if (req.method !== 'GET') return reply(405, { error: 'METHOD_NOT_ALLOWED' });
    if (url.pathname === '/health') return reply(200, { ok: true });

    if (url.pathname === '/api/city') {
      const area = url.searchParams.get('area');
      if (!AREAS.includes(area)) return reply(400, { error: 'INVALID_AREA' });
      try {
        return reply(200, await city(area));
      } catch {
        return reply(502, { error: 'CITY_UNAVAILABLE' });
      }
    }

    if (url.pathname === '/api/weather') {
      const region = url.searchParams.get('region') || 'hongdae';
      if (!Object.hasOwn(REGIONS, region)) return reply(400, { error: 'INVALID_REGION' });
      try {
        return reply(200, await weather(region));
      } catch {
        return reply(502, { error: 'WEATHER_UNAVAILABLE', message: '날씨 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.' });
      }
    }

    // [추가] 비짓서울 API 라우트
    if (url.pathname === '/api/visitseoul/spots') {
      const region = url.searchParams.get('region') || 'hongdae';
      try {
        const spots = await fetchVisitSeoulSpots(region);
        return reply(200, {
          mode: 'live',
          region: region,
          count: spots.length,
          spots: spots
        });
      } catch {
        return reply(500, { error: 'VISITSEOUL_ERROR' });
      }
    }

    if (url.pathname === '/api/places/status') return reply(200, { mode: 'demo' });

    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
      return;
    }

    reply(404, { error: 'NOT_FOUND' });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3003);
  createServer().listen(port, process.env.HOST || '0.0.0.0', () =>
    console.log(`Seoulmate server listening on port ${port}`)
  );
}

module.exports = { createServer };
