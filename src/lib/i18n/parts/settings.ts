import type { Part } from "./types";

export const settings = {
  settingsTitle: { en: "Settings", kn: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", te: "సెట్టింగులు" },
  settingsSub: { en: "Your details and how tenants pay you.", kn: "ನಿಮ್ಮ ವಿವರಗಳು ಮತ್ತು ಬಾಡಿಗೆದಾರರು ಹೇಗೆ ಪಾವತಿಸುತ್ತಾರೆ.", te: "మీ వివరాలు మరియు అద్దెదారులు ఎలా చెల్లిస్తారు." },
  saveSettings: { en: "Save settings", kn: "ಸೆಟ್ಟಿಂಗ್ ಉಳಿಸಿ", te: "సెట్టింగులు సేవ్ చేయండి" },
  mobileNumber: { en: "Mobile number", kn: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ", te: "మొబైల్ నంబర్" },
  businessName: { en: "PG / business name", kn: "PG / ವ್ಯಾಪಾರದ ಹೆಸರು", te: "PG / వ్యాపార పేరు" },
  businessNameHint: { en: "Tenants see this on pay pages and the enquiry form.", kn: "ಪಾವತಿ ಪುಟ ಮತ್ತು ವಿಚಾರಣೆ ಫಾರ್ಮ್‌ನಲ್ಲಿ ಬಾಡಿಗೆದಾರರಿಗೆ ಕಾಣಿಸುತ್ತದೆ.", te: "చెల్లింపు పేజీ మరియు విచారణ ఫారమ్‌లో అద్దెదారులకు కనిపిస్తుంది." },
  upiIdLabel: { en: "UPI ID for rent", kn: "ಬಾಡಿಗೆಗಾಗಿ UPI ID", te: "అద్దె కోసం UPI ID" },
  upiIdHint: { en: "Tenants pay to this UPI ID (like name@okbank). Leave empty for no pay links.", kn: "ಬಾಡಿಗೆದಾರರು ಈ UPI ID ಗೆ ನೇರವಾಗಿ ಪಾವತಿಸುತ್ತಾರೆ (ಉದಾ. name@okbank). ಖಾಲಿ ಬಿಟ್ಟರೆ ಆನ್‌ಲೈನ್ ಲಿಂಕ್ ಆಫ್ ಆಗುತ್ತದೆ.", te: "అద్దెదారులు ఈ UPI ID కి నేరుగా చెల్లిస్తారు (ఉదా. name@okbank). ఖాళీగా ఉంచితే ఆన్‌లైన్ లింకులు ఆఫ్ అవుతాయి." },
  settingsSaved: { en: "Settings saved.", kn: "ಸೆಟ್ಟಿಂಗ್ ಉಳಿಸಲಾಗಿದೆ.", te: "సెట్టింగులు సేవ్ అయ్యాయి." },
  appLanguage: { en: "App language", kn: "ಆ್ಯಪ್ ಭಾಷೆ", te: "యాప్ భాష" },
  appLanguageHint: { en: "Changes every screen. Tenants get messages in their own language.", kn: "ಎಲ್ಲಾ ಪರದೆಗಳು ಬದಲಾಗುತ್ತವೆ. ಬಾಡಿಗೆದಾರರಿಗೆ ಅವರ ಭಾಷೆಯಲ್ಲೇ ಸಂದೇಶ ಹೋಗುತ್ತದೆ.", te: "అన్ని స్క్రీన్లు మారతాయి. అద్దెదారులకు వారి భాషలోనే సందేశాలు వెళ్తాయి." },
  textSize: { en: "Text size", kn: "ಅಕ್ಷರದ ಗಾತ್ರ", te: "అక్షరాల పరిమాణం" },
  textNormal: { en: "Normal", kn: "ಸಾಮಾನ್ಯ", te: "సాధారణం" },
  textLarge: { en: "Large", kn: "ದೊಡ್ಡದು", te: "పెద్దది" },
  upiInvalid: { en: "UPI ID should look like name@bank.", kn: "UPI ID ಹೀಗಿರಬೇಕು: name@bank.", te: "UPI ID ఇలా ఉండాలి: name@bank." },
} satisfies Part;
