const clamp=(n,min,max)=>Math.max(min,Math.min(max,n))
const point=(t,{x=0,y=0,scale=1,rotation=0,opacity=1}={})=>({t,transform:{x,y,scale,rotation},opacity})

export const MOTION_RECIPES=[
  {id:'soft-pop',name:'Soft Pop',lane:'Safe',description:'짧은 축소→오버슈트→안정으로 또렷하게 등장합니다.',duration:.72,previewClass:'motion-soft-pop'},
  {id:'float-settle',name:'Float & Settle',lane:'Expressive',description:'공기감 있게 떠올랐다 부드럽게 안착합니다.',duration:1.02,previewClass:'motion-float-settle'},
  {id:'snap-slide',name:'Snap Slide',lane:'Dynamic',description:'방향성을 가진 빠른 진입과 짧은 반동을 만듭니다.',duration:.68,previewClass:'motion-snap-slide'},
  {id:'tilt-spring',name:'Tilt Spring',lane:'Playful',description:'기울기와 탄성을 섞어 캐릭터성을 살립니다.',duration:.9,previewClass:'motion-tilt-spring'},
  {id:'focus-pulse',name:'Focus Pulse',lane:'Product',description:'위치 변화 없이 크기 변화만으로 상태를 강조합니다.',duration:.62,previewClass:'motion-focus-pulse'},
  {id:'reveal-up',name:'Reveal Up',lane:'Elegant',description:'아래에서 짧게 올라오며 절제된 등장감을 줍니다.',duration:.82,previewClass:'motion-reveal-up'},
]

export const getMotionRecipe=id=>MOTION_RECIPES.find(r=>r.id===id)||MOTION_RECIPES[0]

export function normalizeMotionPlan(input={}){
  const recipe=getMotionRecipe(input.recipeId)
  return {
    recipeId:recipe.id,
    duration:clamp(Number(input.duration)||recipe.duration,.35,2.4),
    amplitude:clamp(Number(input.amplitude)||1,.45,1.8),
    direction:['left','right','up','down','none'].includes(input.direction)?input.direction:'none',
    overshoot:clamp(Number(input.overshoot)||1,.35,1.8),
    rotation:clamp(Number(input.rotation)||1,0,1.8),
    layerStrategy:['whole','stagger-children','accent-first'].includes(input.layerStrategy)?input.layerStrategy:'whole',
    stagger:clamp(Number(input.stagger)||.08,0,.24),
    easing:input.easing||'spring',
  }
}

const directionVector=(direction,distance)=>{
  if(direction==='right')return {x:-distance,y:0}
  if(direction==='up')return {x:0,y:distance}
  if(direction==='down')return {x:0,y:-distance}
  return {x:direction==='none'?0:distance,y:0}
}

export function buildMotionPlanKeyframes(inputPlan,intensity=1,finalOpacity=1,delay=0){
  const plan=normalizeMotionPlan(inputPlan)
  const i=clamp(Number(intensity)||1,.45,1.6)*plan.amplitude
  const d=plan.duration
  const over=plan.overshoot
  const rot=plan.rotation
  let frames

  switch(plan.recipeId){
    case 'float-settle': {
      const travel=26*i
      const v=directionVector(plan.direction==='none'?'up':plan.direction,travel)
      frames=[[0,{x:v.x,y:v.y,scale:1-.04*i,rotation:-2*rot*i,opacity:0}],[.62,{x:-v.x*.22,y:-v.y*.22,scale:1+.025*over*i,rotation:1*rot*i,opacity:1}],[1,{opacity:1}]]
      break
    }
    case 'snap-slide': {
      const travel=52*i
      const v=directionVector(plan.direction==='none'?'left':plan.direction,travel)
      frames=[[0,{x:v.x,y:v.y,scale:1-.02*i,opacity:0}],[.68,{x:-v.x*.17,y:-v.y*.17,scale:1+.015*over*i,opacity:1}],[1,{opacity:1}]]
      break
    }
    case 'tilt-spring':
      frames=[[0,{scale:1-.12*i,rotation:-9*rot*i,opacity:0}],[.56,{scale:1+.07*over*i,rotation:4*rot*i,opacity:1}],[.78,{scale:1-.015*i,rotation:-1.5*rot*i,opacity:1}],[1,{opacity:1}]]
      break
    case 'focus-pulse':
      frames=[[0,{scale:1-.04*i,opacity:1}],[.46,{scale:1+.11*over*i,opacity:1}],[.72,{scale:1+.025*i,opacity:1}],[1,{opacity:1}]]
      break
    case 'reveal-up': {
      const travel=34*i
      const v=directionVector(plan.direction==='none'?'up':plan.direction,travel)
      frames=[[0,{x:v.x,y:v.y,scale:1-.015*i,opacity:0}],[.72,{x:-v.x*.09,y:-v.y*.09,scale:1+.008*over*i,opacity:1}],[1,{opacity:1}]]
      break
    }
    case 'soft-pop':
    default:
      frames=[[0,{scale:1-.24*i,opacity:0}],[.56,{scale:1+.09*over*i,opacity:1}],[.78,{scale:1-.015*i,opacity:1}],[1,{opacity:1}]]
  }

  return frames.map(([ratio,v])=>point(delay+ratio*d,{...v,opacity:(v.opacity??1)*finalOpacity}))
}

export function buildRecipeKeyframes(id,duration,intensity=1,finalOpacity=1){
  return buildMotionPlanKeyframes({recipeId:id,duration},intensity,finalOpacity,0)
}
