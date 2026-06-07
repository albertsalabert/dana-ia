export type FilterResult =
  | { allowed: true }
  | { allowed: false; reason: string };

// Patrones que identifican datos personales (RGPD Art. 4)
const PERSONAL_DATA_PATTERNS = [
  // DNI / NIE español
  /\b\d{8}[A-HJ-NP-TV-Z]\b/i,
  /\b[XYZ]\d{7}[A-HJ-NP-TV-Z]\b/i,
  // Número de teléfono
  /\b(\+34|0034)?\s?[6789]\d{8}\b/,
  // IBAN / cuenta bancaria
  /\bES\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/i,
  // Número de seguridad social
  /\b\d{2}[\s/-]\d{8}[\s/-]\d{2}\b/,
  // Dirección postal con número
  /\b(calle|c\/|avda?\.?|avenida|paseo|pl\.?|plaza)\s+[\w\s]+,?\s+n[uú]m\.?\s*\d+/i,
];

// Palabras clave de salud / médico (RGPD Art. 9 - categorías especiales)
const HEALTH_KEYWORDS = [
  "diagnóstico",
  "diagnostico",
  "enfermedad",
  "síntoma",
  "sintoma",
  "medicamento",
  "medicación",
  "medicacion",
  "tratamiento médico",
  "tratamiento medico",
  "receta médica",
  "receta medica",
  "análisis de sangre",
  "analisis de sangre",
  "consulta médica",
  "consulta medica",
  "médico de cabecera",
  "medico de cabecera",
  "urgencias",
  "hospitalización",
  "hospitalizacion",
  "operación quirúrgica",
  "operacion quirurgica",
  "baja médica",
  "baja medica",
  "incapacidad laboral",
  "psicólogo",
  "psicologo",
  "psiquiatra",
  "terapia psicológica",
  "terapia psicologica",
  "depresión",
  "depresion",
  "ansiedad",
  "dolor crónico",
  "dolor cronico",
  "historia clínica",
  "historia clinica",
  "informe médico",
  "informe medico",
  "prueba pcr",
  "resultado médico",
  "resultado medico",
];

// Temas personales no relacionados con trabajo
const PERSONAL_TOPICS_KEYWORDS = [
  "vida personal",
  "problema personal",
  "problema familiar",
  "divorcio",
  "separación",
  "separacion",
  "custodia",
  "herencia",
  "testamento",
  "deuda personal",
  "hipoteca personal",
  "declaración de la renta",
  "declaracion de la renta",
  "seguro del coche",
  "multa de tráfico",
  "multa de trafico",
  "pensión alimenticia",
  "pension alimenticia",
];

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function filterContent(userMessage: string): FilterResult {
  // Comprobar patrones de datos personales identificativos
  for (const pattern of PERSONAL_DATA_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        allowed: false,
        reason: "personal_data",
      };
    }
  }

  const normalized = normalizeText(userMessage);

  // Comprobar temas de salud
  for (const keyword of HEALTH_KEYWORDS) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalized.includes(normalizedKeyword)) {
      return {
        allowed: false,
        reason: "health_topic",
      };
    }
  }

  // Comprobar temas personales
  for (const keyword of PERSONAL_TOPICS_KEYWORDS) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalized.includes(normalizedKeyword)) {
      return {
        allowed: false,
        reason: "personal_topic",
      };
    }
  }

  return { allowed: true };
}

export const FILTER_MESSAGES: Record<string, string> = {
  personal_data:
    "No puedo procesar consultas que contengan datos personales identificativos (DNI, teléfono, cuenta bancaria, dirección, etc.). Por favor, reformula tu consulta sin incluir este tipo de datos para cumplir con la normativa RGPD.",
  health_topic:
    "No puedo atender consultas relacionadas con salud, diagnósticos médicos o información sanitaria personal. Para cuestiones de salud, contacta con los servicios médicos de la empresa o con tu médico.",
  personal_topic:
    "Esta IA está orientada a consultas profesionales y corporativas. Para temas personales (familiares, legales privados, etc.) utiliza los canales adecuados.",
};
