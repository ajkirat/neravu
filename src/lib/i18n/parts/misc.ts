import type { Part } from "./types";

export const misc = {
  // Complaints
  complaintsTitle: { en: "Complaints", kn: "ದೂರುಗಳು", te: "ఫిర్యాదులు", hi: "शिकायतें" },
  complaintsSub: { en: "Note tenant problems. Mark them fixed.", kn: "ಬಾಡಿಗೆದಾರರ ತೊಂದರೆ ಬರೆಯಿರಿ. ಸರಿಯಾದಾಗ ಗುರುತಿಸಿ.", te: "అద్దెదారుల సమస్యలు రాయండి. సరైనప్పుడు గుర్తించండి.", hi: "किरायेदारों की समस्याएं लिखें। ठीक होने पर निशान लगाएं।" },
  noComplaints: { en: "No complaints. Nice!", kn: "ದೂರುಗಳಿಲ್ಲ. ಒಳ್ಳೆಯದು!", te: "ఫిర్యాదులు లేవు. బాగుంది!", hi: "कोई शिकायत नहीं। बढ़िया!" },
  logComplaint: { en: "Log a complaint", kn: "ದೂರು ದಾಖಲಿಸಿ", te: "ఫిర్యాదు నమోదు చేయండి", hi: "शिकायत लिखें" },
  complaintTitleLabel: { en: "What is the problem?", kn: "ಸಮಸ್ಯೆ ಏನು?", te: "సమస్య ఏమిటి?", hi: "समस्या क्या है?" },
  complaintDetails: { en: "More details", kn: "ಹೆಚ್ಚಿನ ವಿವರ", te: "మరిన్ని వివరాలు", hi: "और जानकारी" },
  whichTenant: { en: "Who told you?", kn: "ಯಾರು ಹೇಳಿದರು?", te: "ఎవరు చెప్పారు?", hi: "किसने बताया?" },
  anyone: { en: "Not sure / common area", kn: "ಗೊತ್ತಿಲ್ಲ / ಸಾಮಾನ್ಯ ಜಾಗ", te: "తెలియదు / కామన్ ఏరియా", hi: "पता नहीं / साझा जगह" },
  cmp_OPEN: { en: "Open", kn: "ತೆರೆದಿದೆ", te: "తెరిచి ఉంది", hi: "खुली" },
  cmp_IN_PROGRESS: { en: "Being fixed", kn: "ಸರಿಪಡಿಸಲಾಗುತ್ತಿದೆ", te: "సరిచేస్తున్నారు", hi: "ठीक हो रही है" },
  cmp_RESOLVED: { en: "Fixed", kn: "ಸರಿಯಾಯಿತು", te: "పరిష్కరించారు", hi: "ठीक हो गई" },
  complaintAdded: { en: "Complaint saved.", kn: "ದೂರು ಉಳಿಸಲಾಗಿದೆ.", te: "ఫిర్యాదు సేవ్ అయింది.", hi: "शिकायत सेव हुई।" },
  deleteComplaintConfirm: { en: "Delete this complaint?", kn: "ಈ ದೂರನ್ನು ಅಳಿಸಬೇಕೇ?", te: "ఈ ఫిర్యాదును తొలగించాలా?", hi: "यह शिकायत हटाएं?" },
  // Voice input
  voiceStart: { en: "Speak", kn: "ಮಾತನಾಡಿ", te: "మాట్లాడండి", hi: "बोलें" },
  voiceListening: { en: "Listening…", kn: "ಆಲಿಸುತ್ತಿದೆ…", te: "వింటోంది…", hi: "सुन रहे हैं…" },
  voiceUnsupported: { en: "Voice typing does not work in this browser.", kn: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಟೈಪಿಂಗ್ ಕೆಲಸ ಮಾಡುವುದಿಲ್ಲ.", te: "ఈ బ్రౌజర్‌లో వాయిస్ టైపింగ్ పనిచేయదు.", hi: "इस ब्राउज़र में बोलकर लिखना काम नहीं करता।" },
  // Help
  helpTitle: { en: "How to use Neravu", kn: "ನೆರವು ಬಳಸುವುದು ಹೇಗೆ", te: "నేరవు ఎలా వాడాలి", hi: "नेरवु कैसे इस्तेमाल करें" },
  helpSub: { en: "Short steps for the things you do most.", kn: "ನೀವು ಹೆಚ್ಚು ಮಾಡುವ ಕೆಲಸಗಳ ಸಣ್ಣ ಹಂತಗಳು.", te: "మీరు ఎక్కువగా చేసే పనుల చిన్న దశలు.", hi: "जो काम सबसे ज़्यादा करते हैं, उनके छोटे कदम।" },
  help1Title: { en: "Collect rent", kn: "ಬಾಡಿಗೆ ಪಡೆಯುವುದು", te: "అద్దె వసూలు చేయడం", hi: "किराया लें" },
  help1Body: { en: "Home → Dues to collect → tap “Paid cash” or “Paid UPI”. The receipt is made.", kn: "ಮುಖಪುಟ → ವಸೂಲಿ ಮಾಡಬೇಕಾದ ಬಾಕಿ → “ನಗದು ಪಡೆದೆ” ಅಥವಾ “UPI ಬಂತು” ಒತ್ತಿ. ರಸೀದಿ ಆಗುತ್ತದೆ.", te: "హోమ్ → వసూలు చేయాల్సిన బకాయిలు → “నగదు వచ్చింది” లేదా “UPI వచ్చింది” నొక్కండి. రసీదు తయారవుతుంది.", hi: "होम → बकाया वसूलना है → “नकद मिला” या “UPI मिला” दबाएं। रसीद बन जाती है।" },
  help2Title: { en: "Remind someone who has not paid", kn: "ಪಾವತಿಸದವರಿಗೆ ನೆನಪಿಸುವುದು", te: "చెల్లించని వారికి గుర్తు చేయడం", hi: "जिसने नहीं दिया उसे याद दिलाएं" },
  help2Body: { en: "More → Remind overdue → tap WhatsApp → press send.", kn: "ಇನ್ನಷ್ಟು → ಬಾಕಿ ನೆನಪಿಸಿ → ವಾಟ್ಸಾಪ್ ಒತ್ತಿ → ಕಳುಹಿಸಿ.", te: "మరిన్ని → బకాయిలు గుర్తు చేయండి → వాట్సాప్ నొక్కండి → పంపండి.", hi: "और → बकाया याद दिलाएं → WhatsApp दबाएं → भेजें।" },
  help3Title: { en: "Add a new tenant", kn: "ಹೊಸ ಬಾಡಿಗೆದಾರರನ್ನು ಸೇರಿಸುವುದು", te: "కొత్త అద్దెదారుని చేర్చడం", hi: "नया किरायेदार जोड़ें" },
  help3Body: { en: "Tenants → Add tenant → pick an empty bed → name and phone → Save.", kn: "ಬಾಡಿಗೆದಾರರು → ಬಾಡಿಗೆದಾರರನ್ನು ಸೇರಿಸಿ → ಖಾಲಿ ಹಾಸಿಗೆ ಆರಿಸಿ → ಹೆಸರು, ಫೋನ್ → ಉಳಿಸಿ.", te: "అద్దెదారులు → అద్దెదారును చేర్చండి → ఖాళీ బెడ్ ఎంచుకోండి → పేరు, ఫోన్ → సేవ్.", hi: "किरायेदार → किरायेदार जोड़ें → खाली बेड चुनें → नाम और फ़ोन → सेव।" },
  help4Title: { en: "Write down an expense", kn: "ಖರ್ಚು ಬರೆಯುವುದು", te: "ఖర్చు రాయడం", hi: "खर्च लिखें" },
  help4Body: { en: "Expenses → photo of the bill → check → Save. Or type it in.", kn: "ಖರ್ಚು → ಬಿಲ್ ಫೋಟೋ → ನೋಡಿ → ಉಳಿಸಿ. ಅಥವಾ ಬರೆಯಿರಿ.", te: "ఖర్చులు → బిల్లు ఫోటో → చూడండి → సేవ్. లేదా రాయండి.", hi: "खर्च → बिल की फ़ोटो → जांचें → सेव। या खुद लिखें।" },
  help5Title: { en: "Change the language", kn: "ಭಾಷೆ ಬದಲಿಸುವುದು", te: "భాష మార్చడం", hi: "भाषा बदलें" },
  help5Body: { en: "Tap ಕನ್ನಡ, తెలుగు, हिन्दी or English at the top. Tap “Large text” for bigger letters.", kn: "ಮೇಲೆ ಕನ್ನಡ, తెలుగు, हिन्दी ಅಥವಾ English ಒತ್ತಿ. ದೊಡ್ಡ ಅಕ್ಷರಕ್ಕೆ “ದೊಡ್ಡ ಅಕ್ಷರ” ಒತ್ತಿ.", te: "పైన ಕನ್ನಡ, తెలుగు, हिन्दी లేదా English నొక్కండి. పెద్ద అక్షరాలకు “పెద్ద అక్షరాలు” నొక్కండి.", hi: "ऊपर ಕನ್ನಡ, తెలుగు, हिन्दी या English दबाएं। बड़े अक्षरों के लिए “बड़े अक्षर” दबाएं।" },
  installTitle: { en: "Put Neravu on your phone", kn: "ನೆರವನ್ನು ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲಿ ಇರಿಸಿ", te: "నేరవును మీ ఫోన్‌లో ఉంచండి", hi: "नेरवु को फ़ोन पर रखें" },
  installBody: { en: "In Chrome: ⋮ → “Add to Home screen”. It opens like an app.", kn: "Chrome ನಲ್ಲಿ: ⋮ → “Add to Home screen”. ಆ್ಯಪ್‌ನಂತೆ ತೆರೆಯುತ್ತದೆ.", te: "Chrome లో: ⋮ → “Add to Home screen”. ఇది యాప్ లాగా తెరుచుకుంటుంది.", hi: "Chrome में: ⋮ → “Add to Home screen”। यह ऐप की तरह खुलेगा।" },
} satisfies Part;
