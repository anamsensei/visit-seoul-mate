const DEFAULT_MODEL='gemini-3.7-flash';
const ALLOWED_CATEGORIES=['문화관광','쇼핑','숙박','역사관광','음식','자연관광','체험관광','축제/공연/행사'];

function createGeminiService(options={}) {
  const fetchImpl=options.fetchImpl||globalThis.fetch;
  const key=options.apiKey??process.env.GEMINI_API_KEY??process.env.GOOGLE_API_KEY??process.env.AI_KEY??'';
  const model=options.model||process.env.GEMINI_MODEL||DEFAULT_MODEL;
  const models=[...new Set([model,'gemini-3.7-flash','gemini-2.5-flash-lite'])];
  const configured=Boolean(key);
  async function generate(prompt) {
    if(!configured) throw new Error('GEMINI_NOT_CONFIGURED');
    let lastError;
    for(const candidateModel of models){
      const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidateModel)}:generateContent`;
      const response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({
        contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0,responseMimeType:'application/json',maxOutputTokens:900}
      }),signal:AbortSignal.timeout(20000)});
      if(!response.ok){
        const detail=(await response.text().catch(()=>'' )).slice(0,300).replace(/\s+/g,' ');
        lastError=new Error(`GEMINI_${response.status}`);console.warn(`[gemini] ${candidateModel} ${response.status} ${detail}`);
        if(response.status===404)continue;throw lastError;
      }
      const data=await response.json();const raw=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
      try{return JSON.parse(raw);}catch{throw new Error('GEMINI_INVALID_RESPONSE');}
    }
    throw lastError||new Error('GEMINI_UNAVAILABLE');
  }
  async function normalizePlaces(text) {
    const inputs=String(text||'').split(/[,，、;；\n]+/).map(s=>s.trim()).filter(Boolean).slice(0,12);
    const schema={type:'object',properties:{places:{type:'array',items:{type:'object',properties:{input:{type:'string'},koreanNames:{type:'array',items:{type:'string'},maxItems:3}},required:['input','koreanNames']}}},required:['places']};
    const prompt=`You normalize multilingual Seoul place names. For each user input, return up to three likely official Korean place names. Translate or transliterate names, but do not invent addresses or claim verification. Keep each original input exactly. Input JSON: ${JSON.stringify(inputs)}`;
    const out=await generate(prompt,schema);
    return Array.isArray(out.places)?out.places.slice(0,12):[];
  }
  async function analyzeInterests({selected=[],custom='',nationality=''}) {
    const schema={type:'object',properties:{summary:{type:'string'},keywords:{type:'array',items:{type:'string'},maxItems:8},visitCategories:{type:'array',items:{type:'string',enum:ALLOWED_CATEGORIES},maxItems:4},moodTags:{type:'array',items:{type:'string'},maxItems:5}},required:['summary','keywords','visitCategories','moodTags']};
    const prompt=`Analyze a Seoul tourist's interests for itinerary retrieval. Understand the custom text in any language. Return Korean search keywords, only the allowed Visit Seoul categories, short Korean mood tags, and one natural Korean summary under 55 characters. Allowed categories: ${ALLOWED_CATEGORIES.join(', ')}. Selected: ${JSON.stringify(selected)}. Custom: ${JSON.stringify(String(custom||'').slice(0,300))}. Nationality: ${JSON.stringify(String(nationality||''))}. Do not add interests unsupported by the input.`;
    const out=await generate(prompt,schema);
    return {summary:String(out.summary||'').slice(0,100),keywords:(out.keywords||[]).map(String).slice(0,8),visitCategories:(out.visitCategories||[]).filter(x=>ALLOWED_CATEGORIES.includes(x)).slice(0,4),moodTags:(out.moodTags||[]).map(String).slice(0,5)};
  }
  return {configured,model,normalizePlaces,analyzeInterests};
}

module.exports={createGeminiService,ALLOWED_CATEGORIES};
