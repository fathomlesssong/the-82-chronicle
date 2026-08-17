const crypto=require('crypto');
const {requiredEnv}=require('../lib/supabase-server');

const MAX_IMAGE_BYTES=10*1024*1024;
const MIME_EXT={
  'image/jpeg':'jpg',
  'image/png':'png',
  'image/webp':'webp',
  'image/gif':'gif'
};

const json=(res,status,body)=>{
  res.statusCode=status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

const timingSafeEqual=(a,b)=>{
  const left=Buffer.from(String(a||''));
  const right=Buffer.from(String(b||''));
  return left.length===right.length&&crypto.timingSafeEqual(left,right);
};

const serviceAuthHeaders=serviceKey=>{
  const headers={apikey:serviceKey};
  if(!String(serviceKey).startsWith('sb_secret_'))headers.authorization=`Bearer ${serviceKey}`;
  return headers;
};

const publicImageUrl=(url,path)=>`${url}/storage/v1/object/public/banner-images/${path.split('/').map(encodeURIComponent).join('/')}`;

module.exports=async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('allow','POST');
    return json(res,405,{ok:false,error:'Method not allowed.'});
  }

  try{
    const expectedSecret=process.env.BANNER_PUBLISH_SECRET;
    if(!expectedSecret)return json(res,503,{ok:false,error:'Banner publish API is not configured.'});

    const suppliedSecret=req.headers['x-banner-publish-secret'];
    if(!timingSafeEqual(suppliedSecret,expectedSecret))return json(res,401,{ok:false,error:'Unauthorized.'});

    const body=req.body&&typeof req.body==='object'?req.body:{};
    const name=String(body.name||'').trim();
    const slot=String(body.slot||'').trim();
    const mimeType=String(body.mime_type||'').trim().toLowerCase();
    const imageBase64=String(body.image_base64||'').replace(/^data:[^;]+;base64,/, '').replace(/\s/g,'');
    const targetUrl=String(body.target_url||'').trim();
    const active=body.active!==false;
    const sortOrder=Number.isInteger(body.sort_order)?body.sort_order:100;

    if(!name)return json(res,400,{ok:false,error:'Banner name is required.'});
    if(!['vertical','horizontal'].includes(slot))return json(res,400,{ok:false,error:'Invalid banner slot.'});
    if(!MIME_EXT[mimeType])return json(res,400,{ok:false,error:'Unsupported image type.'});
    if(!imageBase64)return json(res,400,{ok:false,error:'image_base64 is required.'});
    if(targetUrl){
      let parsed;
      try{parsed=new URL(targetUrl);}catch(_error){return json(res,400,{ok:false,error:'Invalid target URL.'});}
      if(!['http:','https:'].includes(parsed.protocol))return json(res,400,{ok:false,error:'Invalid target URL protocol.'});
    }

    let image;
    try{image=Buffer.from(imageBase64,'base64');}catch(_error){return json(res,400,{ok:false,error:'Invalid base64 image.'});}
    if(!image.length)return json(res,400,{ok:false,error:'Image is empty.'});
    if(image.length>MAX_IMAGE_BYTES)return json(res,413,{ok:false,error:'Banner exceeds 10 MB.'});

    const {url,serviceKey}=requiredEnv();
    const ext=MIME_EXT[mimeType];
    const storagePath=`automation/${crypto.randomUUID()}.${ext}`;
    const encodedPath=storagePath.split('/').map(encodeURIComponent).join('/');
    const authHeaders=serviceAuthHeaders(serviceKey);

    const uploadResponse=await fetch(`${url}/storage/v1/object/banner-images/${encodedPath}`,{
      method:'POST',
      headers:{...authHeaders,'content-type':mimeType,'x-upsert':'false'},
      body:image
    });
    if(!uploadResponse.ok){
      const detail=await uploadResponse.text();
      throw Object.assign(new Error(`Banner upload failed: ${detail||uploadResponse.status}`),{status:502});
    }

    const imageUrl=publicImageUrl(url,storagePath);
    const insertResponse=await fetch(`${url}/rest/v1/banners`,{
      method:'POST',
      headers:{...authHeaders,'content-type':'application/json','prefer':'return=representation'},
      body:JSON.stringify({
        name,
        slot,
        image_url:imageUrl,
        storage_path:storagePath,
        target_url:targetUrl||null,
        active,
        sort_order:sortOrder
      })
    });

    if(!insertResponse.ok){
      await fetch(`${url}/storage/v1/object/banner-images/${encodedPath}`,{method:'DELETE',headers:authHeaders}).catch(()=>{});
      const detail=await insertResponse.text();
      throw Object.assign(new Error(`Banner database insert failed: ${detail||insertResponse.status}`),{status:502});
    }

    const rows=await insertResponse.json();
    const banner=Array.isArray(rows)?rows[0]:rows;
    return json(res,201,{ok:true,banner:{id:banner?.id||null,name,slot,image_url:imageUrl,target_url:targetUrl||null,active,sort_order:sortOrder}});
  }catch(error){
    console.error('banner-publish error',error);
    return json(res,error?.status||500,{ok:false,error:error?.message||'Banner publish failed.'});
  }
};
