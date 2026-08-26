const {anonHeaders,publicEnv}=require('../lib/supabase-server');

const PAGE_SIZE=500;
const CORPUS_LIMIT=2000;
const RESULT_LIMIT=40;
const SNIPPET_LENGTH=200;
const SELECT_FIELDS='title,slug,section,section_slug,summary,content,image_url,image_alt,published_at,status';

class CorpusLimitError extends Error{}

const truncateQuery=(value,maxCodePoints)=>Array.from(String(value||'')).slice(0,maxCodePoints).join('');

const json=(res,status,payload)=>{
  res.statusCode=status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','private, no-store');
  return res.end(JSON.stringify(payload));
};

const normalizeWithMap=value=>{
  const source=String(value||'');
  let text='';
  const starts=[];
  const ends=[];

  for(let offset=0;offset<source.length;){
    const point=source.codePointAt(offset);
    const character=String.fromCodePoint(point);
    const end=offset+character.length;
    const explicitL=character==='ł'||character==='Ł'?'l':character;
    const normalized=explicitL
      .normalize('NFKD')
      .replace(/\p{M}/gu,'')
      .toLocaleLowerCase('pl-PL');

    for(const outputCharacter of normalized){
      if(/\s/u.test(outputCharacter)){
        if(text&&!text.endsWith(' ')){
          text+=' ';
          starts.push(offset);
          ends.push(end);
        }else if(text.endsWith(' ')){
          ends[ends.length-1]=end;
        }
        continue;
      }

      for(let unit=0;unit<outputCharacter.length;unit+=1){
        text+=outputCharacter[unit];
        starts.push(offset);
        ends.push(end);
      }
    }

    offset=end;
  }

  if(text.endsWith(' ')){
    text=text.slice(0,-1);
    starts.pop();
    ends.pop();
  }

  return {text,starts,ends};
};

const normalizeSearchText=value=>normalizeWithMap(value).text;

const plainText=value=>String(value||'')
  .replace(/<[^>]*>/g,' ')
  .replace(/\s+/g,' ')
  .trim();

const safeBoundary=(source,index,direction)=>{
  if(index<=0||index>=source.length)return index;
  const before=source.charCodeAt(index-1);
  const after=source.charCodeAt(index);
  const splitsPair=before>=0xd800&&before<=0xdbff&&after>=0xdc00&&after<=0xdfff;
  if(!splitsPair)return index;
  return direction==='start'?index-1:index+1;
};

const clipSnippet=(source,matchStart,matchEnd)=>{
  if(!source)return '';

  let start=Math.max(0,matchStart-Math.floor((SNIPPET_LENGTH-(matchEnd-matchStart))/2));
  let end=Math.min(source.length,start+SNIPPET_LENGTH);

  if(end===source.length)start=Math.max(0,end-SNIPPET_LENGTH);

  if(start>0){
    const nextSpace=source.indexOf(' ',start);
    if(nextSpace!==-1&&nextSpace<matchStart)start=nextSpace+1;
  }

  if(end<source.length){
    const previousSpace=source.lastIndexOf(' ',end);
    if(previousSpace>matchEnd)end=previousSpace;
  }

  start=safeBoundary(source,start,'start');
  end=safeBoundary(source,end,'end');

  return `${start>0?'…':''}${source.slice(start,end).trim()}${end<source.length?'…':''}`;
};

const snippetAround=(value,normalizedQuery)=>{
  const source=plainText(value);
  if(!source)return '';
  const mapped=normalizeWithMap(source);
  const normalizedIndex=mapped.text.indexOf(normalizedQuery);

  if(normalizedIndex<0)return clipSnippet(source,0,0);

  const normalizedEnd=normalizedIndex+normalizedQuery.length-1;
  return clipSnippet(source,mapped.starts[normalizedIndex],mapped.ends[normalizedEnd]);
};

const meaningfulString=(value,maxLength)=>typeof value==='string'&&Boolean(value.trim())&&value.trim().length<=maxLength&&!/[\u0000-\u001f\u007f]/.test(value);

const eligible=row=>Boolean(
  row&&
  row.status==='published'&&
  typeof row.published_at==='string'&&
  row.published_at.trim()&&
  meaningfulString(row.slug,300)&&
  meaningfulString(row.title,500)
);

const scoreArticle=(article,normalizedQuery)=>{
  const title=normalizeSearchText(article.title);
  const summary=normalizeSearchText(plainText(article.summary));
  const content=normalizeSearchText(plainText(article.content));
  const titleMatch=title.includes(normalizedQuery);
  const summaryMatch=summary.includes(normalizedQuery);
  const contentMatch=content.includes(normalizedQuery);

  if(!titleMatch&&!summaryMatch&&!contentMatch)return null;

  let score=0;
  if(title===normalizedQuery)score+=120;
  else if(title.startsWith(normalizedQuery))score+=80;
  else if(titleMatch)score+=60;
  if(summaryMatch)score+=30;
  if(contentMatch)score+=10;

  let snippet;
  if(summaryMatch)snippet=snippetAround(article.summary,normalizedQuery);
  else if(contentMatch)snippet=snippetAround(article.content,normalizedQuery);
  else snippet=snippetAround(article.summary||article.content,normalizedQuery);

  return {score,snippet};
};

const publicResult=(article,snippet)=>({
  title:article.title.trim(),
  slug:article.slug.trim(),
  section:String(article.section||'').trim(),
  section_slug:String(article.section_slug||'').trim(),
  published_at:article.published_at,
  image_url:meaningfulString(article.image_url,2048)?article.image_url.trim():null,
  image_alt:meaningfulString(article.image_alt,1000)?article.image_alt.trim():null,
  snippet
});

async function fetchCorpus(url,anonKey){
  const base=`${url}/rest/v1/articles?select=${SELECT_FIELDS}&status=eq.published&published_at=not.is.null&order=published_at.desc,slug.asc`;
  const corpus=[];

  for(let offset=0;offset<CORPUS_LIMIT;offset+=PAGE_SIZE){
    const response=await fetch(`${base}&limit=${PAGE_SIZE}&offset=${offset}`,{headers:anonHeaders(anonKey)});
    if(!response.ok)throw new Error('Published article corpus request failed.');
    const rows=await response.json();
    if(!Array.isArray(rows))throw new Error('Published article corpus response is invalid.');
    if(rows.length>PAGE_SIZE)throw new Error('Published article corpus page exceeded its limit.');
    corpus.push(...rows);
    if(rows.length<PAGE_SIZE)return corpus;
  }

  const probe=await fetch(`${base}&limit=1&offset=${CORPUS_LIMIT}`,{headers:anonHeaders(anonKey)});
  if(!probe.ok)throw new Error('Published article corpus guard probe failed.');
  const overflow=await probe.json();
  if(!Array.isArray(overflow))throw new Error('Published article corpus guard response is invalid.');
  if(overflow.length)throw new CorpusLimitError('Published article corpus exceeds the configured limit.');
  return corpus;
}

const handler=async(req,res)=>{
  if(String(req.method||'GET').toUpperCase()!=='GET'){
    res.setHeader('allow','GET');
    return json(res,405,{error:'Dozwolona jest tylko metoda GET.'});
  }

  const query=truncateQuery(String(req.query?.q||'').trim(),120);
  const normalizedQuery=normalizeSearchText(query);
  if(!normalizedQuery)return json(res,200,{query,count:0,results:[]});

  try{
    const {url,anonKey}=publicEnv();
    const corpus=await fetchCorpus(url,anonKey);
    const matches=[];

    for(const article of corpus){
      if(!eligible(article))continue;
      const match=scoreArticle(article,normalizedQuery);
      if(!match)continue;
      matches.push({article,score:match.score,snippet:match.snippet});
    }

    matches.sort((left,right)=>{
      if(right.score!==left.score)return right.score-left.score;
      const rightDate=Date.parse(right.article.published_at)||0;
      const leftDate=Date.parse(left.article.published_at)||0;
      if(rightDate!==leftDate)return rightDate-leftDate;
      const leftSlug=left.article.slug.trim();
      const rightSlug=right.article.slug.trim();
      return leftSlug<rightSlug?-1:leftSlug>rightSlug?1:0;
    });

    const results=matches
      .slice(0,RESULT_LIMIT)
      .map(match=>publicResult(match.article,match.snippet));

    return json(res,200,{query,count:results.length,results});
  }catch(error){
    if(error instanceof CorpusLimitError){
      console.error('Search corpus guard:',error.message);
      return json(res,503,{error:'Wyszukiwanie jest chwilowo niedostępne.'});
    }
    console.error('Search request failed:',error.message);
    return json(res,error.status===503?503:502,{error:'Nie udało się przeszukać artykułów.'});
  }
};

module.exports=handler;
module.exports._private={normalizeSearchText,normalizeWithMap,snippetAround,scoreArticle,eligible,fetchCorpus,truncateQuery};
