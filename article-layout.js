(()=>{
  const imageSelector='.article-hero img';

  const applyLayout=img=>{
    if(!img.naturalWidth||!img.naturalHeight)return;
    const figure=img.closest('.article-hero');
    const content=figure?.closest('.article-content');
    if(!figure||!content)return;
    const isCompact=img.naturalWidth<=img.naturalHeight;
    figure.classList.toggle('article-hero--compact',isCompact);
    content.classList.toggle('article-content--compact',isCompact);
    figure.dataset.imageLayout=isCompact?'compact':'wide';
  };

  const bindImage=img=>{
    if(img.dataset.articleLayoutBound)return;
    img.dataset.articleLayoutBound='true';
    if(img.complete)applyLayout(img);
    else img.addEventListener('load',()=>applyLayout(img),{once:true});
  };

  const scan=root=>{
    if(root.matches?.(imageSelector))bindImage(root);
    root.querySelectorAll?.(imageSelector).forEach(bindImage);
  };

  scan(document);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(scan)))
    .observe(document.documentElement,{childList:true,subtree:true});
})();
