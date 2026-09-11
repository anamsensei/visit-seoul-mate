const assert=require('node:assert/strict');
const {baseTime,parseObservation,createWeatherService}=require('./weather-api.cjs');
const payload=(values={T1H:'24.3',REH:'58',WSD:'2.1',RN1:'0',PTY:'0'})=>({response:{header:{resultCode:'00'},body:{items:{item:Object.entries(values).map(([category,obsrValue])=>({category,obsrValue,baseDate:'20260911',baseTime:'1000'}))}}}});
(async()=>{
  assert.deepEqual(baseTime(new Date('2026-09-10T15:20:00Z')),{date:'20260910',time:'2300'});
  assert.deepEqual(baseTime(new Date('2026-09-10T15:50:00Z')),{date:'20260911',time:'0000'});
  const observation=parseObservation(payload(),'hongdae');assert.equal(observation.temperature,24.3);assert.equal(observation.rain,0);assert.equal(observation.precipitation,0);
  assert.equal(parseObservation(payload({T1H:'24',REH:'-999',WSD:'',RN1:'-999'}),'hongdae').humidity,null);
  assert.throws(()=>parseObservation(payload({T1H:'-999'}),'hongdae'),/NO_DATA/);
  assert.equal((await createWeatherService({key:''})('hongdae')).mode,'demo');
  let calls=0;
  const service=createWeatherService({key:'fake%2Bkey%3D',now:()=>new Date('2026-09-11T02:00:00Z'),fetcher:async(url)=>{
    calls++;assert.equal(url.searchParams.get('serviceKey'),'fake+key=');assert.equal(url.searchParams.get('nx'),'59');
    return {ok:true,json:async()=>calls===1?{response:{header:{resultCode:'03'}}}:payload()};
  }});
  const [a,b]=await Promise.all([service('hongdae'),service('hongdae')]);assert.deepEqual(a,b);assert.equal(calls,2);
  await service('hongdae');assert.equal(calls,2);
  await assert.rejects(()=>service('__proto__'),/BAD_REGION/);
  await assert.rejects(()=>createWeatherService({key:'fake',fetcher:async()=>({ok:true,json:async()=>{throw new Error('XML auth error');}})})('hongdae'),/KMA_ERROR/);
  console.log('PASS: KST midnight, measurements/missing values, demo, key encoding, no-data retry, cache, concurrency, invalid region, provider failure. Mock API only.');
})();
