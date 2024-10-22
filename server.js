const express = require('express');
const https = require('https');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());

// SSL certifikati
const sslOptions = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
};

// Posluživanje statičkih datoteka iz mape public
app.use(express.static(path.join(__dirname, 'public')));

// Ruta za dohvaćanje godina s API-ja (GET za /api/index)
app.get('/api/index', async (req, res) => {
  try {
    console.log('Početak dohvaćanja podataka s vanjskog API-ja...');
    
    // Dohvaćanje podataka s vanjskog API-ja
    const apiResponse = await axios.get('https://narodne-novine.nn.hr/api/index');
    const yearsData = apiResponse.data;
    
    // Brojanje ukupnog broja godina i unosa
    const totalYears = Object.keys(yearsData).length;
    let totalEntries = 0;
    for (const year in yearsData) {
      totalEntries += yearsData[year].length;
    }

    console.log(`Ukupno godina: ${totalYears}`);
    
    // Provjera da li postoji direktorij 'data-get', ako ne, stvorit ćemo ga
    const dataDir = path.join(__dirname, 'data-get');
    if (!fs.existsSync(dataDir)) {
      console.log('Direktorij "data-get" ne postoji. Kreiranje direktorija...');
      fs.mkdirSync(dataDir);
    } else {
      console.log('Direktorij "data-get" već postoji.');
    }
    
    // Spremanje podataka u JSON datoteku
    const filePath = path.join(dataDir, 'years.json');
    fs.writeFile(filePath, JSON.stringify(yearsData, null, 2), (err) => {
      if (err) {
        console.error('Greška prilikom spremanja podataka:', err);
        return res.status(500).send('Internal Server Error');
      }

      console.log('Podaci uspješno spremljeni u years.json');
    });

    // Slanje odgovora natrag klijentu (originalna poruka vraćena)
    res.send(yearsData);
  } catch (error) {
    console.error('Greška prilikom dohvaćanja ili spremanja podataka:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Ruta za proxy API zahtjev (POST za /api/editions)
// generira editions.json sa pripadajucim godinama
app.post('/api/editions', async (req, res) => {
  try {
    const dataDir = path.join(__dirname, 'data-get');
    const yearsFilePath = path.join(dataDir, 'years.json');

    // Provjera postoji li datoteka s godinama
    if (!fs.existsSync(yearsFilePath)) {
      return res.status(404).send('Datoteka years.json nije pronađena.');
    }

    // Čitanje godina iz years.json
    const yearsData = fs.readFileSync(yearsFilePath, 'utf-8');
    const years = JSON.parse(yearsData);

    // Ukupan broj godina i brojač trenutne godine
    const totalYears = years.length;
    let currentYearIndex = 0;

    // Kreiranje objekta u kojem će se spremati rezultati izdanja
    let allEditions = {};

    // Iteriraj kroz svaku godinu i napravi API zahtjev
    for (const year of years) {
      currentYearIndex++;
      console.log(`Obrada godine ${currentYearIndex}/${totalYears} (${year})`);

      try {
        const apiResponse = await axios.post('https://narodne-novine.nn.hr/api/editions', { part: "SL", year }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const editions = apiResponse.data;

        // Spremi podatke s godinom kao ključem
        allEditions[`${year}`] = editions;
        console.log(`Podaci za godinu ${year} uspješno dohvaćeni.`);
      } catch (err) {
        console.error(`Greška prilikom dohvaćanja podataka za godinu ${year}:`, err.message);
      }
    }

    // Kreiraj direktorij ako ne postoji
    if (!fs.existsSync(dataDir)) {
      console.log('Direktorij "data-get" ne postoji. Kreiranje direktorija...');
      fs.mkdirSync(dataDir);
    } else {
      console.log('Direktorij "data-get" već postoji.');
    }

    // Spremi sve podatke u editions.json datoteku
    const editionsFilePath = path.join(dataDir, 'editions.json');
    fs.writeFileSync(editionsFilePath, JSON.stringify(allEditions, null, 2), 'utf-8');

    console.log('Svi podaci uspješno spremljeni u editions.json');
    res.send(allEditions);  // Slanje podataka natrag klijentu

  } catch (error) {
    console.error('Greška prilikom obrade zahtjeva:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// Napokon ELI ID-s od akata
app.post('/api/acts', async (req, res) => {
  try {
    // Pročitaj editions.json kako bi dohvatili dostupne godine i brojeve izdanja
    const editionsFilePath = path.join(__dirname, 'data-get', 'editions.json');
    const editionsData = fs.readFileSync(editionsFilePath, 'utf8');
    const editions = JSON.parse(editionsData);  // Pretvorimo string u objekt

    let eliIdData = {};  // Objekt u koji ćemo spremiti rezultate
    let errors = [];  // Niz za bilježenje grešaka

    // Ukupan broj godina i brojeva izdanja
    const totalYears = Object.keys(editions).length;
    let currentYearIndex = 0;
    let totalNumbers = 0;  // Ukupan broj izdanja
    let currentNumberIndex = 0;

    // Prvo računamo ukupan broj izdanja
    for (const numbers of Object.values(editions)) {
      totalNumbers += numbers.length;
    }

    // Iteracija kroz svaku godinu iz editions.json
    for (const [year, numbers] of Object.entries(editions)) {
      currentYearIndex++;
      eliIdData[`${year}`] = {};  // Kreiraj objekt za svaku godinu

      console.log(`Obrada godine ${currentYearIndex}/${totalYears} (${year})`);

      // Iteriraj kroz svaki broj izdanja za tu godinu
      for (const number of numbers) {
        currentNumberIndex++;
        console.log(`Obrada broja ${currentNumberIndex}/${totalNumbers} (${number})`);

        try {
          const apiResponse = await axios.post('https://narodne-novine.nn.hr/api/acts', {
            part: "SL",   // Pretpostavljeni dio
            year: year,   // Dinamička godina
            number: number  // Dinamički broj izdanja
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          });

          const acts = apiResponse.data;  // Dohvaćeni podaci o aktima

          // Dodaj akte u strukturu za tu godinu i broj izdanja
          eliIdData[`${year}`][`${number}`] = acts;

          console.log(`Podaci za broj ${number} u godini ${year} uspješno dohvaćeni.`);
        } catch (err) {
          console.error(`Greška prilikom dohvaćanja podataka za broj ${number} u godini ${year}:`, err.message);
          errors.push({ year, number, error: err.message });
        }
      }
    }

    // Kreiranje direktorija ako ne postoji
    const dataDir = path.join(__dirname, 'data-get');
    if (!fs.existsSync(dataDir)) {
      console.log('Direktorij "data-get" ne postoji. Kreiranje direktorija...');
      fs.mkdirSync(dataDir);
    } else {
      console.log('Direktorij "data-get" već postoji.');
    }

    // Spremi podatke u ELIid.json datoteku
    const filePath = path.join(dataDir, 'ELIid.json');
    fs.writeFile(filePath, JSON.stringify(eliIdData, null, 2), (err) => {
      if (err) {
        console.error('Greška prilikom spremanja podataka:', err);
        return res.status(500).send('Internal Server Error');
      }
      console.log('Podaci uspješno spremljeni u ELIid.json');
    });

    // Ako je bilo grešaka, ispiši ih
    if (errors.length > 0) {
      console.log(`Ukupno grešaka: ${errors.length}`);
      errors.forEach((err, index) => {
        console.log(`Greška #${index + 1}: godina ${err.year}, broj ${err.number}, poruka: ${err.error}`);
      });
    } else {
      console.log('Nema grešaka prilikom obrade.');
    }

    // Pošalji podatke natrag klijentu
    res.send({ data: eliIdData, errors });  // Klijentu šaljemo i podatke i eventualne greške
  } catch (error) {
    console.error('Greška:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// Napokon ELI ID-s sa naslovima
app.post('/api/eli-titles', async (req, res) => {
  try {
    let totalCount = 0;
    let errorCount = 0;
    // Učitaj ELIid.json
    const eliIdFilePath = path.join(__dirname, 'data-get', 'ELIid.json');
    const eliIdData = JSON.parse(fs.readFileSync(eliIdFilePath, 'utf8'));
    
    const titles = {};
    // Helper counters
    const getHighestNumber = () => {
      try {        
        let highestNumber = 0; // Initialize the highest num

        for (const year in eliIdData ) {
          // Iterate through the months (or entries)
          for (const edition in eliIdData[year]) {
            // Iterate through the array of numbers
            const numbers = eliIdData[year][edition];
            highestNumber += numbers.length;
          }
        }
    
        return highestNumber; // Return the highest number found
      } catch (error) {
        console.error('Greška prilikom čitanja datoteke:', error);
        return null; // Return null in case of error
      }
    };
    
    // Call the function and log the result NO TOTAL FINALLY
    const highestNumber = getHighestNumber();

    // Iteriraj kroz godine
    for (const year in eliIdData) {
      titles[year] = {}; // Inicijaliziraj objekt za godinu

      // Iteriraj kroz brojeve
      for (const number in eliIdData[year]) {
        titles[year][number] = []; // Inicijaliziraj niz za broj

        // Ukupan broj act_num za praćenje napretka
        const totalActs = eliIdData[year][number].length;

        // Iteriraj kroz act_num
        for (let i = 0; i < totalActs; i++) {
          const act_num = eliIdData[year][number][i];
          try {
            totalCount++;
            // API poziv za dobivanje naslova
            const response = await axios.post('https://narodne-novine.nn.hr/api/act', {
              part: "SL",
              year: year,
              number: number,
              act_num: act_num,
              format: "JSON-LD"
            }, {
              headers: {
                'Content-Type': 'application/json'
              }
            });

            // Izdvoji naslov
            let title = null;
            let realizes = null;

            for (const item of response.data) {
              if (item['http://data.europa.eu/eli/ontology#title'] && item['http://data.europa.eu/eli/ontology#realizes']) {
                title = item['http://data.europa.eu/eli/ontology#title'][0]['@value'];
                realizes = item['http://data.europa.eu/eli/ontology#realizes'][0]['@id'] + '/hrv/printhtml';

                break; // Prekini petlju kad pronađeš naslov
              }
            }

            if (title === null) {
              errorCount++
            }

            // Dodaj naslov u novi JSON
            titles[year][number].push({ godina: year, izdanje: number, id: act_num, title: title, akt_url: realizes || errorCount + 'Naslov nije pronađen.' });
          } catch (error) {
            errorCount++
            console.error(`Greška prilikom dohvata naslova za ${year}-${number}-${act_num}`, errorCount + '--' + error.message);
            titles[year][number].push({ godina: year, izdanje: number, id: act_num, title: errorCount + 'Greška: ' + error.message });
          }

          // Ispiši napredak
          console.log(`Obrađeno ${i + 1} od ${totalActs} za ${year}-${number} ->Total:${totalCount} od ${highestNumber}`);
        }
      }
    }

    // Snimi ELI-Titles.json
    const titlesFilePath = path.join(__dirname, 'data-get', 'ELI-Titles.json');
    fs.writeFileSync(titlesFilePath, JSON.stringify(titles, null, 2), 'utf-8');
    console.log('ELI-Titles.json uspješno snimljen.');

    // Pošalji podatke natrag klijentu
    res.send(titles);
  } catch (error) {
    console.error('Greška:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function fetchWebPageContent() {
  try {
      console.log('Starting to read ELI-Titles.json...');
      const data = fs.readFileSync('data-get/ELI-Titles.json', 'utf8');
      const parsedData = JSON.parse(data);
      console.log('Successfully parsed ELI-Titles.json.');

      // Keep track of the number of entries
      let totalEntries = 0;
      let fetchedEntries = 0;

      // Calculate the total number of entries
      for (const year in parsedData) {
          for (const edition in parsedData[year]) {
              const entries = parsedData[year][edition];
              totalEntries += entries.length;
          }
      }
      console.log(`Total entries to fetch: ${totalEntries}`);

      for (const year in parsedData) {
          for (const edition in parsedData[year]) {
              const entries = parsedData[year][edition];

              for (const entry of entries) {
                  const { akt_url } = entry;

                  try {
                      console.log(`Fetching content from ${akt_url}...`);
                      const response = await axios.get(akt_url);
                      const webContent = response.data;

                      entry.web_page = webContent;
                      fetchedEntries++;
                      console.log(`Successfully fetched content from ${akt_url} (${fetchedEntries}/${totalEntries})`);
                  } catch (error) {
                      console.error(`Error fetching ${akt_url}:`, error.message);
                      entry.web_page = ''; // Set to empty if there's an error
                  }
              }
          }
      }

      // Save the data to acts.json
      fs.writeFileSync('data-get/acts.json', JSON.stringify(parsedData, null, 2), 'utf8');
      console.log('Webpage content fetched and saved successfully.');
  } catch (error) {
      console.error('Error reading or processing the file:', error.message);
  }
}

// Create a route to trigger the fetch function
app.get('/fetch-web-page', async (req, res) => {
  await fetchWebPageContent();
  res.send('Content fetched and saved to acts.json');
});



// // Ruta za dohvaćanje specifičnog ELI akta
// app.post('/api/eli-specific', async (req, res) => {
//   const { part, year, number, act_num, format } = req.body;

//   try {
//     // API poziv za specifični akt
//     const apiResponse = await axios.post('https://narodne-novine.nn.hr/api/act', {
//       part: part || 'SL',  // Default dio je "SL" ako nije poslan u body-u
//       year: year,          // Godina iz zahtjeva
//       number: number,      // Broj izdanja iz zahtjeva
//       act_num: act_num,    // Specifičan akt broj
//       format: format || 'JSON-LD'  // Default format je JSON-LD
//     }, {
//       headers: {
//         'Content-Type': 'application/json'
//       }
//     });

//     const actData = apiResponse.data;

//     // Slanje podataka natrag klijentu
//     res.send(actData);
//   } catch (error) {
//     console.error(`Greška prilikom dohvaćanja specifičnog akta ${year}-${number}-${act_num}:`, error);
//     res.status(500).send('Greška prilikom dohvaćanja specifičnog akta');
//   }
// });



// Pokretanje HTTPS servera
https.createServer(sslOptions, app).listen(3001, () => {
  console.log('HTTPS server pokrenut na https://localhost:3001');
});