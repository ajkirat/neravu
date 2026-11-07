import type { Part } from "./types";

export const settings = {
  settingsTitle: { en: "Settings", kn: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", te: "సెట్టింగులు", hi: "सेटिंग्स" },
  settingsSub: { en: "Your details and how tenants pay you.", kn: "ನಿಮ್ಮ ವಿವರಗಳು ಮತ್ತು ಬಾಡಿಗೆದಾರರು ಹೇಗೆ ಪಾವತಿಸುತ್ತಾರೆ.", te: "మీ వివరాలు మరియు అద్దెదారులు ఎలా చెల్లిస్తారు.", hi: "आपकी जानकारी और किरायेदार कैसे भुगतान करें।" },
  saveSettings: { en: "Save settings", kn: "ಸೆಟ್ಟಿಂಗ್ ಉಳಿಸಿ", te: "సెట్టింగులు సేవ్ చేయండి", hi: "सेटिंग्स सेव करें" },
  mobileNumber: { en: "Mobile number", kn: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ", te: "మొబైల్ నంబర్", hi: "मोबाइल नंबर" },
  businessName: { en: "PG / business name", kn: "PG / ವ್ಯಾಪಾರದ ಹೆಸರು", te: "PG / వ్యాపార పేరు", hi: "PG / बिज़नेस का नाम" },
  businessNameHint: { en: "Tenants see this on pay pages and the enquiry form.", kn: "ಬಾಡಿಗೆದಾರರು ಇದನ್ನು ಪಾವತಿ ಪುಟ ಮತ್ತು ವಿಚಾರಣೆ ಫಾರ್ಮ್‌ನಲ್ಲಿ ನೋಡುತ್ತಾರೆ.", te: "అద్దెదారులు దీన్ని చెల్లింపు పేజీ, విచారణ ఫారంలో చూస్తారు.", hi: "किरायेदार इसे भुगतान पेज और पूछताछ फ़ॉर्म पर देखते हैं।" },
  upiIdLabel: { en: "UPI ID for rent", kn: "ಬಾಡಿಗೆಗಾಗಿ UPI ID", te: "అద్దె కోసం UPI ID", hi: "किराये के लिए UPI ID" },
  upiIdHint: { en: "Tenants pay to this UPI ID (like name@okbank). Leave empty for no pay links.", kn: "ಬಾಡಿಗೆದಾರರು ಈ UPI ID ಗೆ ಪಾವತಿಸುತ್ತಾರೆ (ಉದಾ: name@okbank). ಪಾವತಿ ಲಿಂಕ್ ಬೇಡವಾದರೆ ಖಾಲಿ ಬಿಡಿ.", te: "అద్దెదారులు ఈ UPI ID కి చెల్లిస్తారు (ఉదా: name@okbank). చెల్లింపు లింక్ వద్దంటే ఖాళీగా వదిలేయండి.", hi: "किरायेदार इस UPI ID पर देते हैं (जैसे name@okbank)। भुगतान लिंक नहीं चाहिए तो खाली छोड़ें।" },
  settingsSaved: { en: "Settings saved.", kn: "ಸೆಟ್ಟಿಂಗ್ ಉಳಿಸಲಾಗಿದೆ.", te: "సెట్టింగులు సేవ్ అయ్యాయి.", hi: "सेटिंग्स सेव हुईं।" },
  appLanguage: { en: "App language", kn: "ಆ್ಯಪ್ ಭಾಷೆ", te: "యాప్ భాష", hi: "ऐप की भाषा" },
  appLanguageHint: { en: "Changes every screen. Tenants get messages in their own language.", kn: "ಎಲ್ಲಾ ಪರದೆ ಬದಲಾಗುತ್ತದೆ. ಬಾಡಿಗೆದಾರರಿಗೆ ಅವರ ಭಾಷೆಯಲ್ಲಿ ಸಂದೇಶ.", te: "ప్రతి స్క్రీన్ మారుతుంది. అద్దెదారులకు వారి భాషలో సందేశాలు.", hi: "हर स्क्रीन बदलती है। किरायेदारों को उनकी भाषा में मैसेज मिलते हैं।" },
  textSize: { en: "Text size", kn: "ಅಕ್ಷರದ ಗಾತ್ರ", te: "అక్షరాల పరిమాణం", hi: "अक्षर का आकार" },
  textNormal: { en: "Normal", kn: "ಸಾಮಾನ್ಯ", te: "సాధారణం", hi: "सामान्य" },
  textLarge: { en: "Large", kn: "ದೊಡ್ಡದು", te: "పెద్దది", hi: "बड़ा" },
  upiInvalid: { en: "UPI ID should look like name@bank.", kn: "UPI ID ಹೀಗಿರಬೇಕು: name@bank.", te: "UPI ID ఇలా ఉండాలి: name@bank.", hi: "UPI ID ऐसी दिखनी चाहिए: name@bank।" },
} satisfies Part;
