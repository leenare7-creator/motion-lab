export default function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET only'})
  return res.status(200).json({
    configured:Boolean(process.env.OPENAI_API_KEY),
    provider:'openai',
    model:process.env.OPENAI_MOTION_MODEL||'gpt-6-luna'
  })
}
