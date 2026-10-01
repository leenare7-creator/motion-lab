import React, { useEffect, useMemo, useRef } from 'react'
import { buildMotionPlanKeyframes, normalizeMotionPlan } from '../lib/motionRecipes'

const easingMap={
  spring:'cubic-bezier(.2,.9,.2,1)',
  snappy:'cubic-bezier(.2,.8,.2,1)',
  smooth:'cubic-bezier(.2,0,0,1)',
  linear:'linear',
}

export default function MotionIdeaPreview({src,idea}){
  const ref=useRef(null)
  const plan=useMemo(()=>normalizeMotionPlan(idea?.plan||{recipeId:idea?.recipeId||'soft-pop'}),[idea])

  useEffect(()=>{
    const el=ref.current
    if(!el)return
    const frames=buildMotionPlanKeyframes(plan,1,1,0)
    const hold=.55
    const cycle=plan.duration+hold
    const keyframes=frames.map(f=>({
      offset:Math.max(0,Math.min(1,f.t/cycle)),
      transform:`translate(${f.transform.x}px,${f.transform.y}px) scale(${f.transform.scale}) rotate(${f.transform.rotation}deg)`,
      opacity:f.opacity
    }))
    const last=keyframes[keyframes.length-1]||{transform:'none',opacity:1}
    keyframes.push({...last,offset:1})

    const animation=el.animate(keyframes,{
      duration:cycle*1000,
      iterations:Infinity,
      easing:easingMap[plan.easing]||easingMap.spring,
      fill:'both'
    })
    return()=>animation.cancel()
  },[plan])

  return <img ref={ref} className="idea-object" src={src} alt=""/>
}
