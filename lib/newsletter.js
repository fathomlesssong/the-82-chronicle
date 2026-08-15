const crypto=require('node:crypto');

const normalizeEmail=value=>String(value||'').trim().toLowerCase();
const isValidEmail=email=>email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const cleanText=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const siteUrl=()=>String(process.env.SITE_URL||'https://the82chronicle.vercel.app').replace(/\/$/,'');

function excerpt(summary,content,max=440){
  const lead=cleanText(summary);
  const body=cleanText(content);
  const joined=body&&lead&&!body.toLowerCase().startsWith(lead.toLowerCase())?`${lead} ${body}`:(body||lead);
  if(joined.length<=max)return joined;
  const shortened=joined.slice(0,max+1).replace(/\s+\S*$/,'').replace(/[\s,;:.-]+$/,'');
  return `${shortened}…`;
}

function newsletterSecret(){
  const secret=process.env.NEWSLETTER_SIGNING_SECRET||'';
  if(secret.length<32)throw Object.assign(new Error('Newsletter signing secret is not configured.'),{status:503});
  return secret;
}

function unsubscribeToken(email){
  return crypto.createHmac('sha256',newsletterSecret()).update(normalizeEmail(email)).digest('hex');
}

function validUnsubscribeToken(email,token){
  if(!/^[a-f0-9]{64}$/i.test(String(token||'')))return false;
  const expected=Buffer.from(unsubscribeToken(email),'hex');
  const supplied=Buffer.from(String(token),'hex');
  return expected.length===supplied.length&&crypto.timingSafeEqual(expected,supplied);
}

function unsubscribeUrl(email){
  const normalized=normalizeEmail(email);
  const params=new URLSearchParams({email:normalized,token:unsubscribeToken(normalized)});
  return `${siteUrl()}/api/newsletter-unsubscribe?${params}`;
}

function absoluteUrl(value,fallback){
  const candidate=String(value||fallback||'');
  if(/^https?:\/\//i.test(candidate))return candidate;
  return `${siteUrl()}${candidate.startsWith('/')?'':'/'}${candidate}`;
}

function renderNewsletter({article,recipient,mode='article'}){
  const isUpdate=mode==='update';
  const articleUrl=`${siteUrl()}/a/${encodeURIComponent(article.slug)}`;
  const removeUrl=unsubscribeUrl(recipient);
  const image=absoluteUrl(article.image_url,'/assets/og-image.png');
  const teaser=cleanText(article.newsletter_teaser)||excerpt(article.summary,article.content);
  const label=isUpdate?'AKTUALIZACJA':'NOWY ARTYKUŁ';
  const subject=`${isUpdate?'AKTUALIZACJA: ':''}${cleanText(article.title)} • Kronika 82`;
  const preheader=isUpdate?`Aktualizacja: ${teaser}`:teaser;
  const html=`<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;background:#eee8dc;color:#171512;font-family:Georgia,'Times New Roman',serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee8dc"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#f7f3e9;border-top:6px double #24211d;border-bottom:6px double #24211d">
<tr><td style="padding:28px 28px 18px;text-align:center;border-bottom:1px solid #24211d"><div style="font-size:42px;font-weight:700;line-height:1;letter-spacing:-2px">Kronika 82</div><div style="margin-top:9px;color:#6e685e;font:11px Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase">Wiadomości spod numeru 82</div></td></tr>
<tr><td style="padding:25px 28px 10px"><div style="display:inline-block;padding:6px 9px;border:2px solid #7a1111;color:#7a1111;font:bold 11px Arial,sans-serif;letter-spacing:1.2px">${label}</div><h1 style="margin:14px 0 12px;font-size:36px;line-height:1.04;letter-spacing:-1px">${esc(article.title)}</h1><p style="margin:0;color:#3d3831;font-size:20px;line-height:1.45">${esc(article.summary)}</p></td></tr>
<tr><td style="padding:18px 28px 0"><img src="${esc(image)}" alt="${esc(article.image_alt||article.title)}" width="584" style="display:block;width:100%;height:auto;border:1px solid #4b443b"></td></tr>
<tr><td style="padding:23px 28px 10px">${isUpdate?'<div style="margin-bottom:8px;color:#7a1111;font:bold 12px Arial,sans-serif;letter-spacing:1px;text-transform:uppercase">Nowy fragment</div>':''}<p style="margin:0;font-size:17px;line-height:1.65">${esc(teaser)}</p></td></tr>
<tr><td style="padding:18px 28px 30px"><a href="${esc(articleUrl)}" style="display:inline-block;padding:13px 19px;background:#171512;color:#f7f3e9;font:bold 12px Arial,sans-serif;letter-spacing:1px;text-decoration:none;text-transform:uppercase">Czytaj dalej</a></td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #b8afa0;color:#6e685e;font:11px/1.5 Arial,sans-serif;text-align:center">Newsletter Kroniki 82.<br><a href="${esc(removeUrl)}" style="color:#6e685e;text-decoration:underline">Wypisz się z newslettera</a></td></tr>
</table></td></tr></table></body></html>`;
  const text=['THE 82 CHRONICLE',label,'',cleanText(article.title),'',cleanText(article.summary),'',teaser,'',`Czytaj dalej: ${articleUrl}`,'',`Wypisz się: ${removeUrl}`].join('\n');
  return {subject,html,text,articleUrl,removeUrl};
}

function configured(){
  return Boolean(process.env.RESEND_API_KEY&&process.env.NEWSLETTER_FROM&&(process.env.NEWSLETTER_SIGNING_SECRET||'').length>=32);
}

async function sendWithResend({to,subject,html,text,removeUrl,idempotencyKey}){
  if(!configured())throw Object.assign(new Error('Wysyłka czeka na konfigurację Resend i sekretu newslettera.'),{status:503});
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json','idempotency-key':idempotencyKey},
    body:JSON.stringify({
      from:process.env.NEWSLETTER_FROM,to:[to],subject,html,text,
      headers:{'List-Unsubscribe':`<${removeUrl}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}
    })
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(result.message||'Resend odrzucił wiadomość.'),{status:502});
  return result;
}

function deliveryKey(article,recipient,mode){
  const version=mode==='update'?(article.update_at||article.updated_at||'update'):'article';
  return `chronicle-${crypto.createHash('sha256').update(`${article.id}:${version}:${normalizeEmail(recipient)}`).digest('hex')}`;
}

module.exports={normalizeEmail,isValidEmail,excerpt,siteUrl,unsubscribeToken,validUnsubscribeToken,unsubscribeUrl,renderNewsletter,configured,sendWithResend,deliveryKey};
