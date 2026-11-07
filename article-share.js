(()=>{
  const match=location.pathname.match(/^\/a\/([^/]+)\/?$/);
  const slug=match?decodeURIComponent(match[1]):new URLSearchParams(location.search).get('slug');
  if(!slug)return;
  const url='https://kronika82.vercel.app/s/'+encodeURIComponent(slug);
  function mount(){
    const article=document.querySelector('.article-header');
    if(!article||document.querySelector('[data-share-actions]'))return false;
    const box=document.createElement('div');box.dataset.shareActions='';
    const share=document.createElement('button');share.type='button';share.textContent='Udostępnij';
    const copy=document.createElement('button');copy.type='button';copy.textContent='Kopiuj link';
    const notice=document.createElement('p');notice.setAttribute('role','status');
    const link=document.createElement('a');link.href=url;link.textContent='Link do udostępnienia';
    share.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:article.querySelector('h1')?.textContent,url});else await copyLink();}catch(error){if(error.name!=='AbortError')notice.textContent='Użyj linku do udostępnienia poniżej.';}});
    async function copyLink(){try{await navigator.clipboard.writeText(url);notice.textContent='Skopiowano link z podglądem.';}catch(_error){notice.textContent='Skopiuj adres z linku poniżej.';}}
    copy.addEventListener('click',copyLink);box.append(share,' ',copy,' ',link,notice);article.append(box);return true;
  }
  if(!mount()){const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}
})();
