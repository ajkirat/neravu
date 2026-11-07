import type { Part } from "./types";

// Bill photos on expenses, and the duplicate warning.
export const dupes = {
  takePhoto: { en: "Take photo", kn: "ಫೋಟೋ ತೆಗೆಯಿರಿ", te: "ఫోటో తీయండి", hi: "फ़ोटो लें" },
  choosePhoto: { en: "Choose from gallery", kn: "ಗ್ಯಾಲರಿಯಿಂದ ಆರಿಸಿ", te: "గ్యాలరీ నుండి ఎంచుకోండి", hi: "गैलरी से चुनें" },
  photoOnlyHint: { en: "Photo saved. Type the amount below.", kn: "ಫೋಟೋ ಉಳಿಸಲಾಗಿದೆ. ಕೆಳಗೆ ಮೊತ್ತ ಬರೆಯಿರಿ.", te: "ఫోటో సేవ్ అయింది. కింద మొత్తం రాయండి.", hi: "फ़ोटो सेव हुई। नीचे रकम लिखें।" },
  photoAttached: { en: "Photo attached.", kn: "ಫೋಟೋ ಸೇರಿಸಲಾಗಿದೆ.", te: "ఫోటో జోడించబడింది.", hi: "फ़ोटो लगी।" },
  billPhoto: { en: "Bill photo", kn: "ಬಿಲ್ ಫೋಟೋ", te: "బిల్ ఫోటో", hi: "बिल की फ़ोटो" },
  removePhoto: { en: "Remove photo", kn: "ಫೋಟೋ ತೆಗೆಯಿರಿ", te: "ఫోటో తీసివేయండి", hi: "फ़ोटो हटाएं" },
  dupTitle: { en: "This may be a duplicate.", kn: "ಇದು ನಕಲು ಇರಬಹುದು.", te: "ఇది నకలు కావచ్చు.", hi: "यह दोबारा हो सकता है।" },
  dupWarn: {
    en: "Looks like a bill already added on {date} ({amt}{vendor}).",
    kn: "{date} ರಂದು ಈಗಾಗಲೇ ಸೇರಿಸಿದ ಬಿಲ್‌ನಂತೆ ಕಾಣುತ್ತದೆ ({amt}{vendor}).",
    te: "{date} న ఇప్పటికే జోడించిన బిల్ లాగా ఉంది ({amt}{vendor}).", hi: "लगता है यह बिल {date} को जुड़ चुका है ({amt}{vendor})।",
  },
  dup_SAME_PHOTO: { en: "It is the same photo.", kn: "ಇದು ಅದೇ ಫೋಟೋ.", te: "ఇది అదే ఫోటో.", hi: "यह वही फ़ोटो है।" },
  dup_SIMILAR_PHOTO: { en: "The photo is almost the same.", kn: "ಫೋಟೋ ಬಹುತೇಕ ಅದೇ.", te: "ఫోటో దాదాపు అదే.", hi: "फ़ोटो लगभग वैसी ही है।" },
  dup_SAME_DETAILS: { en: "Same shop, same amount, same day.", kn: "ಅದೇ ಅಂಗಡಿ, ಅದೇ ಮೊತ್ತ, ಅದೇ ದಿನ.", te: "అదే షాపు, అదే మొత్తం, అదే రోజు.", hi: "वही दुकान, वही रकम, वही दिन।" },
  dupSee: { en: "See it", kn: "ನೋಡಿ", te: "చూడండి", hi: "देखें" },
  dupSaveAnyway: { en: "Save anyway", kn: "ಆದರೂ ಉಳಿಸಿ", te: "అయినా సేవ్ చేయండి", hi: "फिर भी सेव करें" },
  dupBadge: { en: "May be a duplicate", kn: "ನಕಲು ಇರಬಹುದು", te: "నకలు కావచ్చు", hi: "दोबारा हो सकता है" },
  notDuplicate: { en: "Not a duplicate", kn: "ನಕಲು ಅಲ್ಲ", te: "నకలు కాదు", hi: "दोबारा नहीं है" },
  dupOf: { en: "Looks like the expense from {date}", kn: "{date} ರ ಖರ್ಚಿನಂತೆ ಕಾಣುತ್ತದೆ", te: "{date} ఖర్చు లాగా ఉంది", hi: "{date} वाले खर्च जैसा लगता है" },
  expenseTitle: { en: "Expense", kn: "ಖರ್ಚು", te: "ఖర్చు", hi: "खर्च" },
  openFull: { en: "Open full size", kn: "ಪೂರ್ಣ ಗಾತ್ರದಲ್ಲಿ ತೆರೆಯಿರಿ", te: "పూర్తి పరిమాణంలో తెరవండి", hi: "पूरा खोलें" },
  tapToEnlarge: { en: "Tap the photo to enlarge", kn: "ದೊಡ್ಡದಾಗಿಸಲು ಫೋಟೋ ಒತ್ತಿ", te: "పెద్దదిగా చూడటానికి ఫోటో నొక్కండి", hi: "बड़ा करने के लिए फ़ोटो पर टैप करें" },
  close: { en: "Close", kn: "ಮುಚ್ಚಿ", te: "మూసివేయండి", hi: "बंद करें" },
  noPhoto: { en: "No bill photo", kn: "ಬಿಲ್ ಫೋಟೋ ಇಲ್ಲ", te: "బిల్ ఫోటో లేదు", hi: "बिल की फ़ोटो नहीं" },
  waDupAsk: {
    en: "⚠️ This looks like a bill already added on {date} ({amt}{vendor}). {why}\\nAdd it anyway?",
    kn: "⚠️ ಇದು {date} ರಂದು ಈಗಾಗಲೇ ಸೇರಿಸಿದ ಬಿಲ್‌ನಂತೆ ಕಾಣುತ್ತದೆ ({amt}{vendor}). {why}\\nಆದರೂ ಸೇರಿಸಬೇಕೇ?",
    te: "⚠️ ఇది {date} న ఇప్పటికే జోడించిన బిల్ లాగా ఉంది ({amt}{vendor}). {why}\\nఅయినా జోడించాలా?", hi: "⚠️ लगता है यह बिल {date} को जुड़ चुका है ({amt}{vendor})। {why}\\nफिर भी जोड़ें?",
  },
  waAddAnyway: { en: "Add anyway", kn: "ಆದರೂ ಸೇರಿಸಿ", te: "అయినా జోడించండి", hi: "फिर भी जोड़ें" },
  magnify: { en: "Magnify", kn: "ದೊಡ್ಡದಾಗಿ ನೋಡಿ", te: "పెద్దదిగా చూడండి", hi: "बड़ा करें" },
  zoomInHint: { en: "Click or tap the bill to zoom in", kn: "ದೊಡ್ಡದಾಗಿಸಲು ಬಿಲ್ ಮೇಲೆ ಒತ್ತಿ", te: "పెద్దదిగా చూడటానికి బిల్‌పై నొక్కండి", hi: "ज़ूम करने के लिए बिल पर टैप करें" },
  zoomOutHint: { en: "Move to look around · click again to zoom out", kn: "ಸುತ್ತ ನೋಡಲು ಸರಿಸಿ · ಚಿಕ್ಕದಾಗಿಸಲು ಮತ್ತೆ ಒತ್ತಿ", te: "చుట్టూ చూడటానికి కదపండి · చిన్నదిగా చేయడానికి మళ్ళీ నొక్కండి", hi: "घुमाकर देखें · छोटा करने के लिए फिर टैप करें" },
} satisfies Part;
