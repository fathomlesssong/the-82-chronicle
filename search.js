(()=>{
  const truncateQuery=(value,maxCodePoints)=>Array.from(String(value||'')).slice(0,maxCodePoints).join('');
  const input=document.querySelector('[data-search-input]');
  const status=document.querySelector('[data-search-status]');
  const results=document.querySelector('[data-search-results]');
  if(!input||!status||!results)return;

  const query=truncateQuery(String(new URLSearchParams(window.location.search).get('q')||'').trim(),120);
  input.value=query;

  const setStatus=message=>{
    status.textContent=message;
  };

  const safeImageUrl=value=>{
    const raw=String(value||'').trim();
    if(raw.startsWith('/')&&!raw.startsWith('//')&&!raw.startsWith('/\\'))return raw;
    try{
      const url=new URL(raw);
      return url.protocol==='https:'?url.href:null;
    }catch(_error){
      return null;
    }
  };

  const formattedDate=value=>{
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return '';
    return date.toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'});
  };

  const resultNode=item=>{
    const article=document.createElement('article');
    article.className='search-result';
    const href=`/a/${encodeURIComponent(String(item.slug||''))}`;
    const imageUrl=safeImageUrl(item.image_url);

    if(imageUrl){
      const mediaLink=document.createElement('a');
      mediaLink.className='search-result-media';
      mediaLink.href=href;
      mediaLink.tabIndex=-1;
      const image=document.createElement('img');
      image.src=imageUrl;
      image.alt=String(item.image_alt||'');
      image.loading='lazy';
      image.decoding='async';
      mediaLink.append(image);
      article.append(mediaLink);
    }else{
      article.classList.add('search-result--no-image');
    }

    const copy=document.createElement('div');
    copy.className='search-result-copy';

    if(item.section){
      const section=document.createElement('span');
      section.className='section-label';
      section.textContent=String(item.section);
      copy.append(section);
    }

    const title=document.createElement('h3');
    const titleLink=document.createElement('a');
    titleLink.href=href;
    titleLink.textContent=String(item.title||'');
    title.append(titleLink);
    copy.append(title);

    const dateLabel=formattedDate(item.published_at);
    if(dateLabel){
      const time=document.createElement('time');
      time.className='search-result-date';
      time.dateTime=String(item.published_at);
      time.textContent=dateLabel;
      copy.append(time);
    }

    const snippet=document.createElement('p');
    snippet.className='search-result-snippet';
    snippet.textContent=String(item.snippet||'');
    copy.append(snippet);
    article.append(copy);
    return article;
  };

  const load=async()=>{
    if(!query){
      setStatus('Wpisz słowo lub frazę, aby przeszukać artykuły.');
      return;
    }

    setStatus('Wyszukiwanie…');

    try{
      const response=await fetch(`/api/search?q=${encodeURIComponent(query)}`,{
        headers:{accept:'application/json'}
      });
      if(!response.ok)throw new Error('Search request failed.');
      const payload=await response.json();
      const items=Array.isArray(payload.results)?payload.results:[];
      results.replaceChildren(...items.map(resultNode));
      setStatus(items.length
        ?`Znaleziono: ${items.length}.`
        :'Nie znaleziono opublikowanych artykułów dla tego zapytania.');
    }catch(_error){
      results.replaceChildren();
      setStatus('Nie udało się teraz wyszukać artykułów. Spróbuj ponownie później.');
    }
  };

  load();
})();
