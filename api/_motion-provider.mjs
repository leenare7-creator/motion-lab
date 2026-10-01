const JSON_FENCE=/^```(?:json)?\s*([\s\S]*?)\s*```$/i;

function stripJsonFence(value=''){
  const text=String(value).trim();
  const match=JSON_FENCE.exec(text);
  return match?match[1].trim():text;
}

function dataUrlParts(value){
  const match=/^data:([^;]+);base64,(.+)$/.exec(value||'');
  if(!match)return null;
  return {mediaType:match[1]||'image/png',data:match[2]};
}

function openAIOutputText(data){
  if(typeof data?.output_text==='string')return data.output_text;
  for(const item of data?.output||[]){
    if(item?.type!=='message')continue;
    for(const part of item.content||[]){
      if(part?.type==='output_text'&&typeof part.text==='string')return part.text;
    }
  }
  return '';
}

function anthropicOutputText(data){
  return (data?.content||[])
    .filter(part=>part?.type==='text'&&typeof part.text==='string')
    .map(part=>part.text)
    .join('\n');
}

export function selectedMotionProvider(){
  return (process.env.MOTION_AI_PROVIDER||'openai').toLowerCase();
}

export function motionProviderStatus(){
  const provider=selectedMotionProvider();

  if(provider==='anthropic'){
    const model=process.env.ANTHROPIC_MOTION_MODEL||null;
    return {
      provider,
      configured:Boolean(process.env.ANTHROPIC_API_KEY&&model),
      model,
    };
  }

  if(provider==='openai'){
    return {
      provider,
      configured:Boolean(process.env.OPENAI_API_KEY),
      model:process.env.OPENAI_MOTION_MODEL||'gpt-6-luna',
    };
  }

  return {provider,configured:false,model:null};
}

export async function completeMotionDirector({systemPrompt,prompt,image,jsonSchema,maxOutputTokens=1600}){
  const status=motionProviderStatus();
  if(!status.configured){
    throw new Error(
      status.provider==='anthropic'
        ? 'Anthropic Motion provider requires ANTHROPIC_API_KEY and ANTHROPIC_MOTION_MODEL'
        : status.provider==='openai'
          ? 'OpenAI Motion provider requires OPENAI_API_KEY'
          : 'Unsupported Motion AI provider'
    );
  }

  if(status.provider==='anthropic'){
    const content=[{type:'text',text:
      prompt+
      '\n\nReturn ONLY valid JSON matching this JSON Schema exactly. No markdown fences.\n'+
      JSON.stringify(jsonSchema)
    }];

    const imageParts=dataUrlParts(image);
    if(imageParts){
      content.push({
        type:'image',
        source:{
          type:'base64',
          media_type:imageParts.mediaType,
          data:imageParts.data,
        },
      });
    }

    const response=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'x-api-key':process.env.ANTHROPIC_API_KEY,
        'anthropic-version':'2023-06-01',
        'content-type':'application/json',
      },
      body:JSON.stringify({
        model:status.model,
        max_tokens:maxOutputTokens,
        system:systemPrompt,
        messages:[{role:'user',content}],
      }),
    });

    if(!response.ok){
      const detail=await response.text();
      throw new Error('Anthropic request failed: '+response.status+' '+detail.slice(0,500));
    }

    const data=await response.json();
    const text=anthropicOutputText(data);
    if(!text)throw new Error('Anthropic Motion Director returned no output');

    return {
      provider:'anthropic',
      model:status.model,
      parsed:JSON.parse(stripJsonFence(text)),
    };
  }

  const content=[{type:'input_text',text:prompt}];
  if(image)content.push({type:'input_image',image_url:image,detail:'auto'});

  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{
      'Authorization':'Bearer '+process.env.OPENAI_API_KEY,
      'Content-Type':'application/json',
    },
    body:JSON.stringify({
      model:status.model,
      store:false,
      instructions:systemPrompt,
      input:[{role:'user',content}],
      text:{
        format:{
          type:'json_schema',
          name:'motion_director_v2',
          strict:true,
          schema:jsonSchema,
        },
      },
      max_output_tokens:maxOutputTokens,
    }),
  });

  if(!response.ok){
    const detail=await response.text();
    throw new Error('OpenAI request failed: '+response.status+' '+detail.slice(0,500));
  }

  const data=await response.json();
  const text=openAIOutputText(data);
  if(!text)throw new Error('OpenAI Motion Director returned no output');

  return {
    provider:'openai',
    model:status.model,
    parsed:JSON.parse(stripJsonFence(text)),
  };
}
