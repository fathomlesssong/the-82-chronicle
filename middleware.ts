import { next } from '@vercel/functions';

const COOKIE_NAME='kronika82_access';
const TOKEN_MESSAGE='kronika82-access-v1';

const ADMIN_API_PATHS=new Set([
  '/api/invite-user',
  '/api/update-user',
  '/api/newsletter-send',
  '/api/newsletter-unsubscribe'
]);

function isAdminPath(pathname){
  return (
    pathname==='/admin.html' ||
    pathname==='/reset-password.html' ||
    pathname.startsWith('/admin-') ||
    pathname==='/redakcja' ||
    pathname.startsWith('/redakcja/')
  );
}

function isStaticAsset(pathname){
  return (
    pathname.startsWith('/assets/') ||
    /\.(?:css|js|mjs|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|map)$/i.test(pathname)
  );
}

function cookieValue(request,name){
  const raw=request.headers.get('cookie')||'';

  for(const part of raw.split(';')){
    const index=part.indexOf('=');

    if(index<0)continue;

    const key=part.slice(0,index).trim();

    if(key===name){
      return part.slice(index+1).trim();
    }
  }

  return '';
}

function toHex(buffer){
  return [...new Uint8Array(buffer)]
    .map(byte=>byte.toString(16).padStart(2,'0'))
    .join('');
}

async function expectedToken(password){
  const encoder=new TextEncoder();

  const key=await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    {
      name:'HMAC',
      hash:'SHA-256'
    },
    false,
    ['sign']
  );

  const signature=await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(TOKEN_MESSAGE)
  );

  return toHex(signature);
}

function unauthorizedApi(){
  return new Response(
    JSON.stringify({
      error:'Dostęp do Kroniki 82 wymaga hasła.'
    }),
    {
      status:401,
      headers:{
        'content-type':'application/json; charset=utf-8',
        'cache-control':'no-store',
        'x-robots-tag':'noindex, nofollow, noarchive'
      }
    }
  );
}

export const config={
  matcher:'/:path*'
};

export default async function middleware(request){
  const url=new URL(request.url);
  const pathname=url.pathname;

  if(
    pathname==='/wejscie.html' ||
    pathname==='/api/access' ||
    pathname==='/robots.txt' ||
    isAdminPath(pathname) ||
    ADMIN_API_PATHS.has(pathname) ||
    isStaticAsset(pathname)
  ){
    return next();
  }

  const password=process.env.KRONIKA_ACCESS_PASSWORD;

  if(!password){
    return new Response(
      'Kronika 82: brak konfiguracji hasła dostępu.',
      {
        status:503,
        headers:{
          'content-type':'text/plain; charset=utf-8',
          'cache-control':'no-store',
          'x-robots-tag':'noindex, nofollow, noarchive'
        }
      }
    );
  }

  const supplied=cookieValue(request,COOKIE_NAME);
  const expected=await expectedToken(password);

  if(supplied===expected){
    return next();
  }

  if(pathname.startsWith('/api/')){
    return unauthorizedApi();
  }

  const loginUrl=new URL('/wejscie.html',request.url);

  loginUrl.searchParams.set(
    'next',
    `${pathname}${url.search}`
  );

  return Response.redirect(loginUrl,303);
}
