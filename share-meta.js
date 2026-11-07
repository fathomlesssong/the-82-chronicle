(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.CH82ShareMeta=factory();
})(typeof window!=='undefined'?window:this,function(){
  const origin='https://kronika82.vercel.app';
  const fallback=origin+'/assets/og-image.png';
  const text=value=>String(value||'').replace(/\s+/g,' ').trim();
  function metadata(article,supabaseUrl=''){
    let image=fallback;
    try{
      const candidate=new URL(article.image_url||'',origin);
      const storageOrigin=supabaseUrl?new URL(supabaseUrl).origin:null;
      if(candidate.protocol==='https:'&&!candidate.username&&!candidate.password&&[...candidate.searchParams.keys()].every(key=>key==='v')&&!candidate.hash&&(
        (candidate.origin===origin&&candidate.pathname.startsWith('/assets/'))||
        (candidate.origin===storageOrigin&&candidate.pathname.startsWith('/storage/v1/object/public/article-images/'))
      ))image=candidate.href;
    }catch(_error){}
    return {title:text(article.title)||'Kronika 82',description:text(article.summary)||'Wiadomości spod numeru 82.',image,url:origin+'/s/'+encodeURIComponent(article.slug||'')};
  }
  return {metadata,origin,fallback};
});
