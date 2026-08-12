module.exports=(req,res)=>{
  res.statusCode=200;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','no-store');
  res.end(JSON.stringify({
    SUPABASE_URL:Boolean(process.env.SUPABASE_URL),
    SUPABASE_ANON_KEY:Boolean(process.env.SUPABASE_ANON_KEY),
    SUPABASE_SECRET_KEY:Boolean(process.env.SUPABASE_SECRET_KEY),
    SITE_URL:Boolean(process.env.SITE_URL),
    VERCEL_ENV:process.env.VERCEL_ENV||null,
    VERCEL_GIT_COMMIT_REF:process.env.VERCEL_GIT_COMMIT_REF||null
  }));
};
