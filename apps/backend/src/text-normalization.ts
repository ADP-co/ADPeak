const lossySpanishWords: Array<[RegExp, string]> = [
  [/num[?�]ric/gi, "numéric"],
  [/correcci[?�]n/gi, "corrección"],
  [/revisi[?�]n/gi, "revisión"],
  [/titulaci[?�]n/gi, "titulación"],
  [/matr[?�]cula/gi, "matrícula"],
  [/contrase[?�]a/gi, "contraseña"],
  [/gesti[?�]n/gi, "gestión"],
  [/descripci[?�]n/gi, "descripción"],
  [/observaci[?�]n/gi, "observación"],
  [/educaci[?�]n/gi, "educación"],
  [/informaci[?�]n/gi, "información"],
  [/configuraci[?�]n/gi, "configuración"],
  [/asignaci[?�]n/gi, "asignación"],
  [/notificaci[?�]n/gi, "notificación"],
  [/aprobaci[?�]n/gi, "aprobación"],
  [/actualizaci[?�]n/gi, "actualización"],
  [/an[?�]lisis/gi, "análisis"],
  [/c[?�]digo/gi, "código"],
  [/per[?�]odo/gi, "período"],
  [/v[?�]lid/gi, "válid"],
  [/n[?�]mero/gi, "número"],
];

export function normalizeUserFacingText(value: string) {
  let normalized = repairMojibake(value);

  for (const [pattern, replacement] of lossySpanishWords) {
    normalized = normalized.replace(pattern, (match) => preserveInitialCase(match, replacement));
  }

  return normalized.normalize("NFC");
}

function repairMojibake(value: string) {
  let current = value;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const repaired = repairMojibakeOnce(current);

    if (repaired === current) {
      return current;
    }

    current = repaired;
  }

  return current;
}

function repairMojibakeOnce(value: string) {
  if (!/[ÃÂâ�]/.test(value)) {
    return value;
  }

  const bytes: number[] = [];

  for (const character of Array.from(value)) {
    const code = character.codePointAt(0) ?? 0x20;

    if (code > 0xff) {
      return value;
    }

    bytes.push(code);
  }

  const repaired = Buffer.from(bytes).toString("utf8");
  return mojibakeScore(repaired) < mojibakeScore(value) ? repaired : value;
}

function mojibakeScore(value: string) {
  return (value.match(/[ÃÂâ�]/g) ?? []).length;
}

function preserveInitialCase(source: string, replacement: string) {
  if (source[0] === source[0]?.toLocaleUpperCase("es-MX")) {
    return replacement[0]?.toLocaleUpperCase("es-MX") + replacement.slice(1);
  }

  return replacement;
}
