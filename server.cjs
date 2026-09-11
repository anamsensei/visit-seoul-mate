const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {createWeatherService,REGIONS}=require('./weather-api.cjs');
const weather=createWeatherService();
const {createCityService,AREAS}=require('./city-api.cjs');
const city=createCityService();
function createServer(){return http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(origin&&origin===process.env.ALLOWED_ORIGIN){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  let url;try{url=new URL(req.url,'http://localhost');}catch{return reply(400,{error:'INVALID_REQUEST'});}
  if(req.method!=='GET')return reply(405,{error:'METHOD_NOT_ALLOWED'});
  if(url.pathname==='/health')return reply(200,{ok:true});
  if(url.pathname==='/api/city'){
    const area=url.searchParams.get('area');
    if(!AREAS.includes(area))return reply(400,{error:'INVALID_AREA'});
    try{return reply(200,await city(area));}catch{return reply(502,{error:'CITY_UNAVAILABLE'});}
  }
  if(url.pathname==='/api/weather'){
    const region=url.searchParams.get('region')||'hongdae';
    if(!Object.hasOwn(REGIONS,region))return reply(400,{error:'INVALID_REGION'});
    try{return reply(200,await weather(region));}catch{return reply(502,{error:'WEATHER_UNAVAILABLE',message:'날씨 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.'});}
  }
  if(url.pathname==='/api/places/status')return reply(200,{mode:'demo'});
  if(url.pathname==='/'||url.pathname==='/index.html'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    fs.createReadStream(path.join(__dirname,'index.html')).pipe(res);return;
  }
  reply(404,{error:'NOT_FOUND'});
});}
if(require.main===module){const port=Number(process.env.PORT||3003);createServer().listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Seoulmate weather: http://127.0.0.1:${port}`));}
module.exports={createServer};
