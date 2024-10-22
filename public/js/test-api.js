document.getElementById('getELIYears').addEventListener('click', async () => {
  const url = '/api/index';  // Lokalni endpoint
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }
    
    const result = await response.json();
    document.getElementById('responseOutput').textContent = (JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Greška:', error);
    document.getElementById('responseOutput').textContent = 'Greška: ' + error.message;
  }
});

document.getElementById('getELIEditions').addEventListener('click', async () => {
  const url = '/api/editions';  // Lokalni endpoint
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }

    const result = await response.json();
    document.getElementById('responseOutput').textContent = (JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Greška:', error);
    document.getElementById('responseOutput').textContent = 'Greška: ' + error.message;
  }
});

document.getElementById('getELIids').addEventListener('click', async () => {
  const url = '/api/acts';  // Lokalni endpoint
  const progressContainer = document.getElementById('progress-container');
  const progressText = document.getElementById('progress-text');
  const errorList = document.getElementById('error-list');
  
  errorList.innerHTML = ''; // Očisti prethodne greške
  progressContainer.style.display = 'block'; // Prikaži kontejner za napredak
  progressText.textContent = 'Dohvaćanje podataka...'; // Postavi početnu poruku

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }

    const result = await response.json();
    document.getElementById('responseOutput').textContent = JSON.stringify(result, null, 2);
    
    // Prikaz uspješne poruke
    progressText.textContent = 'Podaci uspješno dohvaćeni!';
    
  } catch (error) {
    console.error('Greška:', error);
    progressText.textContent = 'Greška: ' + error.message;

    // Prikaz greške u listi
    const li = document.createElement('li');
    li.textContent = `Greška: ${error.message}`;
    errorList.appendChild(li);
  }
});

document.getElementById('getELIidTitles').addEventListener('click', async () => {
  const url = '/api/eli-titles';  // Lokalni endpoint
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }

    const result = await response.json();
    document.getElementById('responseOutput').textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    console.error('Greška:', error);
    document.getElementById('responseOutput').textContent = 'Greška: ' + error.message;
  }
});

document.getElementById('getWebPage').addEventListener('click', async () => {
  try {
      const response = await fetch('/fetch-web-page');
      const message = await response.text();
      document.getElementById('responseOutput').innerText = message;
  } catch (error) {
      document.getElementById('responseOutput').innerText = 'Error fetching content!';
  }
});

// document.getElementById('getSpecificAct').addEventListener('click', async () => {
//   const url = '/api/eli-specific';  // Lokalni endpoint
//   try {
//     const response = await fetch(url, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({
//         part: "SL",
//         year: 2023,
//         number: 34,
//         act_num: 596,
//         format: "JSON-LD"
//       })
//     });

//     if (!response.ok) {
//       throw new Error('HTTP error! status: ' + response.status);
//     }

//     const result = await response.json();
//     document.getElementById('responseOutput').textContent = JSON.stringify(result, null, 2);
//   } catch (error) {
//     console.error('Greška:', error);
//     document.getElementById('responseOutput').textContent = 'Greška: ' + error.message;
//   }
// });


