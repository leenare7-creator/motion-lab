const clamp=(n,min,max)=>Math.max(min,Math.min(max,n))
const point=(t,{x=0,y=0,scale=1,rotation=0,opacity=1}={})=>({t,transform:{x,y,scale,rotation},opacity})

export const MOTION_RECIPES=[
  {id:'soft-pop',name:'Soft Pop',lane:'Safe',description:'작게 시작해 살짝 오버슈트한 뒤 안정되는 UI 친화 모션.',duration:0.72,previewClass:'motion-soft-pop'},
  {id:'float-settle',name:'Float & Settle',lane:'Calm',description:'가볍게 떠오르며 자연스럽게 제자리로 안착하는 모션.',duration:1.05,previewClass:'motion-float-settle'},
  {id:'snap-slide',name:'Snap Slide',lane:'Dynamic',description:'방향성을 살린 빠른 진입과 짧은 반동으로 마무리.',duration:0.68,previewClass:'motion-snap-slide'},
  {id:'tilt-spring',name:'Tilt Spring',lane:'Playful',description:'기울기와 탄성을 섞어 캐릭터와 일러스트에 생동감을 추가.',duration:0.9,previewClass:'motion-tilt-spring'},
  {id:'focus-pulse',name:'Focus Pulse',lane:'Product',description:'크기 변화만으로 상태 전환과 포커스를 또렷하게 전달.',duration:0.62,previewClass:'motion-focus-pulse'},
  {id:'reveal-up',name:'Reveal Up',lane:'Elegant',description:'아래에서 부드럽게 올라오며 또렷하게 등장하는 절제된 모션.',duration:0.82,previewClass:'motion-reveal-up'},
]

export const getMotionRecipe=id=>MOTION_RECIPES.find(r=>r.id===id)||MOTION_RECIPES[0]

const scaled=(v,intensity)=>({
  x:(v.x||0)*intensity,
  y:(v.y||0)*intensity,
  scale:1+((v.scale??1)-1)*intensity,
  rotation:(v.rotation||0)*intensity,
  opacity:v.opacity??1,
})

export function buildRecipeKeyframes(id,duration,intensity=1,finalOpacity=1){
  const d=duration||getMotionRecipe(id).duration
  const i=clamp(Number(intensity)||1,.45,1.6)
  let frames
  switch(id){
    case 'float-settle':
      frames=[[0,{y:26,scale:.96,rotation:-2,opacity:0}],[.62,{y:-6,scale:1.025,rotation:1,opacity:1}],[1,{opacity:1}]]
      break
    case 'snap-slide':
      frames=[[0,{x:-52,scale:.98,opacity:0}],[.68,{x:9,scale:1.015,opacity:1}],[1,{opacity:1}]]
      break
    case 'tilt-spring':
      frames=[[0,{scale:.88,rotation:-9,opacity:0}],[.56,{scale:1.07,rotation:4,opacity:1}],[.78,{scale:.985,rotation:-1.5,opacity:1}],[1,{opacity:1}]]
      break
    case 'focus-pulse':
      frames=[[0,{scale:.96,opacity:1}],[.46,{scale:1.11,opacity:1}],[.72,{scale:1.025,opacity:1}],[1,{opacity:1}]]
      break
    case 'reveal-up':
      frames=[[0,{y:34,scale:.985,opacity:0}],[.72,{y:-3,scale:1.008,opacity:1}],[1,{opacity:1}]]
      break
    case 'soft-pop':
    default:
      frames=[[0,{scale:.76,opacity:0}],[.56,{scale:1.09,opacity:1}],[.78,{scale:.985,opacity:1}],[1,{opacity:1}]]
  }
  return frames.map(([ratio,v])=>{
    const s=scaled(v,i)
    return point(ratio*d,{...s,opacity:(v.opacity??1)*finalOpacity})
  })
}
