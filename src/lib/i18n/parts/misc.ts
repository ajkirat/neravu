import type { Part } from "./types";

export const misc = {
  // Complaints
  complaintsTitle: { en: "Complaints", kn: "ದೂರುಗಳು", te: "ఫిర్యాదులు" },
  complaintsSub: { en: "Note tenant problems. Mark them fixed.", kn: "ಬಾಡಿಗೆದಾರರು ಹೇಳುವ ತೊಂದರೆಗಳನ್ನು ಬರೆದಿಡಿ, ಸರಿಯಾದ ಮೇಲೆ ಗುರುತಿಸಿ.", te: "అద్దెదారులు చెప్పే సమస్యలను రాసుకోండి, పరిష్కారమయ్యాక గుర్తించండి." },
  noComplaints: { en: "No complaints. Nice!", kn: "ದೂರುಗಳಿಲ್ಲ. ಒಳ್ಳೆಯದು!", te: "ఫిర్యాదులు లేవు. బాగుంది!" },
  logComplaint: { en: "Log a complaint", kn: "ದೂರು ದಾಖಲಿಸಿ", te: "ఫిర్యాదు నమోదు చేయండి" },
  complaintTitleLabel: { en: "What is the problem?", kn: "ಸಮಸ್ಯೆ ಏನು?", te: "సమస్య ఏమిటి?" },
  complaintDetails: { en: "More details", kn: "ಹೆಚ್ಚಿನ ವಿವರ", te: "మరిన్ని వివరాలు" },
  whichTenant: { en: "Who told you?", kn: "ಯಾರು ಹೇಳಿದರು?", te: "ఎవరు చెప్పారు?" },
  anyone: { en: "Not sure / common area", kn: "ಗೊತ್ತಿಲ್ಲ / ಸಾಮಾನ್ಯ ಜಾಗ", te: "తెలియదు / కామన్ ఏరియా" },
  cmp_OPEN: { en: "Open", kn: "ತೆರೆದಿದೆ", te: "తెరిచి ఉంది" },
  cmp_IN_PROGRESS: { en: "Being fixed", kn: "ಸರಿಪಡಿಸಲಾಗುತ್ತಿದೆ", te: "సరిచేస్తున్నారు" },
  cmp_RESOLVED: { en: "Fixed", kn: "ಸರಿಯಾಯಿತು", te: "పరిష్కరించారు" },
  complaintAdded: { en: "Complaint saved.", kn: "ದೂರು ಉಳಿಸಲಾಗಿದೆ.", te: "ఫిర్యాదు సేవ్ అయింది." },
  deleteComplaintConfirm: { en: "Delete this complaint?", kn: "ಈ ದೂರನ್ನು ಅಳಿಸಬೇಕೇ?", te: "ఈ ఫిర్యాదును తొలగించాలా?" },
  // Voice input
  voiceStart: { en: "Speak", kn: "ಮಾತನಾಡಿ", te: "మాట్లాడండి" },
  voiceListening: { en: "Listening…", kn: "ಆಲಿಸುತ್ತಿದೆ…", te: "వింటోంది…" },
  voiceUnsupported: { en: "Voice typing does not work in this browser.", kn: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಟೈಪಿಂಗ್ ಲಭ್ಯವಿಲ್ಲ.", te: "ఈ బ్రౌజర్‌లో వాయిస్ టైపింగ్ అందుబాటులో లేదు." },
  // Help
  helpTitle: { en: "How to use Neravu", kn: "ನೆರವು ಬಳಸುವುದು ಹೇಗೆ", te: "నేరవు ఎలా వాడాలి" },
  helpSub: { en: "Short steps for the things you do most.", kn: "ನೀವು ಹೆಚ್ಚು ಮಾಡುವ ಕೆಲಸಗಳ ಸಣ್ಣ ಹಂತಗಳು.", te: "మీరు ఎక్కువగా చేసే పనుల చిన్న దశలు." },
  help1Title: { en: "Collect rent", kn: "ಬಾಡಿಗೆ ಪಡೆಯುವುದು", te: "అద్దె వసూలు చేయడం" },
  help1Body: { en: "Home → Dues to collect → tap “Paid cash” or “Paid UPI”. The receipt is made.", kn: "ಮುಖಪುಟ → “ವಸೂಲಿ ಮಾಡಬೇಕಾದ ಬಾಕಿ” ನಲ್ಲಿ ಬಾಡಿಗೆದಾರರನ್ನು ಹುಡುಕಿ → “ನಗದು ಪಡೆದೆ” ಅಥವಾ “UPI ಬಂತು” ಒತ್ತಿ. ರಸೀದಿ ತಾನಾಗಿ ಆಗುತ್ತದೆ.", te: "హోమ్ → “వసూలు చేయాల్సిన బకాయిలు” లో అద్దెదారుని కనుగొనండి → “నగదు వచ్చింది” లేదా “UPI వచ్చింది” నొక్కండి. రసీదు ఆటోమేటిక్‌గా వస్తుంది." },
  help2Title: { en: "Remind someone who has not paid", kn: "ಪಾವತಿಸದವರಿಗೆ ನೆನಪಿಸುವುದು", te: "చెల్లించని వారికి గుర్తు చేయడం" },
  help2Body: { en: "More → Remind overdue → tap WhatsApp → press send.", kn: "ಇನ್ನಷ್ಟು → ಬಾಕಿ ನೆನಪಿಸಿ → ಅವರ ಹೆಸರಿನ ಪಕ್ಕದ ವಾಟ್ಸಾಪ್ ಒತ್ತಿ. ಸಂದೇಶ ಸಿದ್ಧವಾಗಿರುತ್ತದೆ, ಕಳುಹಿಸಿ ಒತ್ತಿದರೆ ಸಾಕು.", te: "మరిన్ని → బకాయిలు గుర్తు చేయండి → వారి పేరు పక్కన వాట్సాప్ నొక్కండి. సందేశం సిద్ధంగా ఉంటుంది, సెండ్ నొక్కితే చాలు." },
  help3Title: { en: "Add a new tenant", kn: "ಹೊಸ ಬಾಡಿಗೆದಾರರನ್ನು ಸೇರಿಸುವುದು", te: "కొత్త అద్దెదారుని చేర్చడం" },
  help3Body: { en: "Tenants → Add tenant → pick an empty bed → name and phone → Save.", kn: "ಬಾಡಿಗೆದಾರರು → ಬಾಡಿಗೆದಾರ ಸೇರಿಸಿ → ಖಾಲಿ ಹಾಸಿಗೆ ಆರಿಸಿ → ಹೆಸರು, ಫೋನ್ ತುಂಬಿ → ಉಳಿಸಿ. ಬಾಡಿಗೆ ತಾನಾಗಿ ಶುರುವಾಗುತ್ತದೆ.", te: "అద్దెదారులు → అద్దెదారుని జోడించండి → ఖాళీ మంచం ఎంచుకోండి → పేరు, ఫోన్ రాయండి → సేవ్. అద్దె ఆటోమేటిక్‌గా మొదలవుతుంది." },
  help4Title: { en: "Write down an expense", kn: "ಖರ್ಚು ಬರೆಯುವುದು", te: "ఖర్చు రాయడం" },
  help4Body: { en: "Expenses → photo of the bill → check → Save. Or type it in.", kn: "ಖರ್ಚುಗಳು → ಬಿಲ್‌ನ ಫೋಟೋ ತೆಗೆಯಿರಿ → ಸಂಖ್ಯೆ ಸರಿಯಾಗಿದೆಯೇ ನೋಡಿ → ಉಳಿಸಿ. ಅಥವಾ ಕೈಯಿಂದ ಬರೆಯಿರಿ.", te: "ఖర్చులు → బిల్లు ఫోటో తీయండి → అంకెలు సరిచూడండి → సేవ్. లేదా చేతితో రాయండి." },
  help5Title: { en: "Change the language", kn: "ಭಾಷೆ ಬದಲಿಸುವುದು", te: "భాష మార్చడం" },
  help5Body: { en: "Tap ಕನ್ನಡ, తెలుగు or English at the top. Tap “Large text” for bigger letters.", kn: "ಯಾವುದೇ ಪರದೆಯ ಮೇಲ್ಭಾಗದಲ್ಲಿ ಕನ್ನಡ, తెలుగు ಅಥವಾ English ಒತ್ತಿ. ಅಕ್ಷರ ಚಿಕ್ಕದಾಗಿದ್ದರೆ “ದೊಡ್ಡ ಅಕ್ಷರ” ಬಳಸಿ.", te: "ఏ స్క్రీన్ పైనైనా ಕನ್ನಡ, తెలుగు లేదా English నొక్కండి. అక్షరాలు చిన్నగా ఉంటే “పెద్ద అక్షరాలు” వాడండి." },
  installTitle: { en: "Put Neravu on your phone", kn: "ನೆರವನ್ನು ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲಿ ಇರಿಸಿ", te: "నేరవును మీ ఫోన్‌లో ఉంచండి" },
  installBody: { en: "In Chrome: ⋮ → “Add to Home screen”. It opens like an app.", kn: "Chrome ನಲ್ಲಿ ⋮ ಮೆನು → “Add to Home screen” ಒತ್ತಿ. ಆಗ ಆ್ಯಪ್‌ನಂತೆ ತೆರೆಯುತ್ತದೆ.", te: "Chrome లో ⋮ మెనూ → “Add to Home screen” నొక్కండి. అప్పుడు యాప్‌లా తెరుచుకుంటుంది." },
} satisfies Part;
