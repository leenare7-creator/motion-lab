import { buildMotionPlanKeyframes, normalizeMotionPlan } from '../src/lib/motionRecipes.js'
import { normalizeDirectorResult } from '../src/lib/motionDirectorSchema.js'

const sample={
  source:'ai',
  analysis:{
    category:'illustration',subject:'sample mascot',composition:'centered',visualWeight:'centered',
    direction:'neutral',personality:'friendly',complexity:'layered',
    motionOpportunity:'layered expression',caution:'keep silhouette',summary:'sample',
    traits:['illustration','layered'],
    parts:[{name:'Star',role:'accent',importance:.9}]
  },
  ideas:[
    {recipeId:'float-settle',title:'Gentle',lane:'Safe',rationale:'safe',motionIntent:'calm',confidence:.9,plan:{recipeId:'float-settle',duration:1,amplitude:.8,direction:'up',overshoot:.8,rotation:.4,layerStrategy:'stagger-children',stagger:.07,easing:'smooth',targetLayerNames:['Body','Star'],accentLayerNames:['Star']}},
    {recipeId:'snap-slide',title:'Snap',lane:'Expressive',rationale:'expressive',motionIntent:'directional',confidence:.8,plan:{recipeId:'snap-slide',duration:.7,amplitude:1,direction:'right',overshoot:.8,rotation:.2,layerStrategy:'whole',stagger:.05,easing:'snappy',targetLayerNames:[],accentLayerNames:[]}},
    {recipeId:'tilt-spring',title:'Play',lane:'Playful',rationale:'playful',motionIntent:'character',confidence:.8,plan:{recipeId:'tilt-spring',duration:.9,amplitude:1,direction:'none',overshoot:1,rotation:1,layerStrategy:'accent-first',stagger:.06,easing:'spring',targetLayerNames:['Body','Star'],accentLayerNames:['Star']}}
  ]
}

const result=normalizeDirectorResult(sample,{name:'sample.svg',width:256,height:256,structure:{leafCount:4}})
if(result.ideas.length!==3)throw new Error('expected 3 ideas')
if(new Set(result.ideas.map(x=>x.recipeId)).size!==3)throw new Error('recipes must differ')
for(const idea of result.ideas){
  const plan=normalizeMotionPlan(idea.plan)
  const frames=buildMotionPlanKeyframes(plan,1,1,0)
  if(frames.length<3)throw new Error('not enough keyframes')
  if(frames.some((f,i)=>i&&f.t<frames[i-1].t))throw new Error('keyframes out of order')
}
console.log('motion director contract ok')
