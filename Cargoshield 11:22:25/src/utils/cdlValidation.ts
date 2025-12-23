export interface CDLValidationResult {
  isValid: boolean;
  error?: string;
  licenseNumber?: string;
  stateCode?: string;
  expirationDate?: Date;
}

export const STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'GU', 'AS', 'VI', 'MP'
];

const TEMPORARY_CDL_INDICATORS = ['TEMP', 'TEMPORARY', 'LEARNER', 'PERMIT', 'DL', 'D/L'];

export function validateCDLNumber(licenseNumber: string): CDLValidationResult {
  if (!licenseNumber || licenseNumber.trim().length === 0) {
    return { isValid: false, error: 'CDL number is required' };
  }

  const cleanNumber = licenseNumber.toUpperCase().trim();

  if (TEMPORARY_CDL_INDICATORS.some(indicator => cleanNumber.includes(indicator))) {
    return { isValid: false, error: 'Temporary licenses not accepted' };
  }

  if (cleanNumber.length < 9) {
    return { isValid: false, error: 'CDL number too short' };
  }

  const stateCode = cleanNumber.substring(0, 2);
  const licenseDigits = cleanNumber.substring(2);

  if (!STATE_CODES.includes(stateCode)) {
    return { isValid: false, error: 'Invalid state code' };
  }

  if (!/^\d{7,10}$/.test(licenseDigits)) {
    return { isValid: false, error: 'CDL must contain 7-10 digits after state code' };
  }

  return {
    isValid: true,
    licenseNumber: cleanNumber,
    stateCode: stateCode,
  };
}

export function validateExpirationDate(dateStr: string): CDLValidationResult {
  if (!dateStr || dateStr.trim().length === 0) {
    return { isValid: false, error: 'Expiration date is required' };
  }

  let expirationDate: Date;

  const dateFormats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, // MM/DD/YYYY or M/D/YY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/, // MM-DD-YYYY
  ];

  let matched = false;

  for (const format of dateFormats) {
    const match = dateStr.match(format);
    if (match) {
      matched = true;

      if (format === dateFormats[0]) {
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);

        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }

        expirationDate = new Date(year, month - 1, day);
      } else if (format === dateFormats[1]) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);

        expirationDate = new Date(year, month - 1, day);
      } else {
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);

        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }

        expirationDate = new Date(year, month - 1, day);
      }
      break;
    }
  }

  if (!matched || !expirationDate || isNaN(expirationDate.getTime())) {
    return { isValid: false, error: 'Invalid date format (use MM/DD/YYYY)' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expirationDate < today) {
    const expiredMonths = Math.floor((today.getTime() - expirationDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return {
      isValid: false,
      error: `This CDL expired ${expiredMonths} month${expiredMonths !== 1 ? 's' : ''} ago`,
    };
  }

  return {
    isValid: true,
    expirationDate: expirationDate,
  };
}

export function parseAndValidateCDL(licenseNumber: string, expirationDate: string): CDLValidationResult {
  const licenseValidation = validateCDLNumber(licenseNumber);
  if (!licenseValidation.isValid) {
    return licenseValidation;
  }

  const dateValidation = validateExpirationDate(expirationDate);
  if (!dateValidation.isValid) {
    return dateValidation;
  }

  return {
    isValid: true,
    licenseNumber: licenseValidation.licenseNumber,
    stateCode: licenseValidation.stateCode,
    expirationDate: dateValidation.expirationDate,
  };
}

export function formatDateForDisplay(date: Date | undefined): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
