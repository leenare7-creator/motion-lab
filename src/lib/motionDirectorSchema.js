export const DIRECTOR_VERSION=2
export const DIRECTOR_LANES=['Safe','Expressive','Playful']
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n))

export function normalizeAnalysis(raw={},asset={}){
  const ratio=(asset.width||1)/Math.max(1,asset.height||1)
  return {
    category:raw.category||'graphic',
    subject:raw.subject||asset.name||'graphic asset',
    composition:raw.composition||(Math.abs(ratio-1)<.22?'centered':ratio>1.3?'horizontal':'vertical'),
    visualWeight:raw.visualWeight||'balanced',
    direction:raw.direction||'neutral',
    personality:raw.personality||'clean',
    complexity:raw.complexity||((asset.structure?.leafCount||1)>5?'layered':'simple'),
    motionOpportunity:raw.motionOpportunity||'shape emphasis',
    caution:raw.caution||'원형을 해치지 않는 범위에서 움직임을 적용합니다.',
    summary:raw.summary||'형태를 유지하면서 짧고 명확한 움직임이 잘 맞는 그래픽입니다.',
    traits:Array.isArray(raw.traits)?raw.traits.slice(0,5):[],
    parts:Array.isArray(raw.parts)?raw.parts.slice(0,6).map(p=>({
      name:String(p?.name||'part'),
      role:String(p?.role||'detail'),
      importance:clamp(Number(p?.importance)||.5,0,1),
    })):[],
  }
}

export function normalizeIdea(raw={},fallbackRecipe='soft-pop'){
  const plan=raw.plan||{}
  return {
    recipeId:raw.recipeId||plan.recipeId||fallbackRecipe,
    title:raw.title||'Motion idea',
    lane:DIRECTOR_LANES.includes(raw.lane)?raw.lane:'Safe',
    rationale:raw.rationale||'그래픽의 성격을 유지하면서 명확한 움직임을 줍니다.',
    motionIntent:raw.motionIntent||'clear emphasis',
    confidence:clamp(Number(raw.confidence)||.65,0,1),
    plan:{
      recipeId:raw.recipeId||plan.recipeId||fallbackRecipe,
      duration:Number(plan.duration)||undefined,
      amplitude:Number(plan.amplitude)||1,
      direction:plan.direction||'none',
      overshoot:Number(plan.overshoot)||1,
      rotation:Number(plan.rotation)||1,
      layerStrategy:plan.layerStrategy||'whole',
      stagger:Number(plan.stagger)||.08,
      easing:plan.easing||'spring',
      targetLayerNames:Array.isArray(plan.targetLayerNames)?plan.targetLayerNames.filter(Boolean).slice(0,8):[],
      accentLayerNames:Array.isArray(plan.accentLayerNames)?plan.accentLayerNames.filter(Boolean).slice(0,4):[],
    }
  }
}

export function normalizeDirectorResult(raw={},asset={}){
  const ideas=Array.isArray(raw.ideas)?raw.ideas.slice(0,3):[]
  return {
    version:DIRECTOR_VERSION,
    source:raw.source||'local',
    analysis:normalizeAnalysis(raw.analysis,asset),
    ideas:ideas.map((idea,i)=>normalizeIdea(idea,['soft-pop','float-settle','tilt-spring'][i])),
  }
}
