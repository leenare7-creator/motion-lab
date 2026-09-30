const RECIPES=['soft-pop','float-settle','snap-slide','tilt-spring','focus-pulse','reveal-up']

const jsonSchema={
  type:'object',
  additionalProperties:false,
  required:['analysis','ideas'],
  properties:{
    analysis:{
      type:'object',
      additionalProperties:false,
      required:['category','subject','composition','visualWeight','direction','personality','complexity','motionOpportunity','caution','summary','traits','parts'],
      properties:{
        category:{type:'string',enum:['icon','logo','illustration','vector','graphic','unknown']},
        subject:{type:'string'},
        composition:{type:'string',enum:['centered','horizontal','vertical','asymmetric']},
        visualWeight:{type:'string',enum:['centered','top-heavy','bottom-heavy','left-heavy','right-heavy','balanced']},
        direction:{type:'string',enum:['neutral','left','right','up','down','horizontal-flow']},
        personality:{type:'string',enum:['clean','precise','friendly','bold','playful','calm']},
        complexity:{type:'string',enum:['simple','layered']},
        motionOpportunity:{type:'string'},
        caution:{type:'string'},
        summary:{type:'string'},
        traits:{type:'array',items:{type:'string'}},
        parts:{
          type:'array',
          items:{
            type:'object',additionalProperties:false,
            required:['name','role','importance'],
            properties:{
              name:{type:'string'},
              role:{type:'string'},
              importance:{type:'number'}
            }
          }
        }
      }
    },
    ideas:{
      type:'array',
      minItems:3,maxItems:3,
      items:{
        type:'object',additionalProperties:false,
        required:['recipeId','title','lane','rationale','motionIntent','confidence','plan'],
        properties:{
          recipeId:{type:'string',enum:RECIPES},
          title:{type:'string'},
          lane:{type:'string',enum:['Safe','Expressive','Playful']},
          rationale:{type:'string'},
          motionIntent:{type:'string'},
          confidence:{type:'number'},
          plan:{
            type:'object',additionalProperties:false,
            required:['recipeId','duration','amplitude','direction','overshoot','rotation','layerStrategy','stagger','easing','targetLayerNames','accentLayerNames'],
            properties:{
              recipeId:{type:'string',enum:RECIPES},
              duration:{type:'number'},
              amplitude:{type:'number'},
              direction:{type:'string',enum:['none','left','right','up','down']},
              overshoot:{type:'number'},
              rotation:{type:'number'},
              layerStrategy:{type:'string',enum:['whole','stagger-children','accent-first']},
              stagger:{type:'number'},
              easing:{type:'string',enum:['spring','snappy','smooth','linear']},
              targetLayerNames:{type:'array',items:{type:'string'}},
              accentLayerNames:{type:'array',items:{type:'string'}}
            }
          }
        }
      }
    }
  }
}

const systemPrompt=`You are Motion Lab's AI motion director for product UI icons, logos, stickers, mascots, and illustrations.

Your job is to direct motion, not merely classify the image.

First read the visual asset:
- what the subject is
- composition and visual weight
- implied direction
- personality
- whether the object is simple or layered
- which visible parts are important
- what should NOT be distorted

Then propose exactly three deliberately different directions:
1) Safe: product-ready and restrained
2) Expressive: clearer personality or directional energy
3) Playful: more character, but still usable

You MUST choose from the supplied deterministic recipes. Do not invent recipe IDs.
You may customize each recipe with duration, amplitude, direction, overshoot, rotation, layerStrategy, stagger, and easing.

If SVG structure metadata is supplied:
- targetLayerNames and accentLayerNames must use names from the supplied layer list whenever possible.
- Never animate background layers as accents.
- Use stagger-children only when multiple meaningful parts exist.
- Use accent-first only when a clearly salient detail exists.
- Prefer whole for logos and simple icons unless there is a strong reason.

Keep motion legible and short. Preserve silhouette and brand identity.
Return concise Korean summary/rationale strings. Return JSON only via the provided schema.`

function bodyOf(req){
  if(!req?.body)return {}
  if(typeof req.body==='string'){
    try{return JSON.parse(req.body)}catch{return {}}
  }
  return req.body
}

function outputText(data){
  if(typeof data?.output_text==='string')return data.output_text
  for(const item of data?.output||[]){
    if(item?.type!=='message')continue
    for(const part of item.content||[]){
      if(part?.type==='output_text'&&typeof part.text==='string')return part.text
    }
  }
  return ''
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'POST only'})

  const key=process.env.OPENAI_API_KEY
  if(!key)return res.status(503).json({error:'AI director is not configured'})

  const body=bodyOf(req)
  const asset=body.asset||{}
  const recipes=Array.isArray(body.recipes)?body.recipes:[]
  const structure=asset.structure||{}
  const image=typeof body.imageDataUrl==='string'&&body.imageDataUrl.startsWith('data:image/')?body.imageDataUrl:null

  const layerContext={
    layerCount:structure.layerCount||0,
    leafCount:structure.leafCount||0,
    groupCount:structure.groupCount||0,
    isLayered:!!structure.isLayered,
    parts:Array.isArray(structure.parts)?structure.parts.slice(0,18):[],
    semanticHints:structure.semanticHints||{},
  }

  const prompt=[
    `Asset: ${asset.fileName||'untitled'}`,
    `Size: ${asset.width||'?'} × ${asset.height||'?'}`,
    `MIME: ${asset.mime||'unknown'}`,
    `Variation request: ${Number(body.variation)||0}`,
    `Available recipes: ${JSON.stringify(recipes)}`,
    `SVG/layer structure: ${JSON.stringify(layerContext)}`,
    'Analyze the actual pixels and reconcile them with the supplied layer names. Then return three distinct motion directions.'
  ].join('\n')

  const content=[{type:'input_text',text:prompt}]
  if(image)content.push({type:'input_image',image_url:image,detail:'auto'})

  try{
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${key}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        model:process.env.OPENAI_MOTION_MODEL||'gpt-6-astra',
        store:false,
        instructions:systemPrompt,
        input:[{role:'user',content}],
        text:{
          format:{
            type:'json_schema',
            name:'motion_director_v2',
            strict:true,
            schema:jsonSchema
          }
        },
        max_output_tokens:1600
      })
    })

    if(!response.ok){
      const detail=await response.text()
      return res.status(502).json({error:'OpenAI request failed',status:response.status,detail:detail.slice(0,500)})
    }

    const data=await response.json()
    const text=outputText(data)
    if(!text)return res.status(502).json({error:'AI director returned no output'})

    const parsed=JSON.parse(text)
    const ids=parsed.ideas?.map(x=>x.recipeId)||[]
    const lanes=parsed.ideas?.map(x=>x.lane)||[]
    const laneSet=new Set(lanes)
    if(
      ids.length!==3||
      new Set(ids).size!==3||
      ids.some(id=>!RECIPES.includes(id))||
      !['Safe','Expressive','Playful'].every(l=>laneSet.has(l))
    ){
      return res.status(502).json({error:'AI director returned invalid direction set'})
    }

    return res.status(200).json({source:'ai',analysis:parsed.analysis,ideas:parsed.ideas})
  }catch(e){
    return res.status(500).json({error:e instanceof Error?e.message:'AI director failed'})
  }
}
