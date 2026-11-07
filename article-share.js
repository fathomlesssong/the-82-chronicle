(()=>{
  const match=location.pathname.match(/^\/a\/([^/]+)\/?$/);
  const slug=match?decodeURIComponent(match[1]):new URLSearchParams(location.search).get('slug');
  if(!slug)return;
  const url='https://kronika82.vercel.app/s/'+encodeURIComponent(slug);
  function mount(){
    const article=document.querySelector('.article-header');
    if(!article||document.querySelector('[data-share-actions]'))return false;
    const box=document.createElement('div');box.dataset.shareActions='';
    const whatsapp=document.createElement('a');
    whatsapp.className='share-whatsapp';
    whatsapp.href='https://wa.me/?text='+encodeURIComponent((article.querySelector('h1')?.textContent||'').trim()+'\n'+url);
    whatsapp.target='_blank';whatsapp.rel='noopener noreferrer';
    whatsapp.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="currentColor"><path d="M20.52 3.48A11.9 11.9 0 0 0 12.05 0C5.47 0 .12 5.35.12 11.93c0 2.1.55 4.15 1.6 5.96L0 24l6.26-1.64a11.9 11.9 0 0 0 5.79 1.48h.01C18.64 23.84 24 18.49 24 11.91c0-3.18-1.24-6.18-3.48-8.43ZM12.06 21.83a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.97.99-3.63-.24-.37a9.9 9.9 0 0 1-1.52-5.28c0-5.47 4.45-9.92 9.93-9.92a9.85 9.85 0 0 1 7.02 2.91 9.85 9.85 0 0 1 2.9 7.02c0 5.47-4.45 9.89-9.96 9.89Zm5.44-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.11.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z"/></svg>';
    whatsapp.append(document.createTextNode('Udostępnij na WhatsAppie'));
    const share=document.createElement('button');share.type='button';share.textContent='Udostępnij';
    const copy=document.createElement('button');copy.type='button';copy.textContent='Kopiuj link';
    const notice=document.createElement('p');notice.setAttribute('role','status');
    const link=document.createElement('a');link.href=url;link.textContent='Link do udostępnienia';
    share.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:article.querySelector('h1')?.textContent,url});else await copyLink();}catch(error){if(error.name!=='AbortError')notice.textContent='Użyj linku do udostępnienia poniżej.';}});
    async function copyLink(){try{await navigator.clipboard.writeText(url);notice.textContent='Skopiowano link z podglądem.';}catch(_error){notice.textContent='Skopiuj adres z linku poniżej.';}}
    copy.addEventListener('click',copyLink);box.append(whatsapp,' ',share,' ',copy,' ',link,notice);article.append(box);return true;
  }
  if(!mount()){const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}
})();
