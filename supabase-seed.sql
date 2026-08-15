-- Uruchom po supabase-schema.sql.
-- Importuje obecne trzy artykuły Kroniki 82 do tabeli articles.

insert into public.articles
(title,slug,section,section_slug,summary,content,image_url,image_alt,status,featured,published_at,is_updated,update_at)
values
(
'MŁODOCIANY WYJADACZ OWOCÓW NIE ZWALNIA TEMPA!',
'mlodociany-wyjadacz-owocow',
'Aktualności','aktualnosci',
'Jeszcze niedawno jego specjalnością były maliny. W ostatni weekend młodociany smakosz oskubał śliwkę do ostatniego owocu.',
$$Najpierw były maliny. Sprawa wydawała się lokalna, sezonowa i możliwa do opanowania. Jak pokazują najnowsze ustalenia redakcji, były to jedynie początki działalności, która z czasem objęła kolejne gatunki owoców.

W ostatni weekend podejrzany pojawił się w pobliżu śliwy. Drzewo jeszcze niedawno posiadało owoce. Po zakończeniu operacji sytuacja przedstawiała się znacznie bardziej przejrzyście: śliwek nie było.

OD MALIN DO ŚLIWEK

Nie wiadomo, czy mamy do czynienia z przemyślaną strategią dywersyfikacji, czy po prostu z wyjątkowo skutecznym apetytem. Wiadomo natomiast, że młodociany wyjadacz nie wykazuje oznak spowolnienia.

Źródła Kroniki 82 nie potwierdzają, by sprawca korzystał z drabiny, koszyka ani zorganizowanej siatki pomocników. Wszystko wskazuje na działalność indywidualną.

CO BĘDZIE NASTĘPNE?

Właściciele jabłoni, grusz i innych obiektów o charakterze owocowym mają powody, by obserwować rozwój sytuacji. Redakcja nie zamierza siać paniki, ale doświadczenie uczy, że po malinach i śliwkach lista możliwości pozostaje niepokojąco długa.

Kronika 82 będzie monitorować sytuację oraz stan lokalnych zapasów owoców.$$
,'/assets/chlopiec.png?v=1','Portret pamięciowy młodocianego wyjadacza owoców','published',false,'2026-08-11T12:00:00+02:00',false,null
),
(
'SCHODY W NAPRAWIE. ILE MOŻNA NAPRAWIAĆ KILKA STOPNI?',
'schody-w-naprawie',
'Infrastruktura','infrastruktura',
'Naprawa uszkodzonych schodów trwa. I trwa. Bezpieczeństwo jest zapewnione, cierpliwość mieszkańców już trochę mniej.',
$$Nie mamy tu do czynienia z budową metra, wiaduktu ani nowego terminalu lotniczego. Chodzi o kilka stopni. Mimo to naprawa rozciąga się w czasie z godnością inwestycji infrastrukturalnej o znaczeniu krajowym.

Nie ma obecnie bezpośredniego zagrożenia dla bezpieczeństwa mieszkańców. Jest za to coraz bardziej uzasadnione pytanie, dlaczego prosta naprawa trwa tak długo i kto właściwie odpowiada za tempo prac.

KTO TO NAPRAWIA?

Redakcja chciałaby poznać kwalifikacje wykonawcy, dowiedzieć się, kto go zatrudnił, kto zatwierdził sposób prowadzenia robót i czy ktokolwiek ustalił termin ich zakończenia. W przeciwnym razie kilka cegieł zaczyna wyglądać jak projekt badawczy finansowany na czas nieokreślony.

AKTUALIZACJA PO INTERWENCJI CHRONICLE

Po naszej dziennikarskiej interwencji remont ruszył z kopyta. Około godziny 10 rano pojawił się fachowiec i rozpoczął prace.

Do godziny 14 udało się wmurować kilka cegieł. Prawdziwy szał. Najważniejsze jednak, że coś wreszcie się ruszyło.

Kronika 82 będzie monitorować sytuację.$$
,'/assets/schody.png?v=1','Schody w trakcie naprawy','published',false,'2026-08-11T11:00:00+02:00',true,'2026-08-11T14:00:00+02:00'
),
(
'HORROR W SŁOTWINIE! MARTWA MYSZ ZAATAKOWAŁA MIESZKANKĘ NUMERU 82!',
'horror-w-slotwinie',
'Śledztwa','sledztwa',
'Chciała tylko skorzystać z kontaktu. Chwilę później stanęła oko w oko z koszmarem, którego nie przewidziałby nawet elektryk po trzech kawach.',
$$Spokojny dzień w Słotwinie zamienił się w scenę rodem z najtańszego horroru klasy B. W jednym z lokali pod numerem 82 doszło do makabrycznego odkrycia. Z gniazdka elektrycznego wystawała... mysz.

Martwa mysz.

Dramat rozpoczął się niewinnie. Mieszkanka domu zbliżyła się do kontaktu, nie spodziewając się niczego bardziej niebezpiecznego niż ewentualnie krzywo włożona wtyczka. Wtedy ją zobaczyła.

ATAK ZZA GROBU

Choć zwierzę nie żyło, jego skuteczność w sianiu terroru pozostała imponująca. Mieszkanka numeru 82 została zaatakowana psychologicznie, gdy zupełnie niespodziewanie zobaczyła gryzonia wystającego z kontaktu.

CZY MIESZKAŃCY SŁOTWINY MOGĄ CZUĆ SIĘ BEZPIECZNIE?

Na razie nic nie wskazuje na to, by w okolicy działała zorganizowana grupa myszy zajmujących instalacje elektryczne. Ale jeszcze wczoraj nic nie wskazywało również na to, że z kontaktu może patrzeć trup gryzonia.

Kronika 82 będzie monitorować sytuację.$$
,'/assets/martwa-mysz.jpeg?v=1','Martwa mysz znaleziona za obudową gniazdka elektrycznego w domu numer 82','published',true,'2026-08-10T12:00:00+02:00',false,null
)
on conflict (slug) do update set
  title=excluded.title,
  section=excluded.section,
  section_slug=excluded.section_slug,
  summary=excluded.summary,
  content=excluded.content,
  image_url=excluded.image_url,
  image_alt=excluded.image_alt,
  status=excluded.status,
  featured=excluded.featured,
  published_at=excluded.published_at,
  is_updated=excluded.is_updated,
  update_at=excluded.update_at;
