((root,factory)=>{
  const api=factory(root);

  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root.document){
    root.CH82ArticleLayout=api;
    api.observeArticleLayouts(root.document);
  }
})(typeof globalThis!=='undefined'?globalThis:this,root=>{
  const imageSelector='.article-hero img';

  const classifyImageDimensions=(width,height)=>{
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
    return width<=height?'compact':'wide';
  };

  const applyImageLayout=img=>{
    const figure=img.closest('.article-hero');
    const content=figure?.closest('.article-content');
    if(!figure||!content)return null;
    const layout=classifyImageDimensions(img.naturalWidth,img.naturalHeight);
    const isCompact=layout==='compact';
    figure.classList.toggle('article-hero--compact',isCompact);
    content.classList.toggle('article-content--compact',isCompact);
    if(layout)figure.dataset.imageLayout=layout;
    else delete figure.dataset.imageLayout;
    return layout;
  };

  const bindImage=img=>{
    if(img.dataset.articleLayoutBound)return;
    img.dataset.articleLayoutBound='true';
    if(img.complete)applyImageLayout(img);
    else{
      const finish=()=>{
        img.removeEventListener('load',finish);
        img.removeEventListener('error',finish);
        applyImageLayout(img);
      };
      img.addEventListener('load',finish);
      img.addEventListener('error',finish);
    }
  };

  const scan=root=>{
    if(root.matches?.(imageSelector))bindImage(root);
    root.querySelectorAll?.(imageSelector).forEach(bindImage);
  };

  const observeArticleLayouts=documentRoot=>{
    scan(documentRoot);
    const observer=new root.MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(scan)));
    observer.observe(documentRoot.documentElement,{childList:true,subtree:true});
    return observer;
  };

  return {classifyImageDimensions,applyImageLayout,bindImage,observeArticleLayouts};
});
