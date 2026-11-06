import type { Part } from "./types";

// Replies from the Neravu WhatsApp number, and the app text around it.
export const wabot = {
  waBillAsk: {
    en: "Is this an expense?\n{amt} · {cat}{vendor}\nDate: {date}",
    kn: "ಇದು ಖರ್ಚೇ?\n{amt} · {cat}{vendor}\nದಿನಾಂಕ: {date}",
    te: "ఇది ఖర్చా?\n{amt} · {cat}{vendor}\nతేదీ: {date}",
  },
  waYes: { en: "Yes", kn: "ಹೌದು", te: "అవును" },
  waNo: { en: "No", kn: "ಇಲ್ಲ", te: "కాదు" },
  waBillAdded: {
    en: "✅ Added {amt} ({cat}), dated {when}, to expenses. Nothing else to do.",
    kn: "✅ {amt} ({cat}) ಖರ್ಚಿಗೆ ಸೇರಿಸಲಾಗಿದೆ, ದಿನಾಂಕ {when}. ಬೇರೇನೂ ಮಾಡಬೇಕಿಲ್ಲ.",
    te: "✅ {amt} ({cat}) ఖర్చులలో చేర్చబడింది, తేదీ {when}. ఇంకేమీ చేయనవసరం లేదు.",
  },
  waBillCancelled: { en: "OK, not added.", kn: "ಸರಿ, ಸೇರಿಸಲಿಲ್ಲ.", te: "సరే, చేర్చలేదు." },
  waBillAlready: { en: "This bill was already answered.", kn: "ಈ ಬಿಲ್‌ಗೆ ಈಗಾಗಲೇ ಉತ್ತರಿಸಲಾಗಿದೆ.", te: "ఈ బిల్‌కు ఇప్పటికే సమాధానం ఇచ్చారు." },
  waBillNotBill: {
    en: "I could not read a bill in this photo. Please send a clear photo of the whole bill.",
    kn: "ಈ ಫೋಟೋದಲ್ಲಿ ಬಿಲ್ ಓದಲು ಆಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಇಡೀ ಬಿಲ್‌ನ ಸ್ಪಷ್ಟ ಫೋಟೋ ಕಳುಹಿಸಿ.",
    te: "ఈ ఫోటోలో బిల్ చదవలేకపోయాను. దయచేసి మొత్తం బిల్ స్పష్టమైన ఫోటో పంపండి.",
  },
  waBillFailed: {
    en: "Sorry, something went wrong reading this bill. Please send it again in a few minutes.",
    kn: "ಕ್ಷಮಿಸಿ, ಈ ಬಿಲ್ ಓದುವಾಗ ತೊಂದರೆಯಾಯಿತು. ಕೆಲವು ನಿಮಿಷಗಳ ನಂತರ ಮತ್ತೆ ಕಳುಹಿಸಿ.",
    te: "క్షమించండి, ఈ బిల్ చదవడంలో సమస్య వచ్చింది. కొన్ని నిమిషాల తర్వాత మళ్ళీ పంపండి.",
  },
  waBillOff: {
    en: "Bill reading is not switched on yet. Please add the expense in the Neravu app.",
    kn: "ಬಿಲ್ ಓದುವಿಕೆ ಇನ್ನೂ ಆನ್ ಆಗಿಲ್ಲ. ದಯವಿಟ್ಟು ನೆರವು ಆ್ಯಪ್‌ನಲ್ಲಿ ಖರ್ಚು ಸೇರಿಸಿ.",
    te: "బిల్ చదవడం ఇంకా ఆన్ కాలేదు. దయచేసి నెరవు యాప్‌లో ఖర్చు జోడించండి.",
  },
  waBillPhotoOnly: {
    en: "Please send the bill as a photo (not a PDF or file).",
    kn: "ದಯವಿಟ್ಟು ಬಿಲ್ ಅನ್ನು ಫೋಟೋ ಆಗಿ ಕಳುಹಿಸಿ (PDF ಅಥವಾ ಫೈಲ್ ಅಲ್ಲ).",
    te: "దయచేసి బిల్‌ను ఫోటోగా పంపండి (PDF లేదా ఫైల్ కాదు).",
  },
  waBillLimit: {
    en: "Too many bills today. Please add the rest in the Neravu app.",
    kn: "ಇಂದು ತುಂಬಾ ಬಿಲ್‌ಗಳು ಬಂದಿವೆ. ಉಳಿದವನ್ನು ನೆರವು ಆ್ಯಪ್‌ನಲ್ಲಿ ಸೇರಿಸಿ.",
    te: "ఈరోజు చాలా బిల్లులు వచ్చాయి. మిగిలినవి నెరవు యాప్‌లో జోడించండి.",
  },
  waBillNoPending: {
    en: "There is no bill waiting for an answer. Send a photo of a bill to add it to expenses.",
    kn: "ಉತ್ತರಕ್ಕಾಗಿ ಯಾವುದೇ ಬಿಲ್ ಕಾಯುತ್ತಿಲ್ಲ. ಖರ್ಚಿಗೆ ಸೇರಿಸಲು ಬಿಲ್‌ನ ಫೋಟೋ ಕಳುಹಿಸಿ.",
    te: "సమాధానం కోసం ఏ బిల్ వేచి లేదు. ఖర్చులలో చేర్చడానికి బిల్ ఫోటో పంపండి.",
  },
  waBillHelp: {
    en: "Hi {name}! Send a photo of any bill here and I will add it to {pg}'s expenses.",
    kn: "ನಮಸ್ಕಾರ {name}! ಯಾವುದೇ ಬಿಲ್‌ನ ಫೋಟೋ ಇಲ್ಲಿ ಕಳುಹಿಸಿ, ನಾನು ಅದನ್ನು {pg} ಖರ್ಚಿಗೆ ಸೇರಿಸುತ್ತೇನೆ.",
    te: "నమస్కారం {name}! ఏ బిల్ ఫోటో అయినా ఇక్కడ పంపండి, నేను దాన్ని {pg} ఖర్చులలో చేరుస్తాను.",
  },
  waUnknown: {
    en: "This number is not linked to a PG on Neravu. Ask your PG owner to add you as a caretaker with this mobile number.",
    kn: "ಈ ಸಂಖ್ಯೆ ನೆರವುನಲ್ಲಿ ಯಾವುದೇ ಪಿಜಿಗೆ ಜೋಡಣೆಯಾಗಿಲ್ಲ. ಈ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯೊಂದಿಗೆ ನಿಮ್ಮನ್ನು ಕೇರ್‌ಟೇಕರ್ ಆಗಿ ಸೇರಿಸಲು ಪಿಜಿ ಮಾಲೀಕರನ್ನು ಕೇಳಿ.",
    te: "ఈ నంబర్ నెరవులో ఏ పిజికీ లింక్ కాలేదు. ఈ మొబైల్ నంబర్‌తో మిమ్మల్ని కేర్‌టేకర్‌గా జోడించమని పిజి యజమానిని అడగండి.",
  },
  waAmbiguous: {
    en: "This number is linked to more than one PG. Please add the expense in the Neravu app.",
    kn: "ಈ ಸಂಖ್ಯೆ ಒಂದಕ್ಕಿಂತ ಹೆಚ್ಚು ಪಿಜಿಗೆ ಜೋಡಣೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನೆರವು ಆ್ಯಪ್‌ನಲ್ಲಿ ಖರ್ಚು ಸೇರಿಸಿ.",
    te: "ఈ నంబర్ ఒకటి కంటే ఎక్కువ పిజిలకు లింక్ అయింది. దయచేసి నెరవు యాప్‌లో ఖర్చు జోడించండి.",
  },
  // In the app
  waBillsHint: {
    en: "Caretakers can WhatsApp a bill photo to {num}. It is read and added here after they reply Yes.",
    kn: "ಕೇರ್‌ಟೇಕರ್‌ಗಳು ಬಿಲ್ ಫೋಟೋವನ್ನು {num} ಗೆ ವಾಟ್ಸಾಪ್ ಮಾಡಬಹುದು. ಅವರು 'ಹೌದು' ಎಂದು ಉತ್ತರಿಸಿದ ನಂತರ ಇಲ್ಲಿ ಸೇರುತ್ತದೆ.",
    te: "కేర్‌టేకర్లు బిల్ ఫోటోను {num} కు వాట్సాప్ చేయవచ్చు. వారు 'అవును' అని చెప్పాక ఇక్కడ చేరుతుంది.",
  },
  waBadge: { en: "WhatsApp", kn: "ವಾಟ್ಸಾಪ್", te: "వాట్సాప్" },
  viewBill: { en: "View bill", kn: "ಬಿಲ್ ನೋಡಿ", te: "బిల్ చూడండి" },
  sentBy: { en: "Sent by {name}", kn: "{name} ಕಳುಹಿಸಿದ್ದು", te: "{name} పంపారు" },
  rcptStillDue: { en: "{amt} is still pending", kn: "{amt} ಇನ್ನೂ ಬಾಕಿ ಇದೆ", te: "{amt} ఇంకా బకాయి ఉంది" },
  rcptAllClear: { en: "Nothing is pending now", kn: "ಈಗ ಯಾವುದೇ ಬಾಕಿ ಇಲ್ಲ", te: "ఇప్పుడు ఏ బకాయి లేదు" },
  rcptSendWa: { en: "Send receipt", kn: "ರಸೀದಿ ಕಳುಹಿಸಿ", te: "రసీదు పంపండి" },
  rcptWaText: {
    en: "Receipt from {pg}: received {amt} from {name} on {when}. {balance}. Thank you!",
    kn: "{pg} ರಸೀದಿ: {name} ಅವರಿಂದ {when} ರಂದು {amt} ಸ್ವೀಕರಿಸಲಾಗಿದೆ. {balance}. ಧನ್ಯವಾದಗಳು!",
    te: "{pg} రసీదు: {name} నుండి {when} న {amt} అందింది. {balance}. ధన్యవాదాలు!",
  },
  autoReceiptsLabel: {
    en: "Send the tenant a WhatsApp receipt after every payment (cash too)",
    kn: "ಪ್ರತಿ ಪಾವತಿಯ ನಂತರ ಬಾಡಿಗೆದಾರರಿಗೆ ವಾಟ್ಸಾಪ್ ರಸೀದಿ ಕಳುಹಿಸಿ (ನಗದು ಸಹ)",
    te: "ప్రతి చెల్లింపు తర్వాత అద్దెదారుకు వాట్సాప్ రసీదు పంపండి (నగదు కూడా)",
  },
  cashTitle: { en: "Cash with caretakers", kn: "ಕೇರ್‌ಟೇಕರ್‌ಗಳ ಬಳಿ ಇರುವ ನಗದು", te: "కేర్‌టేకర్ల దగ్గర ఉన్న నగదు" },
  cashWith: { en: "{name} has {amt} cash ({n} payments)", kn: "{name} ಬಳಿ {amt} ನಗದು ಇದೆ ({n} ಪಾವತಿಗಳು)", te: "{name} దగ్గర {amt} నగదు ఉంది ({n} చెల్లింపులు)" },
  cashReceivedBtn: { en: "I received {amt}", kn: "ನಾನು {amt} ಪಡೆದಿದ್ದೇನೆ", te: "నేను {amt} తీసుకున్నాను" },
  cashReceivedConfirm: { en: "Did you receive {amt} cash from {name}?", kn: "{name} ಅವರಿಂದ {amt} ನಗದು ಪಡೆದಿರಾ?", te: "{name} నుండి {amt} నగదు తీసుకున్నారా?" },
  cashNone: { en: "No cash is waiting with caretakers.", kn: "ಕೇರ್‌ಟೇಕರ್‌ಗಳ ಬಳಿ ಯಾವುದೇ ನಗದು ಬಾಕಿ ಇಲ್ಲ.", te: "కేర్‌టేకర్ల దగ్గర ఏ నగదు బాకీ లేదు." },
  cashBanner: { en: "{amt} cash is with your caretakers. Tap to check.", kn: "{amt} ನಗದು ನಿಮ್ಮ ಕೇರ್‌ಟೇಕರ್‌ಗಳ ಬಳಿ ಇದೆ. ನೋಡಲು ಒತ್ತಿ.", te: "{amt} నగదు మీ కేర్‌టేకర్ల దగ్గర ఉంది. చూడటానికి నొక్కండి." },
  cashMine: { en: "You have collected {amt} in cash. Please give it to the owner.", kn: "ನೀವು {amt} ನಗದು ಸಂಗ್ರಹಿಸಿದ್ದೀರಿ. ದಯವಿಟ್ಟು ಮಾಲೀಕರಿಗೆ ಕೊಡಿ.", te: "మీరు {amt} నగదు వసూలు చేశారు. దయచేసి యజమానికి ఇవ్వండి." },
} satisfies Part;
