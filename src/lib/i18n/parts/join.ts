import type { Part } from "./types";

export const join = {
  // Public Join page
  joinTitle: { en: "Join this PG", kn: "ಈ ಪಿಜಿಗೆ ಸೇರಿ", te: "ఈ పిజికి చేరండి", hi: "इस PG में जुड़ें" },
  joinSub: {
    en: "Fill your details. The manager will confirm your bed.",
    kn: "ನಿಮ್ಮ ವಿವರ ತುಂಬಿ. ಮ್ಯಾನೇಜರ್ ನಿಮ್ಮ ಹಾಸಿಗೆ ಖಚಿತಪಡಿಸುತ್ತಾರೆ.",
    te: "మీ వివరాలు నింపండి. మేనేజర్ మీ బెడ్ నిర్ధారిస్తారు.", hi: "अपनी जानकारी भरें। मैनेजर आपका बेड पक्का करेंगे।",
  },
  joinConfirm: { en: "I confirm these details are correct", kn: "ಈ ವಿವರಗಳು ಸರಿಯಾಗಿವೆ ಎಂದು ಖಚಿತಪಡಿಸುತ್ತೇನೆ", te: "ఈ వివరాలు సరైనవని ధృవీకరిస్తున్నాను", hi: "मैं पुष्टि करता/करती हूँ कि जानकारी सही है" },
  joinSend: { en: "Send my details", kn: "ನನ್ನ ವಿವರಗಳನ್ನು ಕಳುಹಿಸಿ", te: "నా వివరాలు పంపండి", hi: "मेरी जानकारी भेजें" },
  joinThanks: {
    en: "Thank you! The manager will confirm your bed on WhatsApp.",
    kn: "ಧನ್ಯವಾದ! ಮ್ಯಾನೇಜರ್ ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಹಾಸಿಗೆ ಖಚಿತಪಡಿಸುತ್ತಾರೆ.",
    te: "ధన్యవాదాలు! మేనేజర్ వాట్సాప్‌లో మీ బెడ్ నిర్ధారిస్తారు.", hi: "धन्यवाद! मैनेजर WhatsApp पर आपका बेड पक्का करेंगे।",
  },
  errJoinName: { en: "Please enter your full name.", kn: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ನಮೂದಿಸಿ.", te: "దయచేసి మీ పూర్తి పేరు నమోదు చేయండి.", hi: "कृपया पूरा नाम लिखें।" },
  errJoinPhone: { en: "Please enter a valid 10-digit mobile number.", kn: "ದಯವಿಟ್ಟು ಸರಿಯಾದ 10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.", te: "దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి.", hi: "कृपया सही 10 अंकों का मोबाइल नंबर लिखें।" },
  errJoinEmail: { en: "That email address does not look right.", kn: "ಈ ಇಮೇಲ್ ವಿಳಾಸ ಸರಿಯಿಲ್ಲ.", te: "ఈ ఇమెయిల్ చిరునామా సరిగా లేదు.", hi: "यह ईमेल सही नहीं लगता।" },
  errJoinId: { en: "Please enter your ID number.", kn: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಗುರುತಿನ ಚೀಟಿ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.", te: "దయచేసి మీ ID నంబర్ నమోదు చేయండి.", hi: "कृपया अपना ID नंबर लिखें।" },
  errJoinConfirm: { en: "Please tick the box to confirm your details.", kn: "ದಯವಿಟ್ಟು ವಿವರಗಳನ್ನು ಖಚಿತಪಡಿಸಲು ಬಾಕ್ಸ್ ಟಿಕ್ ಮಾಡಿ.", te: "దయచేసి వివరాలను ధృవీకరించడానికి బాక్స్ టిక్ చేయండి.", hi: "कृपया जानकारी पक्की करने वाला बॉक्स टिक करें।" },
  errJoinAlready: {
    en: "This number already stays here. Please talk to the manager.",
    kn: "ಈ ಸಂಖ್ಯೆ ಈಗಾಗಲೇ ಇಲ್ಲಿ ಇದೆ. ದಯವಿಟ್ಟು ಮ್ಯಾನೇಜರ್ ಜೊತೆ ಮಾತನಾಡಿ.",
    te: "ఈ నంబర్ ఇప్పటికే ఇక్కడ ఉంది. దయచేసి మేనేజర్‌తో మాట్లాడండి.", hi: "यह नंबर पहले से यहाँ रहता है। कृपया मैनेजर से बात करें।",
  },
  // QR for the Join page
  joinQrBtn: { en: "Join QR code", kn: "ಸೇರುವ QR ಕೋಡ್", te: "చేరే QR కోడ్", hi: "जुड़ने का QR कोड" },
  joinQrScan: { en: "Scan to join this PG", kn: "ಈ ಪಿಜಿಗೆ ಸೇರಲು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ", te: "ఈ పిజికి చేరడానికి స్కాన్ చేయండి", hi: "इस PG में जुड़ने के लिए स्कैन करें" },
  joinQrSub: { en: "Fill your details · The manager will confirm", kn: "ನಿಮ್ಮ ವಿವರ ತುಂಬಿ · ಮ್ಯಾನೇಜರ್ ಖಚಿತಪಡಿಸುತ್ತಾರೆ", te: "మీ వివరాలు నింపండి · మేనేజర్ ఖరారు చేస్తారు", hi: "अपनी जानकारी भरें · मैनेजर पक्का करेंगे" },
  joinQrHelp: {
    en: "Stick this at the reception. People who fill it show under New joiners. No rent until you approve.",
    kn: "ಇದನ್ನು ರಿಸೆಪ್ಷನ್‌ನಲ್ಲಿ ಅಂಟಿಸಿ. ತುಂಬಿದವರು 'ಹೊಸ ಸೇರುವವರು' ಅಲ್ಲಿ ಕಾಣುತ್ತಾರೆ. ನೀವು ಒಪ್ಪುವವರೆಗೆ ಬಾಡಿಗೆ ಇಲ್ಲ.",
    te: "దీన్ని రిసెప్షన్‌లో అతికించండి. నింపినవారు 'కొత్తగా చేరేవారు'లో కనిపిస్తారు. మీరు ఒప్పుకునే వరకు అద్దె లేదు.", hi: "इसे रिसेप्शन पर चिपकाएं। भरने वाले 'नए आने वाले' में दिखेंगे। आपकी मंज़ूरी तक किराया नहीं।",
  },
  joinSendWa: { en: "Send Join link on WhatsApp", kn: "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಸೇರುವ ಲಿಂಕ್ ಕಳುಹಿಸಿ", te: "వాట్సాప్‌లో చేరే లింక్ పంపండి", hi: "जुड़ने का लिंक WhatsApp पर भेजें" },
  joinWaMsg: {
    en: "Hi! Please fill your joining details for {pg} here: {url}",
    kn: "ನಮಸ್ಕಾರ! {pg} ಗೆ ಸೇರಲು ನಿಮ್ಮ ವಿವರಗಳನ್ನು ಇಲ್ಲಿ ತುಂಬಿ: {url}",
    te: "నమస్కారం! {pg} లో చేరడానికి మీ వివరాలను ఇక్కడ నింపండి: {url}", hi: "नमस्ते! {pg} में जुड़ने की जानकारी यहाँ भरें: {url}",
  },
  // Manager side
  joiningTitle: { en: "New joiners", kn: "ಹೊಸ ಸೇರ್ಪಡೆ", te: "కొత్తగా చేరేవారు", hi: "नए आने वाले" },
  joiningSub: {
    en: "People who filled the Join form. Check their ID, then add them. No rent until you do.",
    kn: "ಸೇರುವ ಫಾರ್ಮ್ ತುಂಬಿದವರು. ಐಡಿ ನೋಡಿ, ನಂತರ ಸೇರಿಸಿ. ಅಲ್ಲಿಯವರೆಗೆ ಬಾಡಿಗೆ ಇಲ್ಲ.",
    te: "చేరే ఫారం నింపినవారు. ఐడి చూసి, చేర్చండి. అప్పటివరకు అద్దె లేదు.", hi: "जिन्होंने जुड़ने का फ़ॉर्म भरा। ID जांचें, फिर जोड़ें। तब तक किराया नहीं।",
  },
  joiningBanner: { en: "{n} new joiner(s) waiting. Check and confirm.", kn: "{n} ಹೊಸ ಸೇರ್ಪಡೆ ಕಾಯುತ್ತಿದೆ. ನೋಡಿ ಖಚಿತಪಡಿಸಿ.", te: "{n} కొత్తగా చేరేవారు వేచి ఉన్నారు. చూసి ఖరారు చేయండి.", hi: "{n} नए लोग इंतज़ार में। जांचें और पक्का करें।" },
  joiningNone: { en: "Nobody is waiting", kn: "ಯಾರೂ ಕಾಯುತ್ತಿಲ್ಲ", te: "ఎవరూ వేచి ఉండలేదు", hi: "कोई इंतज़ार में नहीं" },
  joiningNoneBody: {
    en: "People who fill your Join form show up here.",
    kn: "ಸೇರುವ ಫಾರ್ಮ್ ತುಂಬಿದವರು ಇಲ್ಲಿ ಕಾಣುತ್ತಾರೆ.",
    te: "చేరే ఫారం నింపినవారు ఇక్కడ కనిపిస్తారు.", hi: "जुड़ने का फ़ॉर्म भरने वाले यहाँ दिखेंगे।",
  },
  joiningApprove: { en: "Check and add as tenant", kn: "ನೋಡಿ ಬಾಡಿಗೆದಾರರಾಗಿ ಸೇರಿಸಿ", te: "చూసి అద్దెదారుగా జోడించండి", hi: "जांचें और किरायेदार जोड़ें" },
  joiningReject: { en: "Not now", kn: "ಈಗ ಬೇಡ", te: "ఇప్పుడు వద్దు", hi: "अभी नहीं" },
  joiningRejectConfirm: { en: "Remove this request? Nothing else changes.", kn: "ಈ ಕೋರಿಕೆಯನ್ನು ತೆಗೆದುಹಾಕಬೇಕೇ? ಬೇರೇನೂ ಬದಲಾಗುವುದಿಲ್ಲ.", te: "ఈ అభ్యర్థనను తొలగించాలా? ఇంకేమీ మారదు.", hi: "यह अनुरोध हटाएं? और कुछ नहीं बदलेगा।" },
  joiningFilledOn: { en: "Filled on {date}", kn: "{date} ರಂದು ತುಂಬಿದ್ದು", te: "{date} న నింపారు", hi: "{date} को भरा" },
  joiningLink: { en: "New joiners", kn: "ಹೊಸ ಸೇರ್ಪಡೆ", te: "కొత్తగా చేరేవారు", hi: "नए आने वाले" },
  joinPrefilled: {
    en: "{name} filled this. Choose the bed, rent and move-in date, then add.",
    kn: "{name} ಇದನ್ನು ತುಂಬಿದ್ದಾರೆ. ಹಾಸಿಗೆ, ಬಾಡಿಗೆ, ಬರುವ ದಿನಾಂಕ ಆರಿಸಿ, ನಂತರ ಸೇರಿಸಿ.",
    te: "{name} ఇది నింపారు. బెడ్, అద్దె, చేరే తేదీ ఎంచుకుని, చేర్చండి.", hi: "{name} ने यह भरा। बेड, किराया और आने की तारीख चुनें, फिर जोड़ें।",
  },
  // QR enquiry page: availability + what the visitor wants
  availTitle: { en: "Beds available now", kn: "ಈಗ ಲಭ್ಯವಿರುವ ಹಾಸಿಗೆಗಳು", te: "ఇప్పుడు అందుబాటులో ఉన్న బెడ్‌లు", hi: "अभी खाली बेड" },
  availLine: { en: "{sharing} · from {rent} a month · {n} free", kn: "{sharing} · ತಿಂಗಳಿಗೆ {rent} ರಿಂದ · {n} ಖಾಲಿ", te: "{sharing} · నెలకు {rent} నుండి · {n} ఖాళీ", hi: "{sharing} · {rent} महीने से · {n} खाली" },
  availNone: { en: "No free beds now. Leave your number and we will call you.", kn: "ಈಗ ಖಾಲಿ ಹಾಸಿಗೆ ಇಲ್ಲ. ನಿಮ್ಮ ಸಂಖ್ಯೆ ಕೊಡಿ, ನಾವು ಕರೆ ಮಾಡುತ್ತೇವೆ.", te: "ఇప్పుడు ఖాళీ బెడ్ లేదు. మీ నంబర్ ఇవ్వండి, మేము కాల్ చేస్తాం.", hi: "अभी कोई बेड खाली नहीं। अपना नंबर छोड़ें, हम फ़ोन करेंगे।" },
  wantLabel: { en: "What would you like?", kn: "ನಿಮಗೆ ಏನು ಬೇಕು?", te: "మీకు ఏమి కావాలి?", hi: "आप क्या चाहते हैं?" },
  wantCallback: { en: "Call me back", kn: "ನನಗೆ ಕರೆ ಮಾಡಿ", te: "నాకు కాల్ చేయండి", hi: "मुझे फ़ोन करें" },
  wantInfo: { en: "Just send me information on WhatsApp", kn: "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಮಾಹಿತಿ ಕಳುಹಿಸಿ", te: "వాట్సాప్‌లో సమాచారం పంపండి", hi: "बस WhatsApp पर जानकारी भेजें" },
  wantCallbackBadge: { en: "Wants a call", kn: "ಕರೆ ಬೇಕು", te: "కాల్ కావాలి", hi: "फ़ोन चाहिए" },
  wantInfoBadge: { en: "Wants info", kn: "ಮಾಹಿತಿ ಬೇಕು", te: "సమాచారం కావాలి", hi: "जानकारी चाहिए" },
  // Leads
  call: { en: "Call", kn: "ಕರೆ", te: "కాల్", hi: "फ़ोन करें" },
  leadMoveIn: { en: "Move in", kn: "ಸೇರಿಸಿ", te: "చేర్చండి", hi: "रहने आए" },
  leadSendJoin: { en: "Send Join link", kn: "ಸೇರುವ ಲಿಂಕ್ ಕಳುಹಿಸಿ", te: "చేరే లింక్ పంపండి", hi: "जुड़ने का लिंक भेजें" },
  houseRulesLabel: { en: "House rules and info for new tenants", kn: "ಹೊಸ ಬಾಡಿಗೆದಾರರಿಗೆ ಮನೆ ನಿಯಮ ಮತ್ತು ಮಾಹಿತಿ", te: "కొత్త అద్దెదారులకు ఇంటి నియమాలు మరియు సమాచారం", hi: "नए किरायेदारों के लिए घर के नियम और जानकारी" },
  houseRulesHint: {
    en: "Wi-Fi password, meal times, gate closing time. Goes in the welcome message.",
    kn: "ವೈ-ಫೈ ಪಾಸ್‌ವರ್ಡ್, ಊಟದ ಸಮಯ, ಗೇಟ್ ಮುಚ್ಚುವ ಸಮಯ. ಸ್ವಾಗತ ಸಂದೇಶದಲ್ಲಿ ಹೋಗುತ್ತದೆ.",
    te: "వై-ఫై పాస్‌వర్డ్, భోజన సమయం, గేట్ మూసే సమయం. స్వాగత సందేశంలో వెళ్తుంది.", hi: "वाई-फाई पासवर्ड, खाने का समय, गेट बंद होने का समय। स्वागत मैसेज में जाता है।",
  },
  welcomeBtn: { en: "Send welcome on WhatsApp", kn: "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಸ್ವಾಗತ ಕಳುಹಿಸಿ", te: "వాట్సాప్‌లో స్వాగతం పంపండి", hi: "WhatsApp पर स्वागत भेजें" },
  welcomeAdded: { en: "{name} is added. Send a welcome message on WhatsApp.", kn: "{name} ಅವರನ್ನು ಸೇರಿಸಲಾಗಿದೆ. ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಸ್ವಾಗತ ಸಂದೇಶ ಕಳುಹಿಸಿ.", te: "{name} జోడించబడ్డారు. వాట్సాప్‌లో స్వాగత సందేశం పంపండి.", hi: "{name} जुड़ गए। WhatsApp पर स्वागत मैसेज भेजें।" },
  welHello: {
    en: "Welcome to {pg}, {name}! We are happy to have you.",
    kn: "{pg} ಗೆ ಸ್ವಾಗತ, {name}! ನಿಮ್ಮನ್ನು ಸ್ವಾಗತಿಸಲು ಸಂತೋಷ.",
    te: "{pg} కు స్వాగతం, {name}! మిమ్మల్ని స్వాగతించడం సంతోషంగా ఉంది.", hi: "{pg} में स्वागत है, {name}! आपके आने से हमें खुशी है।",
  },
  welPay: { en: " Your page for rent, receipts and complaints: {url}", kn: " ಬಾಡಿಗೆ, ರಸೀದಿ ಮತ್ತು ದೂರುಗಳಿಗೆ ನಿಮ್ಮ ಪುಟ: {url}", te: " అద్దె, రసీదులు, ఫిర్యాదుల కోసం మీ పేజీ: {url}", hi: " किराया, रसीद और शिकायत के लिए आपका पेज: {url}" },
  welCall: { en: " For any help, call the manager: {phone}.", kn: " ಸಹಾಯಕ್ಕಾಗಿ ಮ್ಯಾನೇಜರ್‌ಗೆ ಕರೆ ಮಾಡಿ: {phone}.", te: " సహాయం కోసం మేనేజర్‌కు కాల్ చేయండి: {phone}.", hi: " किसी भी मदद के लिए मैनेजर को फ़ोन करें: {phone}।" },
  welRules: { en: "\n\nHouse rules:\n{rules}", kn: "\n\nಮನೆ ನಿಯಮಗಳು:\n{rules}", te: "\n\nఇంటి నియమాలు:\n{rules}", hi: "\n\nघर के नियम:\n{rules}" },
} satisfies Part;
