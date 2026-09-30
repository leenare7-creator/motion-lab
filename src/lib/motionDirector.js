import { MOTION_RECIPES } from './motionRecipes'
import { normalizeDirectorResult } from './motionDirectorSchema'

const allowed=new Set(MOTION_RECIPES.map(r=>r.id))
const sleep=ms=>new Promise(r=>setTimeout(r,ms))

const semanticRole=name=>{
  const n=(name||'').toLowerCase()
  if(/eye|pupil|눈|동공/.test(n))return 'eye'
  if(/mouth|smile|입|입술/.test(n))return 'mouth'
  if(/star|spark|shine|별|반짝/.test(n))return 'accent'
  if(/arm|hand|leg|foot|팔|손|다리|발/.test(n))return 'limb'
  if(/body|face|head|torso|몸|얼굴|머리/.test(n))return 'body'
  if(/text|label|word|copy|텍스트|라벨/.test(n))return 'text'
  if(/bg|background|backdrop|배경/.test(n))return 'background'
  if(/outline|stroke|line|선|외곽/.test(n))return 'outline'
  return 'detail'
}

const depthOf=(layer,map)=>{
  let depth=0,current=layer
  while(current?.parentId&&depth<12){depth++;current=map.get(current.parentId)}
  return depth
}

export function summarizeLayers(layers=[]){
  const names=layers.map(l=>l.name).filter(Boolean)
  const leaf=layers.filter(l=>['shape','text','image'].includes(l.type))
  const groups=layers.filter(l=>['svgRoot','group','userGroup'].includes(l.type))
  const map=new Map(layers.map(l=>[l.id,l]))
  const parts=leaf.slice(0,18).map((l,i)=>({
    name:l.name||`part-${i+1}`,
    type:l.type,
    tag:l.tag||null,
    role:semanticRole(l.name),
    depth:depthOf(l,map),
    parentName:map.get(l.parentId)?.name||null,
    fill:l.original?.fill||l.attrs?.fill||null,
    stroke:l.original?.stroke||l.attrs?.stroke||null,
  }))
  const accents=parts.filter(p=>['eye','mouth','accent','limb'].includes(p.role)).map(p=>p.name).slice(0,6)
  return {
    layerCount:layers.length,
    leafCount:leaf.length,
    groupCount:groups.length,
    namedParts:names.slice(0,18),
    parts,
    semanticHints:{accents,backgrounds:parts.filter(p=>p.role==='background').map(p=>p.name).slice(0,3)},
    hasText:layers.some(l=>l.type==='text'),
    hasImage:layers.some(l=>l.type==='image'),
    isLayered:leaf.length>=3,
  }
}

function localAnalysis(asset){
  const n=(asset.name||'').toLowerCase()
  const ratio=(asset.width||1)/Math.max(1,asset.height||1)
  const s=asset.structure||{}
  let category='graphic'
  if(/icon|symbol|button|badge|아이콘|심볼|버튼/.test(n))category='icon'
  else if(/logo|brand|로고/.test(n))category='logo'
  else if(/character|mascot|illustration|illust|캐릭터|일러스트/.test(n))category='illustration'
  else if(asset.mime?.includes('svg'))category=s.isLayered?'layered-vector':'vector'

  const composition=Math.abs(ratio-1)<.22?'centered':ratio>1.3?'horizontal':'vertical'
  const complexity=s.isLayered?'layered':'simple'
  const personality=category==='illustration'?'friendly':category==='logo'?'precise':'clean'
  const direction=ratio>1.45?'horizontal-flow':'neutral'
  const opportunity=s.isLayered?'layer hierarchy + whole-object emphasis':'whole-object emphasis'

  return {
    category,subject:asset.name||'graphic asset',composition,
    visualWeight:composition==='centered'?'centered':'balanced',
    direction,personality,complexity,motionOpportunity:opportunity,
    caution:category==='logo'?'브랜드 실루엣을 변형하지 않고 짧은 시간 안에 종료합니다.':'형태 인지를 해치지 않도록 회전·이동량을 제한합니다.',
    summary:s.isLayered?'여러 파트가 분리된 벡터라 전체 움직임에 짧은 레이어 시차를 더하기 좋습니다.':'실루엣이 명확해 전체 오브젝트 중심의 짧은 모션이 잘 맞습니다.',
    traits:[category,composition,complexity,asset.mime?.includes('svg')?'vector':'raster'],
    parts:(s.parts||[]).slice(0,6).map((p,i)=>({name:p.name,role:p.role||'detail',importance:i===0?.82:.58})),
  }
}

const idea=(recipeId,lane,title,rationale,plan)=>({recipeId,lane,title,rationale,motionIntent:title.toLowerCase(),plan:{recipeId,...plan},confidence:.72})

function localIdeas(asset,analysis,variation=0){
  const layered=asset.structure?.isLayered
  const category=analysis.category
  let ideas

  if(category==='illustration'){
    ideas=[
      idea('float-settle','Safe','Gentle Arrival','일러스트의 형태를 유지하면서 공기감 있는 등장감을 줍니다.',{duration:1.02,amplitude:.82,direction:'up',overshoot:.8,rotation:.5,layerStrategy:layered?'stagger-children':'whole',stagger:.07,targetLayerNames:layered?(asset.structure?.parts||[]).filter(p=>p.role!=='background').slice(0,6).map(p=>p.name):[],accentLayerNames:asset.structure?.semanticHints?.accents||[]}),
      idea('tilt-spring','Expressive','Character Bounce','기울기와 탄성을 더해 캐릭터성을 살립니다.',{duration:.9,amplitude:1.05,direction:'none',overshoot:1.05,rotation:1.1,layerStrategy:layered?'accent-first':'whole',stagger:.06,targetLayerNames:layered?(asset.structure?.parts||[]).filter(p=>p.role!=='background').slice(0,6).map(p=>p.name):[],accentLayerNames:asset.structure?.semanticHints?.accents||[]}),
      idea('reveal-up','Playful','Layered Reveal','짧은 상승과 시차를 이용해 파트가 조립되는 느낌을 만듭니다.',{duration:.82,amplitude:.9,direction:'up',overshoot:.7,rotation:.25,layerStrategy:layered?'stagger-children':'whole',stagger:.09,targetLayerNames:layered?(asset.structure?.parts||[]).filter(p=>p.role!=='background').slice(0,6).map(p=>p.name):[],accentLayerNames:asset.structure?.semanticHints?.accents||[]}),
    ]
  }else if(category==='logo'){
    ideas=[
      idea('soft-pop','Safe','Precise Pop','실루엣을 바꾸지 않고 짧은 스케일 변화만 사용합니다.',{duration:.62,amplitude:.72,direction:'none',overshoot:.55,rotation:0,layerStrategy:'whole'}),
      idea('focus-pulse','Expressive','Brand Pulse','위치 이동 없이 한 번의 펄스로 존재감을 높입니다.',{duration:.58,amplitude:.78,direction:'none',overshoot:.68,rotation:0,layerStrategy:'whole'}),
      idea('reveal-up','Playful','Clean Reveal','낮은 이동량으로 깔끔하게 등장시킵니다.',{duration:.72,amplitude:.62,direction:'up',overshoot:.45,rotation:0,layerStrategy:'whole'}),
    ]
  }else{
    ideas=[
      idea('soft-pop','Safe','Soft Pop','짧은 오버슈트로 아이콘을 또렷하게 인지시킵니다.',{duration:.68,amplitude:.88,direction:'none',overshoot:.85,rotation:.15,layerStrategy:'whole'}),
      idea('snap-slide','Expressive','Directional Snap','짧은 방향 이동으로 반응성과 속도감을 만듭니다.',{duration:.64,amplitude:.82,direction:analysis.direction==='horizontal-flow'?'left':'right',overshoot:.75,rotation:.15,layerStrategy:layered?'stagger-children':'whole',stagger:.055}),
      idea('tilt-spring','Playful','Tilt Spring','가벼운 기울기와 탄성으로 장난기 있는 피드백을 줍니다.',{duration:.84,amplitude:.9,direction:'none',overshoot:.92,rotation:.72,layerStrategy:layered?'accent-first':'whole',stagger:.05}),
    ]
  }

  if(variation%3===1)ideas=[ideas[1],ideas[2],ideas[0]]
  if(variation%3===2)ideas=[ideas[2],ideas[0],ideas[1]]
  return ideas
}

function localResult(asset,variation=0){
  const analysis=localAnalysis(asset)
  return normalizeDirectorResult({source:'local',analysis,ideas:localIdeas(asset,analysis,variation)},asset)
}

export async function suggestMotionIdeas(asset,variation=0){
  const minimum=sleep(850)
  try{
    const request=fetch('/api/motion-director-v2',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        version:2,imageDataUrl:asset.visionDataUrl,
        asset:{fileName:asset.name,mime:asset.mime,width:asset.width,height:asset.height,structure:asset.structure},
        variation,
        recipes:MOTION_RECIPES.map(({id,name,lane,description,duration})=>({id,name,lane,description,duration}))
      })
    })
    const [res]=await Promise.all([request,minimum])
    if(!res.ok)throw new Error('director unavailable')
    const data=normalizeDirectorResult({...await res.json(),source:'ai'},asset)
    const valid=data.ideas.filter(x=>allowed.has(x.recipeId))
    if(valid.length!==3||new Set(valid.map(x=>x.recipeId)).size!==3)throw new Error('invalid ideas')
    return {...data,ideas:valid}
  }catch{
    await minimum
    return localResult(asset,variation)
  }
}
