import { MOTION_RECIPES } from './motionRecipes'

const allowed=new Set(MOTION_RECIPES.map(r=>r.id))

function localIdeas(asset,variation=0){
  const n=(asset.name||'').toLowerCase()
  const square=Math.abs((asset.width||1)/(asset.height||1)-1)<.28
  let ids
  if(/illustration|character|mascot|illust|캐릭터|일러스트/.test(n)) ids=['float-settle','tilt-spring','reveal-up']
  else if(/icon|logo|button|symbol|아이콘|로고/.test(n)||square) ids=['soft-pop','focus-pulse','tilt-spring']
  else ids=['soft-pop','reveal-up','snap-slide']
  if(variation%2) ids=[ids[1],ids[2],ids[0]]
  const lanes=['Safe','Expressive','Playful']
  return {
    source:'local',
    analysis:{
      summary:square?'중심이 명확한 컴팩트 그래픽으로 판단했어요.':'가로세로 흐름이 있는 그래픽으로 판단했어요.',
      traits:[square?'compact':'directional',asset.mime?.includes('svg')?'vector':'raster','single-object'],
    },
    ideas:ids.map((id,i)=>{
      const r=MOTION_RECIPES.find(x=>x.id===id)
      return {recipeId:id,title:r.name,lane:lanes[i],rationale:r.description,confidence:.7}
    })
  }
}

export async function suggestMotionIdeas(asset,variation=0){
  try{
    const res=await fetch('/api/motion-director',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        imageDataUrl:asset.visionDataUrl,
        fileName:asset.name,
        mime:asset.mime,
        width:asset.width,
        height:asset.height,
        variation,
        recipes:MOTION_RECIPES.map(({id,name,lane,description})=>({id,name,lane,description}))
      })
    })
    if(!res.ok) throw new Error('director unavailable')
    const data=await res.json()
    const ideas=(data.ideas||[]).filter(x=>allowed.has(x.recipeId)).slice(0,3)
    if(ideas.length!==3) throw new Error('invalid ideas')
    return {...data,ideas}
  }catch{
    return localIdeas(asset,variation)
  }
}
