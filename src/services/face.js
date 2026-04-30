const FACE_MATCH_THRESHOLD = 0.55;

function normalizeDescriptor(rawDescriptor) {
  if (!Array.isArray(rawDescriptor) || rawDescriptor.length !== 128) {
    return null;
  }

  const normalized = rawDescriptor.map((value) => Number(value));
  const allNumbers = normalized.every((value) => Number.isFinite(value));

  return allNumbers ? normalized : null;
}

function parseStoredDescriptor(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return normalizeDescriptor(parsed);
  } catch (err) {
    return null;
  }
}

function descriptorDistance(a, b) {
  let sum = 0;

  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

function findBestFaceMatch(studentsWithDescriptor, probeDescriptor) {
  let bestMatch = null;

  for (const student of studentsWithDescriptor) {
    const storedDescriptor = parseStoredDescriptor(student.face_descriptor);
    if (!storedDescriptor) {
      continue;
    }

    const distance = descriptorDistance(storedDescriptor, probeDescriptor);
    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = { student, distance };
    }
  }

  if (!bestMatch || bestMatch.distance > FACE_MATCH_THRESHOLD) {
    return null;
  }

  return bestMatch;
}

module.exports = {
  FACE_MATCH_THRESHOLD,
  normalizeDescriptor,
  findBestFaceMatch
};
