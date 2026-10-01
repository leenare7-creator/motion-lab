import { motionProviderStatus } from './_motion-provider.mjs'

export default function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET only'})
  return res.status(200).json(motionProviderStatus())
}
