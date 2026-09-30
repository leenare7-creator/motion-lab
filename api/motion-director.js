const RECIPE_IDS=['soft-pop','float-settle','snap-slide','tilt-spring','focus-pulse','reveal-up']

const fallback=(body)=>({
  source:'local',
  analysis:{summary:'그래픽의 형태와 비율을 기준으로 안정적인 모션 방향을 골랐어요.',traits:['graphic','single-object']},
  ideas:[
    {recipeId:'soft-pop',title:'Soft Pop',lane:'Safe',rationale:'짧고 안정적인 오버슈트로 아이콘과 UI 요소에 잘 맞습니다.',confidence:.65},
    {recipeId:'float-settle',title:'Float & Settle',lane:'Expressive',rationale:'가볍게 떠올랐다 안착해 일러스트에 생동감을 더합니다.',confidence:.62},
    {recipeId:'tilt-spring',title:'Tilt Spring',lane:'Playful',rationale:'회전과 탄성을 더해 조금 더 개성 있는 결과를 만듭니다.',confidence:.6},
  ]
})

function extractText(data){
  if(typeof data.output_text==='string')return data.output_text
  for(const item of data.output||[]){
    if(item.type==='message'){
      for(const c of item.content||[])if(c.type==='output_text'&&typeof c.text==='string')return c.text
    }
  }
  return ''
}

function parseJson(text){
  const clean=text.trim().replace(/^\`\`\`json/i,'').replace(/^\`\`\`/,'').replace(/\`\`\`$/,'').trim()
  return JSON.parse(clean)
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'POST only'})
  const body=req.body||{}
  const key=process.env.OPENAI_API_KEY
  if(!key)return res.status(200).json(fallback(body))

  const recipes=Array.isArray(body.recipes)?body.recipes:[]
  const prompt=`You are a motion director for product UI icons and illustrations.
Analyze the visual asset, then choose exactly three DISTINCT motion recipes from the allowed list.
The three directions must feel meaningfully different: safe/product-ready, expressive, and playful/experimental.
Do not invent recipe IDs.

Allowed recipes:
${JSON.stringify(recipes)}

Return ONLY JSON in this shape:
{
  "analysis":{"summary":"one concise Korean sentence","traits":["2-4 short English tags"]},
  "ideas":[
    {"recipeId":"allowed-id","title":"short title","lane":"Safe|Expressive|Playful","rationale":"one concise Korean sentence","confidence":0.0}
  ]
}
Asset metadata: ${body.fileName||'asset'}, ${body.width||'?'}x${body.height||'?'}, ${body.mime||''}.
Variation request: ${body.variation||0}.`

  const content=[{type:'input_text',text:prompt}]
  if(typeof body.imageDataUrl==='string'&&/^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(body.imageDataUrl)){
    content.push({type:'input_image',image_url:body.imageDataUrl,detail:'auto'})
  }

  try{
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:process.env.OPENAI_MOTION_MODEL||'gpt-4.1-mini',
        input:[{role:'user',content}],
        temperature:.7,
        max_output_tokens:700
      })
    })
    if(!response.ok)throw new Error(`OpenAI ${response.status}`)
    const data=await response.json()
    const parsed=parseJson(extractText(data))
    const ideas=(parsed.ideas||[]).filter(x=>RECIPE_IDS.includes(x.recipeId))
    if(ideas.length!==3||new Set(ideas.map(x=>x.recipeId)).size!==3)throw new Error('invalid recipe selection')
    return res.status(200).json({source:'ai',analysis:parsed.analysis,ideas})
  }catch(e){
    return res.status(200).json(fallback(body))
  }
}
