const {
  createHash,
  createHmac,
  timingSafeEqual
}=require('crypto');

const COOKIE_NAME='kronika82_access';
const TOKEN_MESSAGE='kronika82-access-v1';
const THIRTY_DAYS=60*60*24*30;

const hash=value=>
  createHash('sha256')
    .update(String(value),'utf8')
    .digest();

const validPassword=(supplied,expected)=>
  timingSafeEqual(
    hash(supplied),
    hash(expected)
  );

const accessToken=password=>
  createHmac('sha256',password)
    .update(TOKEN_MESSAGE,'utf8')
    .digest('hex');

const safeNext=value=>{
  const next=String(value||'/').trim();

  if(
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.startsWith('/api/access') ||
    next.startsWith('/wejscie.html')
  ){
    return '/';
  }

  return next;
};

async function bodyFromRequest(req){
  if(
    req.body &&
    typeof req.body==='object' &&
    !Buffer.isBuffer(req.body)
  ){
    return req.body;
  }

  if(typeof req.body==='string'){
    return Object.fromEntries(
      new URLSearchParams(req.body)
    );
  }

  let raw='';

  for await(const chunk of req){
    raw+=chunk;
  }

  return Object.fromEntries(
    new URLSearchParams(raw)
  );
}

module.exports=async(req,res)=>{
  res.setHeader('cache-control','no-store');
  res.setHeader(
    'x-robots-tag',
    'noindex, nofollow, noarchive'
  );

  if(req.method!=='POST'){
    res.setHeader('allow','POST');

    return res
      .status(405)
      .send('Method not allowed');
  }

  const expected=
    process.env.KRONIKA_ACCESS_PASSWORD;

  if(!expected){
    return res
      .status(503)
      .send(
        'Brak konfiguracji hasła Kroniki 82.'
      );
  }

  const body=await bodyFromRequest(req);

  const supplied=
    String(body.password||'').slice(0,500);

  const next=safeNext(body.next);

  if(!validPassword(supplied,expected)){
    const target=
      '/wejscie.html?error=1&next='+
      encodeURIComponent(next);

    res.setHeader('location',target);

    return res.status(303).end();
  }

  const token=accessToken(expected);

  res.setHeader(
    'set-cookie',
    `${COOKIE_NAME}=${token}; Path=/; Max-Age=${THIRTY_DAYS}; HttpOnly; Secure; SameSite=Lax`
  );

  res.setHeader('location',next);

  return res.status(303).end();
};
