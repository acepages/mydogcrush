const fs = require('fs');
const path = require('path');
const http = require('http');

const profilesFile = path.join(__dirname, 'profiles.json');
const sampleProfiles = [
  {
    id: 1,
    ownerName: 'Ana',
    dogName: 'Milo',
    email: 'ana@example.com',
    age: '3',
    bio: 'Un perro juguetón y cariñoso.',
    photos: [],
    likes: [],
    likedBy: [],
    matches: [],
    isDemo: false,
  },
  {
    id: 2,
    ownerName: 'Luis',
    dogName: 'Luna',
    email: 'luis@example.com',
    age: '2',
    bio: 'Le encanta correr en el parque.',
    photos: [],
    likes: [],
    likedBy: [],
    matches: [],
    isDemo: false,
  },
];

fs.writeFileSync(profilesFile, JSON.stringify(sampleProfiles, null, 2));
console.log('Se escribieron perfiles de prueba en profiles.json');

require('./server');

function request(path, method = 'GET', data = null) {
  const body = data ? JSON.stringify(data) : null;
  const options = {
    hostname: 'localhost',
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let text = '';
      res.on('data', chunk => (text += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(text));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTest() {
  try {
    console.log('1) Enviando primer like desde Ana a Luna...');
    const first = await request('/likes', 'POST', {
      likedProfileId: 2,
      likerEmail: 'ana@example.com',
      likerName: 'ana@example.com',
    });
    console.log('Respuesta 1:', first);

    console.log('2) Enviando segundo like desde Luis a Ana...');
    const second = await request('/likes', 'POST', {
      likedProfileId: 1,
      likerEmail: 'luis@example.com',
      likerName: 'luis@example.com',
    });
    console.log('Respuesta 2:', second);

    console.log('3) Verificando perfiles actualizados...');
    const profiles = await request('/profiles', 'GET');
    console.log('Perfiles cargados:', profiles.profiles.map(p => ({ id: p.id, likes: p.likes, likedBy: p.likedBy, matches: p.matches })));

    const matchFound = second.match === true;
    console.log(`\nResultado de la prueba: ${matchFound ? 'MATCH detectado correctamente ✅' : 'No se detectó el match ❌'}`);
  } catch (error) {
    console.error('Error durante el test:', error);
  } finally {
    process.exit(0);
  }
}

setTimeout(runTest, 1500);
