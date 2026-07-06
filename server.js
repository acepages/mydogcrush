require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { sendVerificationCode } = require('./send-mail');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')),
});
const upload = multer({ storage });

const profilesFile = path.join(__dirname, 'profiles.json');
function readProfiles() {
  try {
    return JSON.parse(fs.readFileSync(profilesFile, 'utf8') || '[]');
  } catch (e) {
    return [];
  }
}
function writeProfiles(profiles) {
  fs.writeFileSync(profilesFile, JSON.stringify(profiles, null, 2));
}

function isRealProfile(profile) {
  if (!profile || typeof profile !== 'object') return false;
  if (profile.isDemo === true) return false;
  if (typeof profile.email === 'string' && profile.email.includes('@tinderdog.test')) return false;
  return true;
}

function normalizeProfiles(list = []) {
  return (Array.isArray(list) ? list : [])
    .filter(isRealProfile)
    .map(profile => ({
      ...profile,
      isDemo: false,
      likes: Array.isArray(profile.likes) ? profile.likes : [],
      likedBy: Array.isArray(profile.likedBy) ? profile.likedBy : [],
      matches: Array.isArray(profile.matches) ? profile.matches : [],
      pendingMatches: Array.isArray(profile.pendingMatches) ? profile.pendingMatches : [],
    }));
}

function getProfileKey(profile) {
  if (!profile || typeof profile !== 'object') return '';
  if (typeof profile.email === 'string' && profile.email.trim()) {
    return profile.email.trim().toLowerCase();
  }
  if (typeof profile.ownerName === 'string' && profile.ownerName.trim() && typeof profile.dogName === 'string' && profile.dogName.trim()) {
    return `${profile.ownerName.trim().toLowerCase()}:${profile.dogName.trim().toLowerCase()}`;
  }
  if (typeof profile.ownerName === 'string' && profile.ownerName.trim()) {
    return profile.ownerName.trim().toLowerCase();
  }
  return '';
}

function findProfileByIdentity(list, email, ownerName, dogName) {
  const key = (email || '').trim().toLowerCase();
  const ownerKey = (ownerName || '').trim().toLowerCase();
  const dogKey = (dogName || '').trim().toLowerCase();

  return (list || []).find(profile => {
    const profileKey = getProfileKey(profile);
    if (key && profileKey === key) return true;
    if (ownerKey && dogKey && profileKey === `${ownerKey}:${dogKey}`) return true;
    if (ownerKey && profileKey === ownerKey) return true;
    return false;
  });
}

function seedDemoProfiles() {
  const currentProfiles = readProfiles();
  const realProfiles = normalizeProfiles(currentProfiles);
  writeProfiles(realProfiles);
  return realProfiles;
}

app.use('/uploads', express.static(uploadsDir));
app.use(express.static(__dirname));

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Servidor activo' });
});

app.get('/main.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

app.get('/profiles', (req, res) => {
  const profiles = seedDemoProfiles();
  res.json({ success: true, profiles });
});

app.post('/likes', (req, res) => {
  const { likedProfileId, likerEmail, likerName, likerOwnerName, likerDogName } = req.body;
  if (!likedProfileId || !(likerEmail || likerName || likerOwnerName || likerDogName)) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }

  const profiles = readProfiles();
  const normalizedProfiles = normalizeProfiles(profiles);
  const targetProfile = normalizedProfiles.find(p => String(p.id) === String(likedProfileId));

  if (!targetProfile) {
    return res.status(404).json({ success: false, message: 'Perfil no encontrado' });
  }

  const likerKey = (likerEmail || likerName || `${likerOwnerName || ''}:${likerDogName || ''}`).toString().trim().toLowerCase();
  if (!likerKey) {
    return res.status(400).json({ success: false, message: 'Identidad no válida' });
  }

  targetProfile.likedBy = targetProfile.likedBy || [];
  if (!targetProfile.likedBy.includes(likerKey)) {
    targetProfile.likedBy.push(likerKey);
  }

  const likerProfile = findProfileByIdentity(normalizedProfiles, likerEmail, likerOwnerName || likerName, likerDogName);
  const targetKey = getProfileKey(targetProfile);
  let mutual = false;

  if (likerProfile) {
    likerProfile.likes = likerProfile.likes || [];
    if (targetKey && !likerProfile.likes.includes(targetKey)) {
      likerProfile.likes.push(targetKey);
    }

    targetProfile.likes = targetProfile.likes || [];
    if (targetProfile.likes.includes(likerKey)) {
      mutual = true;
    }

    if (mutual) {
      likerProfile.matches = likerProfile.matches || [];
      targetProfile.matches = targetProfile.matches || [];
      likerProfile.pendingMatches = likerProfile.pendingMatches || [];
      targetProfile.pendingMatches = targetProfile.pendingMatches || [];
      if (!likerProfile.matches.includes(targetKey)) {
        likerProfile.matches.push(targetKey);
      }
      if (!targetProfile.matches.includes(likerKey)) {
        targetProfile.matches.push(likerKey);
      }
      if (targetProfile.id && !likerProfile.pendingMatches.includes(String(targetProfile.id))) {
        likerProfile.pendingMatches.push(String(targetProfile.id));
      }
      if (likerProfile.id && !targetProfile.pendingMatches.includes(String(likerProfile.id))) {
        targetProfile.pendingMatches.push(String(likerProfile.id));
      }
    }
  }

  writeProfiles(normalizeProfiles(normalizedProfiles));

  res.json({ success: true, match: mutual, likedProfile: targetProfile });
});

app.get('/pending-matches', (req, res) => {
  const { email, ownerName, dogName } = req.query;
  if (!email && !ownerName && !dogName) {
    return res.status(400).json({ success: false, message: 'Faltan datos de identidad' });
  }

  const profiles = readProfiles();
  const normalizedProfiles = normalizeProfiles(profiles);
  const currentProfile = findProfileByIdentity(normalizedProfiles, email, ownerName, dogName);
  if (!currentProfile) {
    return res.json({ success: true, pendingMatches: [], currentProfile: null });
  }

  const pendingMatches = (currentProfile.pendingMatches || [])
    .map(pmId => normalizedProfiles.find(p => String(p.id) === String(pmId)))
    .filter(Boolean);

  res.json({ success: true, currentProfile, pendingMatches });
});

app.post('/matches/ack', (req, res) => {
  const { profileId, matchProfileId } = req.body;
  if (!profileId || !matchProfileId) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }

  const profiles = readProfiles();
  const normalizedProfiles = normalizeProfiles(profiles);
  const currentProfile = normalizedProfiles.find(p => String(p.id) === String(profileId));
  if (!currentProfile) {
    return res.status(404).json({ success: false, message: 'Perfil no encontrado' });
  }

  currentProfile.pendingMatches = currentProfile.pendingMatches || [];
  currentProfile.pendingMatches = currentProfile.pendingMatches.filter(id => String(id) !== String(matchProfileId));
  writeProfiles(normalizeProfiles(normalizedProfiles));

  res.json({ success: true, profile: currentProfile });
});

app.post('/profiles', upload.fields([
  { name: 'ownerPhoto', maxCount: 1 },
  { name: 'dogPhoto1', maxCount: 1 },
  { name: 'dogPhoto2', maxCount: 1 },
]), async (req, res) => {
  const { ownerName, dogName, age, bio } = req.body;
  if (!ownerName || !dogName) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }

  const files = req.files || {};
  const photos = [];
  if (files.ownerPhoto && files.ownerPhoto[0]) photos.push('/uploads/' + path.basename(files.ownerPhoto[0].path));
  if (files.dogPhoto1 && files.dogPhoto1[0]) photos.push('/uploads/' + path.basename(files.dogPhoto1[0].path));
  if (files.dogPhoto2 && files.dogPhoto2[0]) photos.push('/uploads/' + path.basename(files.dogPhoto2[0].path));

  const profiles = readProfiles();
  const profile = { id: Date.now(), ownerName, dogName, age: age || '', bio: bio || '', photos, isDemo: false };
  profiles.unshift(profile);
  writeProfiles(normalizeProfiles(profiles));

  res.json({ success: true, profile });
});

app.post('/send-code', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }

  try {
    await sendVerificationCode(email, code);
    res.json({ success: true, message: 'Correo enviado', code });
  } catch (error) {
    console.error(error);
    res.json({ success: true, message: error.message || 'No se pudo enviar el correo, pero puedes usar el código temporal', code, fallback: true });
  }
});

app.use('/images', express.static(path.join(__dirname, 'images')));

seedDemoProfiles();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
