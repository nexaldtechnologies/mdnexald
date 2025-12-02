

export const MODEL_NAME = 'gemini-2.5-flash';

export const REGIONS_DATA: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico"],
  "Europe": [
    "United Kingdom", "Germany", "France", "Spain", "Italy", "Netherlands", "Switzerland", "Belgium", 
    "Portugal", "Sweden", "Norway", "Denmark", "Finland", "Poland", "Austria", "Ireland", "Greece", 
    "Russia", "Ukraine", "Belarus", "Czech Republic", "Hungary", "Romania", "Bulgaria", "Serbia", "Croatia",
    "Slovakia", "Slovenia", "Estonia", "Latvia", "Lithuania", "Moldova", "Bosnia and Herzegovina", 
    "Albania", "North Macedonia", "Montenegro", "Iceland", "Luxembourg", "Malta", "Cyprus", "Kosovo"
  ],
  "Central Asia & Caucasus": [
    "Kazakhstan", "Uzbekistan", "Azerbaijan", "Georgia", "Armenia", "Kyrgyzstan", "Tajikistan", "Turkmenistan"
  ],
  "Asia-Pacific": [
    "Australia", "New Zealand", "Japan", "South Korea", "Singapore", "India", "China", "Taiwan", 
    "Hong Kong", "Thailand", "Vietnam", "Indonesia", "Malaysia", "Philippines", "Pakistan", "Bangladesh",
    "Sri Lanka", "Nepal", "Mongolia"
  ],
  "Middle East & Africa": [
    "UAE", "Saudi Arabia", "Qatar", "Turkey", "Egypt", "South Africa", "Nigeria", "Kenya", "Morocco",
    "Algeria", "Ethiopia", "Ghana", "Tanzania", "Uganda", "Palestine"
  ],
  "South America": [
    "Brazil", "Argentina", "Chile", "Colombia", "Peru", "Venezuela", "Ecuador", "Bolivia", 
    "Uruguay", "Paraguay", "Guyana", "Suriname"
  ],
  "Central America & Caribbean": [
    "Costa Rica", "Panama", "Dominican Republic", "Puerto Rico", "Guatemala", "Honduras", 
    "El Salvador", "Nicaragua", "Cuba", "Jamaica", "Haiti", "Bahamas", "Belize", "Trinidad and Tobago"
  ]
};

// Maps countries to their default language code for convenience, 
// though this no longer dictates the voice input language strictly.
export const COUNTRY_TO_LANG_CODE: Record<string, string> = {
  // North America
  "United States": "en-US",
  "Canada": "en-CA",
  "Mexico": "es-MX",
  
  // Europe
  "United Kingdom": "en-GB",
  "Germany": "de-DE",
  "France": "fr-FR",
  "Spain": "es-ES",
  "Italy": "it-IT",
  "Netherlands": "nl-NL",
  "Switzerland": "de-CH",
  "Belgium": "fr-BE",
  "Portugal": "pt-PT",
  "Sweden": "sv-SE",
  "Norway": "no-NO",
  "Denmark": "da-DK",
  "Finland": "fi-FI",
  "Poland": "pl-PL",
  "Austria": "de-AT",
  "Ireland": "en-IE",
  "Greece": "el-GR",
  "Russia": "ru-RU",
  "Ukraine": "uk-UA",
  "Belarus": "ru-BY", 
  "Czech Republic": "cs-CZ",
  "Hungary": "hu-HU",
  "Romania": "ro-RO",
  "Bulgaria": "bg-BG",
  "Serbia": "sr-RS",
  "Croatia": "hr-HR",
  "Slovakia": "sk-SK",
  "Slovenia": "sl-SI",
  "Estonia": "et-EE",
  "Latvia": "lv-LV",
  "Lithuania": "lt-LT",
  "Moldova": "ro-MD",
  "Bosnia and Herzegovina": "bs-BA",
  "Albania": "sq-AL",
  "North Macedonia": "mk-MK",
  "Montenegro": "sr-ME",
  "Iceland": "is-IS",
  "Luxembourg": "fr-LU",
  "Malta": "en-MT",
  "Cyprus": "el-CY",
  "Kosovo": "sq-AL",

  // Central Asia & Caucasus
  "Kazakhstan": "kk-KZ", 
  "Uzbekistan": "uz-UZ",
  "Azerbaijan": "az-AZ",
  "Georgia": "ka-GE",
  "Armenia": "hy-AM",
  "Kyrgyzstan": "ky-KG",
  "Tajikistan": "tg-TJ",
  "Turkmenistan": "tk-TM",

  // Asia-Pacific
  "Australia": "en-AU",
  "New Zealand": "en-NZ",
  "Japan": "ja-JP",
  "South Korea": "ko-KR",
  "Singapore": "en-SG",
  "India": "en-IN",
  "China": "zh-CN",
  "Taiwan": "zh-TW",
  "Hong Kong": "zh-HK",
  "Thailand": "th-TH",
  "Vietnam": "vi-VN",
  "Indonesia": "id-ID",
  "Malaysia": "ms-MY",
  "Philippines": "en-PH",
  "Pakistan": "ur-PK",
  "Bangladesh": "bn-BD",
  "Sri Lanka": "si-LK",
  "Nepal": "ne-NP",
  "Mongolia": "mn-MN",

  // Middle East & Africa
  "UAE": "ar-AE",
  "Saudi Arabia": "ar-SA",
  "Qatar": "ar-QA",
  "Turkey": "tr-TR",
  "Egypt": "ar-EG",
  "South Africa": "en-ZA",
  "Nigeria": "en-NG",
  "Kenya": "en-KE",
  "Morocco": "ar-MA",
  "Algeria": "ar-DZ",
  "Ethiopia": "am-ET",
  "Ghana": "en-GH",
  "Tanzania": "sw-TZ",
  "Uganda": "en-UG",
  "Palestine": "ar-PS",

  // South America
  "Brazil": "pt-BR",
  "Argentina": "es-AR",
  "Chile": "es-CL",
  "Colombia": "es-CO",
  "Peru": "es-PE",
  "Venezuela": "es-VE",
  "Ecuador": "es-EC",
  "Bolivia": "es-BO",
  "Uruguay": "es-UY",
  "Paraguay": "es-PY",
  "Guyana": "en-GY",
  "Suriname": "nl-SR",

  // Central America & Caribbean
  "Costa Rica": "es-CR",
  "Panama": "es-PA",
  "Dominican Republic": "es-DO",
  "Puerto Rico": "es-PR",
  "Guatemala": "es-GT",
  "Honduras": "es-HN",
  "El Salvador": "es-SV",
  "Nicaragua": "es-NI",
  "Cuba": "es-CU",
  "Jamaica": "en-JM",
  "Haiti": "fr-HT",
  "Bahamas": "en-BS",
  "Belize": "en-BZ",
  "Trinidad and Tobago": "en-TT"
};

export const VOICE_LANGUAGES: Record<string, string> = {
  "English (US)": "en-US",
  "English (UK)": "en-GB",
  "Spanish (Spain)": "es-ES",
  "Spanish (Latin America)": "es-MX",
  "Russian": "ru-RU",
  "German": "de-DE",
  "French": "fr-FR",
  "Italian": "it-IT",
  "Portuguese (Brazil)": "pt-BR",
  "Portuguese (Portugal)": "pt-PT",
  "Chinese (Mandarin)": "zh-CN",
  "Japanese": "ja-JP",
  "Korean": "ko-KR",
  "Arabic": "ar-SA",
  "Hindi": "hi-IN",
  "Turkish": "tr-TR",
  "Dutch": "nl-NL",
  "Polish": "pl-PL",
  "Greek": "el-GR",
  "Swedish": "sv-SE",
  "Norwegian": "no-NO",
  "Danish": "da-DK",
  "Finnish": "fi-FI",
  "Czech": "cs-CZ",
  "Hungarian": "hu-HU",
  "Romanian": "ro-RO",
  "Bulgarian": "bg-BG",
  "Ukrainian": "uk-UA",
  "Kazakh": "kk-KZ",
  "Uzbek": "uz-UZ",
  "Vietnamese": "vi-VN",
  "Thai": "th-TH",
  "Indonesian": "id-ID"
};

export const WELCOME_MESSAGE = "Hello, I am MDnexa™ - your guideline-aware medical AI assistant.\nBefore we begin, please confirm your country and region to help me follow local medical standards.\nI can help you understand conditions, pathophysiology, differentials and drug suitability for educational purposes.";