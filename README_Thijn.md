# Readme voor de praktijkdocent, Thijn van Kempen

## BATMAN
Biomedical Article Text Mining ApplicatioN

Een webapplicatie voor text mining in PubMed abstracts voor het onderzoek van het HAN BioCentre

Copyright :copyright: 2017-2018
Jonathan Feenstra, Fini De Gruyter, Alex Janse & Thijs Weenink

![Alt text](static/img/technical-erd.png?raw=true 'Technisch ERD')
![Alt text](static/img/logical-erd.png?raw=true 'logisch ERD')
![Alt text](static/img/systemarchitecture.png?raw=true 'Systeemarchitectuur')
![Alt text](static/img/classdiagram.png?raw=true 'Software-architectuur (Class diagram)')

## Afwijkingen van het analyse/ontwerp met argumentatie

### Systeemarchitectuur
- Er is geen gebruik gemaakt van de NLTK library. In plaats daarvan hebben we de synoniemen van NCBI zelf gebruikt en deze uit de XML file gehaald. Deze bleken namelijk meer resultaten te geven.
- De modules 'Webpagina genereren' en 'Graaf genereren' worden ook uitgevoerd op de cytosine.nl server, al is het wel mogelijk om de webpagina te genereren op de desktop van de gebruiker, alleen kan er dan geen text mining uitgevoerd worden.
- De module 'Text mining' maakt nu ook gebruik van de library numpy en matplotlib. Dit is onder andere gebruikt om te voorspellen hoelang elk keyword nodig had om de resultaten op te halen. Hierbij is gebruik gemaakt van numpy '1.13.1' en matplotlib '2.0.2'.

### Software-architectuur (Class diagram)
- Het script [app.py](https://github.com/JonathanFeenstra/BATMAN/blob/master/app.py) in de 'htmlPython' library bevat nu meer pagina's. Er is o.a. een [contact pagina](https://github.com/JonathanFeenstra/BATMAN/blob/master/templates/contact.html) toegevoegd op de website.
- De objecten die doorgestuurd worden van 'textmining' naar de 'databank' zijn veranderd. Er wordt nog steeds gebruik gemaakt van dictionaries, maar dan in de volgende formats:
mainterm : [[synoniemen], {pmid : score}, categorie]}
{PMID : [title, authors, date]}
{relationterm : {linkterm : [PMID]}.
- In 'textmining' zijn er andere bestanden gemaakt. Er is een 'textmining.py' en een 'afterprocessing.py'. Zie de betreffende files voor commentaar.
- De 'logicaJS' is een stuk uitgebreider geworden. Er zijn 4 javascipts genaamd: 'modernizr-1.5.min.js', 'network.js', '***REMOVED***.js', 'pubmed-chart.js'. 'network.js' is nog steeds het script dat verantwoordelijk is voor de visualisatie van de graaf. Het aantal methodes en variabelen is veel uitgebreider geworden dan in de class diagram te zien is (zie betreffende files voor commentaar).
- Classes van 'textmining' maken geen gebruik meer van NLTK, zoals vermeld in de commentbox.

### Technische gegevens structuur (ERD)

#### Datatypen veranderingen
<b><ins>In de entiteit 'pubmed_article'</ins></b>
-Het datatype van publication_date is veranderd van DATE naar VARCHAR2 (xxx). De reden hiervoor is dat het javascript en de html de datum meenemen als string. het is dus niet nodig dit een apart datum datatype mee te geven. Bovendien zorgde dit voor problemen, omdat het niet goed doorkwam in de JSON, waar date steeds 'null' werd. Tenslotte slaat elk artikel de datum anders op (may-2018, 2018, 2-5-2018, 2-may-2018 etc.) Waardoor er ook weer problemen ontstaan. Een String/VARCHAR2 neemt gewoon over wat er geschreven staat. De gebruiker (de bioloog) kan dit altijd interpreteren.
<b><ins>In de entiteit 'link'</ins></b>
-'Relation_score' is veranderd van FLOAT(5) naar INTEGER. Dit omdat de score altijd gehele getallen zijn
<b><ins>In de entiteit 'node'</ins></b>
-'node_id' is veranderd naar 'mainterm'. De datatype is veranderd van INTEGER naar VARCHAR2. Dit omdat nu niet meer gebruik gemaakt wordt van een ID als primary key, maar de nodenaam, die volgens de applicatie allen uniek moeten zijn.

#### Structuur veranderingen
- De opbouw van het ERD is wat veranderd. Eerst was de entiteit 'pubmed_article' gelinkt aan 'node' door middel van een tussentabel (veel-op-veel relatie). Nu is 'pubmed_article' gelinkt aan 'keyword' met een tussentabel. De reden hiervoor is de manier van opslaan van de data, zodat hij ook logisch/makkelijk getoond kan worden in de graaf. links (edges) en nodes hebben PubMed artikelen gekoppeld, maar in eerste instantie zijn natuurlijk alle artikelen gekoppeld aan een keyword. Onze text mining script koppelt namelijk artikelen per keyword, en vergelijkt ze later tussen andere keywords.
- De entiteit 'type' was eerst gekoppeld aan de entiteit 'keyword', maar nu gekoppeld aan 'node'. De reden hiervoor is, omdat de graaf de nodes een type meekrijgen (organism, health_effect, compound). Een node kan meerdere keywords hebben door de synoniemen. Op deze manier is de typedata gemakkelijker te verwerken in de graaf.
- De namen van de tussentabellen zijn veranderd van 'Relation_1' en 'Relation_2' naar 'nodeXarticle' en 'nodeXlink'. Dit is gedaan om de relaties een duidelijkere naam te geven. Het geeft nu precies aan tussen welke entiteiten er een link is.
-De score ofwel hitcount wordt op een andere plek opgeslagen, namelijk in de tussentabel 'nodeXarticle' ipv 'keyword'. Dit is omdat de score gelinkt is aan een bepaald artikel, zodat de artikelen ook gesorteerd kunnen worden. De hitcount/score van het woord in kan berekend worden door simpelweg al die scores bij elkaar op te tellen.

#### Attributen veranderingen
<ins>In de entiteit 'type'</ins>
- naam attribuut 'classificatie' veranderd naar 'classification'. Om alles consistent in het Engels te zetten.
<ins>In de entiteit 'node'</ins>
-'node_id' is veranderd naar 'mainterm'. Dit zijn de namen van de nodes, die al uniek moeten zijn in onze applicatie.
<ins>In de entiteit 'keyword'</ins>
- Er is een attribuut verwijderd, namelijk 'hitcount'. Dit omdat de score op een andere plek opgeslagen wordt, namelijk in de tussentabel 'nodeXarticle'. de totale score van een node wordt nu berekend door alle scores bij elkaar op te tellen. De score opgeslagen in 'nodeXarticle' is nu de score per artikel, zodat ze ook makkelijker op volgorde opgeslagen kunnen worden.
