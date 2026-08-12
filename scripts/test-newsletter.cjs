const assert=require('node:assert/strict');

process.env.SITE_URL='https://preview.example.test';
process.env.NEWSLETTER_SIGNING_SECRET='test-only-secret-'.repeat(4);
delete process.env.RESEND_API_KEY;
delete process.env.NEWSLETTER_FROM;

const newsletter=require('../lib/newsletter');
const email='Rodzina@Example.com';
const token=newsletter.unsubscribeToken(email);
const wrongToken=`${token.slice(0,-1)}${token.endsWith('0')?'1':'0'}`;

assert.equal(newsletter.normalizeEmail(email),'rodzina@example.com');
assert.equal(newsletter.validUnsubscribeToken(email,token),true);
assert.equal(newsletter.validUnsubscribeToken(email,wrongToken),false);
assert.equal(newsletter.configured(),false,'bez klucza Resend wysyłka musi pozostać wyłączona');

const longText='Chronicle opisuje rodzinne wydarzenia i najnowsze wiadomości spod numeru 82. '.repeat(12);
const teaser=newsletter.excerpt('Najważniejszy lead artykułu.',longText);
assert.ok(teaser.length>=300&&teaser.length<=441,'automatyczna zajawka powinna mieć około 300–500 znaków');

const article={
  id:'00000000-0000-4000-8000-000000000082',slug:'rodzinna-aktualizacja',title:'Rodzinna aktualizacja Chronicle',
  summary:'Najważniejszy lead artykułu.',content:longText,image_url:'/assets/og-image.png',image_alt:'The 82 Chronicle',
  newsletter_teaser:teaser,newsletter_update_excerpt:'Pojawił się nowy fragment, którego wcześniej w artykule nie było.',update_at:'2026-08-12T12:00:00.000Z'
};
const message=newsletter.renderNewsletter({article,recipient:email,mode:'update'});
assert.match(message.subject,/^AKTUALIZACJA:/);
assert.match(message.html,/The 82 Chronicle/);
assert.match(message.html,/Czytaj dalej/);
assert.match(message.html,/Wypisz się z newslettera/);
assert.match(message.html,/Nowy fragment/);
assert.match(message.removeUrl,/newsletter-unsubscribe/);

console.log('OK: szablon, zajawka, podpis wypisu i blokada wysyłki bez klucza działają.');
