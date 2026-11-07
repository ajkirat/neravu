import type { Part } from "./types";

// Replies from the Neravu WhatsApp number, and the app text around it.
export const wabot = {
  waBillAsk: {
    en: "Is this an expense?\n{amt} · {cat}{vendor}\nDate: {date}",
    kn: "ಇದು ಖರ್ಚೇ?\n{amt} · {cat}{vendor}\nದಿನಾಂಕ: {date}",
    te: "ఇది ఖర్చా?\n{amt} · {cat}{vendor}\nతేదీ: {date}", hi: "क्या यह खर्च है?\n{amt} · {cat}{vendor}\nतारीख: {date}",
  },
  waYes: { en: "Yes", kn: "ಹೌದು", te: "అవును", hi: "हाँ" },
  waNo: { en: "No", kn: "ಇಲ್ಲ", te: "కాదు", hi: "नहीं" },
  waBillAdded: {
    en: "✅ Added {amt} ({cat}), dated {when}.",
    kn: "✅ {amt} ({cat}) ಸೇರಿಸಲಾಗಿದೆ, ದಿನಾಂಕ {when}.",
    te: "✅ {amt} ({cat}) చేర్చాం, తేదీ {when}.", hi: "✅ {amt} ({cat}) जोड़ा, तारीख {when}।",
  },
  waBillCancelled: { en: "OK, not added.", kn: "ಸರಿ, ಸೇರಿಸಲಿಲ್ಲ.", te: "సరే, చేర్చలేదు.", hi: "ठीक है, नहीं जोड़ा।" },
  waBillAlready: { en: "This bill was already answered.", kn: "ಈ ಬಿಲ್‌ಗೆ ಈಗಾಗಲೇ ಉತ್ತರಿಸಲಾಗಿದೆ.", te: "ఈ బిల్‌కు ఇప్పటికే సమాధానం ఇచ్చారు.", hi: "इस बिल का जवाब पहले ही दे दिया।" },
  waBillNotBill: {
    en: "No bill in this photo. Send a clear photo of the whole bill.",
    kn: "ಈ ಫೋಟೋದಲ್ಲಿ ಬಿಲ್ ಇಲ್ಲ. ಇಡೀ ಬಿಲ್‌ನ ಸ್ಪಷ್ಟ ಫೋಟೋ ಕಳುಹಿಸಿ.",
    te: "ఈ ఫోటోలో బిల్లు లేదు. మొత్తం బిల్లు స్పష్టమైన ఫోటో పంపండి.", hi: "इस फ़ोटो में बिल नहीं है। पूरे बिल की साफ फ़ोटो भेजें।",
  },
  waBillFailed: {
    en: "Could not read this bill. Send it again in a few minutes.",
    kn: "ಈ ಬಿಲ್ ಓದಲು ಆಗಲಿಲ್ಲ. ಕೆಲವು ನಿಮಿಷದ ನಂತರ ಮತ್ತೆ ಕಳುಹಿಸಿ.",
    te: "ఈ బిల్లు చదవలేకపోయాం. కొన్ని నిమిషాల తర్వాత మళ్లీ పంపండి.", hi: "यह बिल नहीं पढ़ पाए। कुछ मिनट बाद फिर भेजें।",
  },
  waBillOff: {
    en: "Bill reading is not ready. Add it in the Neravu app.",
    kn: "ಬಿಲ್ ಓದುವಿಕೆ ಸಿದ್ಧವಿಲ್ಲ. ನೆರವು ಆ್ಯಪ್‌ನಲ್ಲಿ ಸೇರಿಸಿ.",
    te: "బిల్లు చదవడం సిద్ధంగా లేదు. నెరవు యాప్‌లో చేర్చండి.", hi: "बिल पढ़ना तैयार नहीं है। नेरवु ऐप में जोड़ें।",
  },
  waBillPhotoOnly: {
    en: "Send the bill as a photo, not a PDF.",
    kn: "ಬಿಲ್ ಅನ್ನು ಫೋಟೋ ಆಗಿ ಕಳುಹಿಸಿ, PDF ಅಲ್ಲ.",
    te: "బిల్లును ఫోటోగా పంపండి, PDF కాదు.", hi: "बिल फ़ोटो की तरह भेजें, PDF नहीं।",
  },
  waBillLimit: {
    en: "Too many bills today. Please add the rest in the Neravu app.",
    kn: "ಇಂದು ತುಂಬಾ ಬಿಲ್‌ಗಳು ಬಂದಿವೆ. ಉಳಿದವನ್ನು ನೆರವು ಆ್ಯಪ್‌ನಲ್ಲಿ ಸೇರಿಸಿ.",
    te: "ఈరోజు చాలా బిల్లులు వచ్చాయి. మిగిలినవి నెరవు యాప్‌లో జోడించండి.", hi: "आज बहुत बिल हो गए। बाकी नेरवु ऐप में जोड़ें।",
  },
  waBillNoPending: {
    en: "No bill waiting. Send a bill photo to add it.",
    kn: "ಯಾವ ಬಿಲ್ ಕಾಯುತ್ತಿಲ್ಲ. ಸೇರಿಸಲು ಬಿಲ್ ಫೋಟೋ ಕಳುಹಿಸಿ.",
    te: "ఏ బిల్లూ వేచి లేదు. చేర్చడానికి బిల్లు ఫోటో పంపండి.", hi: "कोई बिल इंतज़ार में नहीं। जोड़ने के लिए बिल की फ़ोटो भेजें।",
  },
  waBillHelp: {
    en: "Hi {name}! Send a bill photo here to add it to {pg}'s expenses.",
    kn: "ನಮಸ್ಕಾರ {name}! {pg} ಖರ್ಚಿಗೆ ಸೇರಿಸಲು ಇಲ್ಲಿ ಬಿಲ್ ಫೋಟೋ ಕಳುಹಿಸಿ.",
    te: "నమస్కారం {name}! {pg} ఖర్చుల్లో చేర్చడానికి ఇక్కడ బిల్లు ఫోటో పంపండి.", hi: "नमस्ते {name}! {pg} के खर्च में जोड़ने के लिए यहाँ बिल की फ़ोटो भेजें।",
  },
  waUnknown: {
    en: "This number is not added to any PG. Ask your owner to add you as a caretaker.",
    kn: "ಈ ಸಂಖ್ಯೆ ಯಾವ PG ಗೂ ಸೇರಿಲ್ಲ. ನಿಮ್ಮನ್ನು ಕೇರ್‌ಟೇಕರ್ ಆಗಿ ಸೇರಿಸಲು ಮಾಲೀಕರಿಗೆ ಹೇಳಿ.",
    te: "ఈ నంబర్ ఏ PG లోనూ లేదు. మిమ్మల్ని కేర్‌టేకర్‌గా చేర్చమని యజమానికి చెప్పండి.", hi: "यह नंबर किसी PG में नहीं जुड़ा। मालिक से कहें कि आपको केयरटेकर के रूप में जोड़ें।",
  },
  waAmbiguous: {
    en: "This number is in more than one PG. Add the bill in the Neravu app.",
    kn: "ಈ ಸಂಖ್ಯೆ ಒಂದಕ್ಕಿಂತ ಹೆಚ್ಚು PG ಯಲ್ಲಿದೆ. ಬಿಲ್ ಅನ್ನು ನೆರವು ಆ್ಯಪ್‌ನಲ್ಲಿ ಸೇರಿಸಿ.",
    te: "ఈ నంబర్ ఒకటి కంటే ఎక్కువ PG లలో ఉంది. బిల్లును నెరవు యాప్‌లో చేర్చండి.", hi: "यह नंबर एक से ज़्यादा PG में है। बिल नेरवु ऐप में जोड़ें।",
  },
  // In the app
  waBillsHint: {
    en: "Caretakers can WhatsApp bill photos to {num}. Bills are added after they reply Yes.",
    kn: "ಕೇರ್‌ಟೇಕರ್ {num} ಗೆ ಬಿಲ್ ಫೋಟೋ ವಾಟ್ಸಾಪ್ ಮಾಡಬಹುದು. 'ಹೌದು' ಎಂದ ನಂತರ ಬಿಲ್ ಸೇರುತ್ತದೆ.",
    te: "కేర్‌టేకర్లు {num} కి బిల్లు ఫోటోలు వాట్సాప్ చేయవచ్చు. 'అవును' అన్న తర్వాత బిల్లు చేరుతుంది.", hi: "केयरटेकर {num} पर बिल की फ़ोटो WhatsApp कर सकते हैं। 'हाँ' के जवाब के बाद बिल जुड़ता है।",
  },
  waBadge: { en: "WhatsApp", kn: "ವಾಟ್ಸಾಪ್", te: "వాట్సాప్", hi: "WhatsApp" },
  viewBill: { en: "View bill", kn: "ಬಿಲ್ ನೋಡಿ", te: "బిల్ చూడండి", hi: "बिल देखें" },
  sentBy: { en: "Sent by {name}", kn: "{name} ಕಳುಹಿಸಿದ್ದು", te: "{name} పంపారు", hi: "{name} ने भेजा" },
  rcptStillDue: { en: "{amt} is still pending", kn: "{amt} ಇನ್ನೂ ಬಾಕಿ ಇದೆ", te: "{amt} ఇంకా బకాయి ఉంది", hi: "{amt} अभी बाकी है" },
  rcptAllClear: { en: "Nothing is pending now", kn: "ಈಗ ಯಾವುದೇ ಬಾಕಿ ಇಲ್ಲ", te: "ఇప్పుడు ఏ బకాయి లేదు", hi: "अब कुछ बाकी नहीं" },
  rcptSendWa: { en: "Send receipt", kn: "ರಸೀದಿ ಕಳುಹಿಸಿ", te: "రసీదు పంపండి", hi: "रसीद भेजें" },
  rcptWaText: {
    en: "Receipt from {pg}: received {amt} from {name} on {when}. {balance}. Thank you!",
    kn: "{pg} ರಸೀದಿ: {name} ಅವರಿಂದ {when} ರಂದು {amt} ಸ್ವೀಕರಿಸಲಾಗಿದೆ. {balance}. ಧನ್ಯವಾದಗಳು!",
    te: "{pg} రసీదు: {name} నుండి {when} న {amt} అందింది. {balance}. ధన్యవాదాలు!", hi: "{pg} की रसीद: {name} से {when} को {amt} मिले। {balance}। धन्यवाद!",
  },
  receiptSentOk: { en: "Receipt sent on WhatsApp.", kn: "ರಸೀದಿ ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಕಳುಹಿಸಲಾಗಿದೆ.", te: "రసీదు వాట్సాప్‌లో పంపబడింది.", hi: "रसीद WhatsApp पर भेजी।" },
  receiptResendFail: { en: "Still not sent: {why}", kn: "ಇನ್ನೂ ಕಳುಹಿಸಿಲ್ಲ: {why}", te: "ఇంకా పంపలేదు: {why}", hi: "अभी भी नहीं गई: {why}" },
  receiptResendOff: { en: "WhatsApp receipts are off or not ready.", kn: "ವಾಟ್ಸಾಪ್ ರಸೀದಿ ಆಫ್ ಆಗಿದೆ ಅಥವಾ ಸಿದ್ಧವಿಲ್ಲ.", te: "వాట్సాప్ రసీదులు ఆఫ్‌లో ఉన్నాయి లేదా సిద్ధంగా లేవు.", hi: "WhatsApp रसीद बंद है या तैयार नहीं।" },
  receiptStatusSent: { en: "✓ Receipt sent on WhatsApp", kn: "✓ ರಸೀದಿ ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಕಳುಹಿಸಲಾಗಿದೆ", te: "✓ రసీదు వాట్సాప్‌లో పంపబడింది", hi: "✓ रसीद WhatsApp पर गई" },
  receiptStatusFailed: { en: "✗ Receipt not sent on WhatsApp", kn: "✗ ರಸೀದಿ ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಹೋಗಿಲ್ಲ", te: "✗ రసీదు వాట్సాప్‌లో వెళ్లలేదు", hi: "✗ रसीद WhatsApp पर नहीं गई" },
  receiptBadgeSent: { en: "Receipt sent", kn: "ರಸೀದಿ ಹೋಗಿದೆ", te: "రసీదు వెళ్లింది", hi: "रसीद गई" },
  receiptBadgeFailed: { en: "Receipt not sent", kn: "ರಸೀದಿ ಹೋಗಿಲ್ಲ", te: "రసీదు వెళ్లలేదు", hi: "रसीद नहीं गई" },
  receiptTryAgain: { en: "Try again", kn: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ", te: "మళ్లీ ప్రయత్నించండి", hi: "फिर कोशिश करें" },
  receiptByHand: { en: "For now, tap “Send on WhatsApp” above to send it from your phone.", kn: "ಸದ್ಯಕ್ಕೆ, ಮೇಲಿನ “ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಕಳುಹಿಸಿ” ಒತ್ತಿ ನಿಮ್ಮ ಫೋನ್‌ನಿಂದ ಕಳುಹಿಸಿ.", te: "ప్రస్తుతానికి, పైన “వాట్సాప్‌లో పంపండి” నొక్కి మీ ఫోన్ నుండి పంపండి.", hi: "अभी के लिए, ऊपर “WhatsApp पर भेजें” दबाकर अपने फ़ोन से भेजें।" },
  autoReceiptsLabel: {
    en: "Send the tenant a WhatsApp receipt after every payment (cash too)",
    kn: "ಪ್ರತಿ ಪಾವತಿಯ ನಂತರ ಬಾಡಿಗೆದಾರರಿಗೆ ವಾಟ್ಸಾಪ್ ರಸೀದಿ ಕಳುಹಿಸಿ (ನಗದು ಸಹ)",
    te: "ప్రతి చెల్లింపు తర్వాత అద్దెదారుకు వాట్సాప్ రసీదు పంపండి (నగదు కూడా)", hi: "हर भुगतान के बाद किरायेदार को WhatsApp रसीद भेजें (नकद भी)",
  },
  cashTitle: { en: "Cash with caretakers", kn: "ಕೇರ್‌ಟೇಕರ್‌ಗಳ ಬಳಿ ಇರುವ ನಗದು", te: "కేర్‌టేకర్ల దగ్గర ఉన్న నగదు", hi: "केयरटेकर के पास नकद" },
  cashWith: { en: "{name} has {amt} cash ({n} payments)", kn: "{name} ಬಳಿ {amt} ನಗದು ಇದೆ ({n} ಪಾವತಿಗಳು)", te: "{name} దగ్గర {amt} నగదు ఉంది ({n} చెల్లింపులు)", hi: "{name} के पास {amt} नकद ({n} भुगतान)" },
  cashReceivedBtn: { en: "I received {amt}", kn: "ನಾನು {amt} ಪಡೆದಿದ್ದೇನೆ", te: "నేను {amt} తీసుకున్నాను", hi: "मुझे {amt} मिले" },
  cashReceivedConfirm: { en: "Did you receive {amt} cash from {name}?", kn: "{name} ಅವರಿಂದ {amt} ನಗದು ಪಡೆದಿರಾ?", te: "{name} నుండి {amt} నగదు తీసుకున్నారా?", hi: "क्या आपको {name} से {amt} नकद मिले?" },
  cashNone: { en: "No cash is waiting with caretakers.", kn: "ಕೇರ್‌ಟೇಕರ್‌ಗಳ ಬಳಿ ಯಾವುದೇ ನಗದು ಬಾಕಿ ಇಲ್ಲ.", te: "కేర్‌టేకర్ల దగ్గర ఏ నగదు బాకీ లేదు.", hi: "केयरटेकर के पास कोई नकद नहीं।" },
  cashBanner: { en: "{amt} cash is with your caretakers. Tap to check.", kn: "{amt} ನಗದು ನಿಮ್ಮ ಕೇರ್‌ಟೇಕರ್‌ಗಳ ಬಳಿ ಇದೆ. ನೋಡಲು ಒತ್ತಿ.", te: "{amt} నగదు మీ కేర్‌టేకర్ల దగ్గర ఉంది. చూడటానికి నొక్కండి.", hi: "आपके केयरटेकर के पास {amt} नकद है। देखने के लिए टैप करें।" },
  cashMine: { en: "You have collected {amt} in cash. Please give it to the owner.", kn: "ನೀವು {amt} ನಗದು ಸಂಗ್ರಹಿಸಿದ್ದೀರಿ. ದಯವಿಟ್ಟು ಮಾಲೀಕರಿಗೆ ಕೊಡಿ.", te: "మీరు {amt} నగదు వసూలు చేశారు. దయచేసి యజమానికి ఇవ్వండి.", hi: "आपने {amt} नकद लिए हैं। कृपया मालिक को दें।" },
} satisfies Part;
