(()=>{
  const cfg=window.CH82_SUPABASE||{};
  const selector='[data-banner-slot],.home-ad-desktop,.home-ad-mobile,.article-ad';
  const rendered=new WeakSet();
  let bannersPromise=null;

  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[char]));

  const slotForTarget=target=>{
    const explicit=String(target.dataset.bannerSlot||'').trim();
    if(explicit)return explicit;
    if(target.classList.contains('home-ad-desktop'))return 'vertical';
    if(target.classList.contains('home-ad-mobile')||target.classList.contains('article-ad'))return 'horizontal';
    return '';
  };

  const targetVisibleInViewport=target=>{
    if(target.classList.contains('home-ad-desktop'))return matchMedia('(min-width:901px)').matches;
    if(target.classList.contains('home-ad-mobile'))return matchMedia('(max-width:900.98px)').matches;
    return true;
  };

  const loadBanners=async()=>{
    if(bannersPromise)return bannersPromise;
    bannersPromise=(async()=>{
      if(window.CH82_SUPABASE_READY)await window.CH82_SUPABASE_READY;
      if(!cfg.url||!cfg.anonKey||!window.supabase)return null;
      const db=window.supabase.createClient(cfg.url,cfg.anonKey);
      const {data,error}=await db
        .from('banners')
        .select('id,name,slot,image_url,target_url,sort_order,created_at')
        .eq('active',true)
        .order('slot',{ascending:true})
        .order('sort_order',{ascending:true})
        .order('created_at',{ascending:true});
      if(error){
        console.warn('Nie udało się wczytać bannerów:',error.message);
        return null;
      }
      return data||[];
    })();
    return bannersPromise;
  };

  const chooseNext=(slot,items)=>{
    if(!items.length)return null;
    const key=`kronika82-banner-last:${slot}`;
    let last='';
    try{last=localStorage.getItem(key)||'';}catch(_error){}
    const current=items.findIndex(item=>item.id===last);
    const next=items[current>=0?(current+1)%items.length:0];
    try{localStorage.setItem(key,next.id);}catch(_error){}
    return next;
  };

  const renderTarget=async target=>{
    if(!targetVisibleInViewport(target)||rendered.has(target))return;
    rendered.add(target);
    const slot=slotForTarget(target);
    if(!slot)return;
    const all=await loadBanners();
    if(all===null)return;
    const item=chooseNext(slot,all.filter(banner=>banner.slot===slot));
    if(!item){target.hidden=true;return;}

    const picture=`<picture class="ad-art"><img src="${esc(item.image_url)}" alt="${esc(item.name)}" loading="lazy" decoding="async"></picture>`;
    const media=item.target_url
      ? `<a href="${esc(item.target_url)}" target="_blank" rel="noopener noreferrer sponsored" style="display:block">${picture}</a>`
      : picture;
    target.innerHTML=`<p class="ad-label">Reklama</p>${media}`;
    target.hidden=false;
  };

  const scan=root=>{
    if(root.matches?.(selector))renderTarget(root);
    root.querySelectorAll?.(selector).forEach(renderTarget);
  };

  scan(document);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
    if(node.nodeType===1)scan(node);
  }))).observe(document.documentElement,{childList:true,subtree:true});
})();
