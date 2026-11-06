import type { Part } from "./types";

export const join = {
  // Public Join page
  joinTitle: { en: "Join this PG", kn: "ಈ ಪಿಜಿಗೆ ಸೇರಿ", te: "ఈ పిజికి చేరండి" },
  joinSub: {
    en: "Fill your details. The manager will check your ID and confirm your bed.",
    kn: "ನಿಮ್ಮ ವಿವರಗಳನ್ನು ತುಂಬಿ. ಮ್ಯಾನೇಜರ್ ನಿಮ್ಮ ಗುರುತಿನ ಚೀಟಿ ನೋಡಿ ಹಾಸಿಗೆ ಖಚಿತಪಡಿಸುತ್ತಾರೆ.",
    te: "మీ వివరాలు నింపండి. మేనేజర్ మీ ID చూసి మీ బెడ్ ఖరారు చేస్తారు.",
  },
  joinConfirm: { en: "I confirm these details are correct", kn: "ಈ ವಿವರಗಳು ಸರಿಯಾಗಿವೆ ಎಂದು ಖಚಿತಪಡಿಸುತ್ತೇನೆ", te: "ఈ వివరాలు సరైనవని ధృవీకరిస్తున్నాను" },
  joinSend: { en: "Send my details", kn: "ನನ್ನ ವಿವರಗಳನ್ನು ಕಳುಹಿಸಿ", te: "నా వివరాలు పంపండి" },
  joinThanks: {
    en: "Thank you! The manager will check your ID and confirm your bed. You will hear from them on WhatsApp.",
    kn: "ಧನ್ಯವಾದಗಳು! ಮ್ಯಾನೇಜರ್ ನಿಮ್ಮ ಗುರುತಿನ ಚೀಟಿ ನೋಡಿ ಹಾಸಿಗೆ ಖಚಿತಪಡಿಸುತ್ತಾರೆ. ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ನಿಮಗೆ ತಿಳಿಸುತ್ತಾರೆ.",
    te: "ధన్యవాదాలు! మేనేజర్ మీ ID చూసి మీ బెడ్ ఖరారు చేస్తారు. వాట్సాప్‌లో మీకు తెలియజేస్తారు.",
  },
  errJoinName: { en: "Please enter your full name.", kn: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ನಮೂದಿಸಿ.", te: "దయచేసి మీ పూర్తి పేరు నమోదు చేయండి." },
  errJoinPhone: { en: "Please enter a valid 10-digit mobile number.", kn: "ದಯವಿಟ್ಟು ಸರಿಯಾದ 10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.", te: "దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి." },
  errJoinEmail: { en: "That email address does not look right.", kn: "ಈ ಇಮೇಲ್ ವಿಳಾಸ ಸರಿಯಿಲ್ಲ.", te: "ఈ ఇమెయిల్ చిరునామా సరిగా లేదు." },
  errJoinId: { en: "Please enter your ID number.", kn: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಗುರುತಿನ ಚೀಟಿ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.", te: "దయచేసి మీ ID నంబర్ నమోదు చేయండి." },
  errJoinConfirm: { en: "Please tick the box to confirm your details.", kn: "ದಯವಿಟ್ಟು ವಿವರಗಳನ್ನು ಖಚಿತಪಡಿಸಲು ಬಾಕ್ಸ್ ಟಿಕ್ ಮಾಡಿ.", te: "దయచేసి వివరాలను ధృవీకరించడానికి బాక్స్ టిక్ చేయండి." },
  errJoinAlready: {
    en: "This number is already staying here. Please speak to the manager.",
    kn: "ಈ ಸಂಖ್ಯೆಯವರು ಈಗಾಗಲೇ ಇಲ್ಲಿ ಇದ್ದಾರೆ. ದಯವಿಟ್ಟು ಮ್ಯಾನೇಜರ್ ಅವರನ್ನು ಕೇಳಿ.",
    te: "ఈ నంబర్ ఉన్నవారు ఇప్పటికే ఇక్కడ ఉన్నారు. దయచేసి మేనేజర్‌ను అడగండి.",
  },
  // QR for the Join page
  joinQrBtn: { en: "Join QR code", kn: "ಸೇರುವ QR ಕೋಡ್", te: "చేరే QR కోడ్" },
  joinQrScan: { en: "Scan to join this PG", kn: "ಈ ಪಿಜಿಗೆ ಸೇರಲು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ", te: "ఈ పిజికి చేరడానికి స్కాన్ చేయండి" },
  joinQrSub: { en: "Fill your details · The manager will confirm", kn: "ನಿಮ್ಮ ವಿವರ ತುಂಬಿ · ಮ್ಯಾನೇಜರ್ ಖಚಿತಪಡಿಸುತ್ತಾರೆ", te: "మీ వివరాలు నింపండి · మేనేజర్ ఖరారు చేస్తారు" },
  joinQrHelp: {
    en: "Stick this where new tenants will see it, for example at the reception. Everyone who fills it appears under New joiners. Nobody is billed until you confirm.",
    kn: "ಹೊಸ ಬಾಡಿಗೆದಾರರಿಗೆ ಕಾಣುವ ಕಡೆ, ಉದಾಹರಣೆಗೆ ರಿಸೆಪ್ಶನ್‌ನಲ್ಲಿ ಅಂಟಿಸಿ. ತುಂಬಿದವರು ಎಲ್ಲರೂ 'ಹೊಸ ಸೇರ್ಪಡೆ' ಅಡಿ ಕಾಣುತ್ತಾರೆ. ನೀವು ಖಚಿತಪಡಿಸುವವರೆಗೆ ಯಾರಿಗೂ ಬಿಲ್ ಆಗುವುದಿಲ್ಲ.",
    te: "కొత్త అద్దెదారులకు కనిపించే చోట, ఉదాహరణకు రిసెప్షన్ వద్ద అంటించండి. నింపినవారందరూ 'కొత్తగా చేరేవారు' కింద కనిపిస్తారు. మీరు ఖరారు చేసే వరకు ఎవరికీ బిల్ కాదు.",
  },
  joinSendWa: { en: "Send Join link on WhatsApp", kn: "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಸೇರುವ ಲಿಂಕ್ ಕಳುಹಿಸಿ", te: "వాట్సాప్‌లో చేరే లింక్ పంపండి" },
  joinWaMsg: {
    en: "Hi! Please fill your joining details for {pg} here: {url}",
    kn: "ನಮಸ್ಕಾರ! {pg} ಗೆ ಸೇರಲು ನಿಮ್ಮ ವಿವರಗಳನ್ನು ಇಲ್ಲಿ ತುಂಬಿ: {url}",
    te: "నమస్కారం! {pg} లో చేరడానికి మీ వివరాలను ఇక్కడ నింపండి: {url}",
  },
  // Manager side
  joiningTitle: { en: "New joiners", kn: "ಹೊಸ ಸೇರ್ಪಡೆ", te: "కొత్తగా చేరేవారు" },
  joiningSub: {
    en: "People who filled the Join form. Check their ID, then add them as a tenant. Nobody is billed until you do.",
    kn: "ಸೇರುವ ಫಾರ್ಮ್ ತುಂಬಿದವರು. ಅವರ ಗುರುತಿನ ಚೀಟಿ ನೋಡಿ, ನಂತರ ಬಾಡಿಗೆದಾರರಾಗಿ ಸೇರಿಸಿ. ನೀವು ಸೇರಿಸುವವರೆಗೆ ಯಾರಿಗೂ ಬಿಲ್ ಆಗುವುದಿಲ್ಲ.",
    te: "చేరే ఫారం నింపినవారు. వారి ID చూసి, తర్వాత అద్దెదారుగా జోడించండి. మీరు జోడించే వరకు ఎవరికీ బిల్ కాదు.",
  },
  joiningBanner: { en: "{n} new joiner(s) waiting. Check and confirm.", kn: "{n} ಹೊಸ ಸೇರ್ಪಡೆ ಕಾಯುತ್ತಿದೆ. ನೋಡಿ ಖಚಿತಪಡಿಸಿ.", te: "{n} కొత్తగా చేరేవారు వేచి ఉన్నారు. చూసి ఖరారు చేయండి." },
  joiningNone: { en: "Nobody is waiting", kn: "ಯಾರೂ ಕಾಯುತ್ತಿಲ್ಲ", te: "ఎవరూ వేచి ఉండలేదు" },
  joiningNoneBody: {
    en: "When someone scans the Join QR code or opens your Join link and fills the form, they appear here.",
    kn: "ಯಾರಾದರೂ ಸೇರುವ QR ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಅಥವಾ ಲಿಂಕ್ ತೆರೆದು ಫಾರ್ಮ್ ತುಂಬಿದರೆ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತಾರೆ.",
    te: "ఎవరైనా చేరే QR కోడ్ స్కాన్ చేసి లేదా లింక్ తెరిచి ఫారం నింపితే ఇక్కడ కనిపిస్తారు.",
  },
  joiningApprove: { en: "Check and add as tenant", kn: "ನೋಡಿ ಬಾಡಿಗೆದಾರರಾಗಿ ಸೇರಿಸಿ", te: "చూసి అద్దెదారుగా జోడించండి" },
  joiningReject: { en: "Not now", kn: "ಈಗ ಬೇಡ", te: "ఇప్పుడు వద్దు" },
  joiningRejectConfirm: { en: "Remove this request? Nothing else changes.", kn: "ಈ ಕೋರಿಕೆಯನ್ನು ತೆಗೆದುಹಾಕಬೇಕೇ? ಬೇರೇನೂ ಬದಲಾಗುವುದಿಲ್ಲ.", te: "ఈ అభ్యర్థనను తొలగించాలా? ఇంకేమీ మారదు." },
  joiningFilledOn: { en: "Filled on {date}", kn: "{date} ರಂದು ತುಂಬಿದ್ದು", te: "{date} న నింపారు" },
  joiningLink: { en: "New joiners", kn: "ಹೊಸ ಸೇರ್ಪಡೆ", te: "కొత్తగా చేరేవారు" },
  joinPrefilled: {
    en: "{name} filled these details. Now choose the bed, rent and move-in date, then add.",
    kn: "{name} ಈ ವಿವರಗಳನ್ನು ತುಂಬಿದ್ದಾರೆ. ಈಗ ಹಾಸಿಗೆ, ಬಾಡಿಗೆ ಮತ್ತು ಸೇರುವ ದಿನಾಂಕ ಆರಿಸಿ, ನಂತರ ಸೇರಿಸಿ.",
    te: "{name} ఈ వివరాలు నింపారు. ఇప్పుడు బెడ్, అద్దె, చేరే తేదీ ఎంచుకుని జోడించండి.",
  },
  // QR enquiry page: availability + what the visitor wants
  availTitle: { en: "Beds available now", kn: "ಈಗ ಲಭ್ಯವಿರುವ ಹಾಸಿಗೆಗಳು", te: "ఇప్పుడు అందుబాటులో ఉన్న బెడ్‌లు" },
  availLine: { en: "{sharing} · from {rent} a month · {n} free", kn: "{sharing} · ತಿಂಗಳಿಗೆ {rent} ರಿಂದ · {n} ಖಾಲಿ", te: "{sharing} · నెలకు {rent} నుండి · {n} ఖాళీ" },
  availNone: { en: "No free beds right now. Leave your number and we will call you.", kn: "ಈಗ ಖಾಲಿ ಹಾಸಿಗೆ ಇಲ್ಲ. ನಿಮ್ಮ ಸಂಖ್ಯೆ ಬಿಡಿ, ನಾವು ಕರೆ ಮಾಡುತ್ತೇವೆ.", te: "ఇప్పుడు ఖాళీ బెడ్‌లు లేవు. మీ నంబర్ ఇవ్వండి, మేము కాల్ చేస్తాము." },
  wantLabel: { en: "What would you like?", kn: "ನಿಮಗೆ ಏನು ಬೇಕು?", te: "మీకు ఏమి కావాలి?" },
  wantCallback: { en: "Call me back", kn: "ನನಗೆ ಕರೆ ಮಾಡಿ", te: "నాకు కాల్ చేయండి" },
  wantInfo: { en: "Just send me information on WhatsApp", kn: "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಮಾಹಿತಿ ಕಳುಹಿಸಿ", te: "వాట్సాప్‌లో సమాచారం పంపండి" },
  wantCallbackBadge: { en: "Wants a call", kn: "ಕರೆ ಬೇಕು", te: "కాల్ కావాలి" },
  wantInfoBadge: { en: "Wants info", kn: "ಮಾಹಿತಿ ಬೇಕು", te: "సమాచారం కావాలి" },
  // Leads
  call: { en: "Call", kn: "ಕರೆ", te: "కాల్" },
  leadMoveIn: { en: "Move in", kn: "ಸೇರಿಸಿ", te: "చేర్చండి" },
  leadSendJoin: { en: "Send Join link", kn: "ಸೇರುವ ಲಿಂಕ್ ಕಳುಹಿಸಿ", te: "చేరే లింక్ పంపండి" },
  houseRulesLabel: { en: "House rules and info for new tenants", kn: "ಹೊಸ ಬಾಡಿಗೆದಾರರಿಗೆ ಮನೆ ನಿಯಮ ಮತ್ತು ಮಾಹಿತಿ", te: "కొత్త అద్దెదారులకు ఇంటి నియమాలు మరియు సమాచారం" },
  houseRulesHint: {
    en: "For example: Wi-Fi password, meal timings, gate closing time. Sent in the welcome message.",
    kn: "ಉದಾ: ವೈ-ಫೈ ಪಾಸ್‌ವರ್ಡ್, ಊಟದ ಸಮಯ, ಗೇಟ್ ಮುಚ್ಚುವ ಸಮಯ. ಸ್ವಾಗತ ಸಂದೇಶದಲ್ಲಿ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.",
    te: "ఉదా: వై-ఫై పాస్‌వర్డ్, భోజన సమయాలు, గేట్ మూసే సమయం. స్వాగత సందేశంలో పంపబడుతుంది.",
  },
  welcomeBtn: { en: "Send welcome on WhatsApp", kn: "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಸ್ವಾಗತ ಕಳುಹಿಸಿ", te: "వాట్సాప్‌లో స్వాగతం పంపండి" },
  welcomeAdded: { en: "{name} is added. Send a welcome message on WhatsApp.", kn: "{name} ಅವರನ್ನು ಸೇರಿಸಲಾಗಿದೆ. ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಸ್ವಾಗತ ಸಂದೇಶ ಕಳುಹಿಸಿ.", te: "{name} జోడించబడ్డారు. వాట్సాప్‌లో స్వాగత సందేశం పంపండి." },
  welHello: {
    en: "Welcome to {pg}, {name}! We are happy to have you.",
    kn: "{pg} ಗೆ ಸ್ವಾಗತ, {name}! ನಿಮ್ಮನ್ನು ಸ್ವಾಗತಿಸಲು ಸಂತೋಷ.",
    te: "{pg} కు స్వాగతం, {name}! మిమ్మల్ని స్వాగతించడం సంతోషంగా ఉంది.",
  },
  welPay: { en: " Your page for rent, receipts and complaints: {url}", kn: " ಬಾಡಿಗೆ, ರಸೀದಿ ಮತ್ತು ದೂರುಗಳಿಗೆ ನಿಮ್ಮ ಪುಟ: {url}", te: " అద్దె, రసీదులు, ఫిర్యాదుల కోసం మీ పేజీ: {url}" },
  welCall: { en: " For any help, call the manager: {phone}.", kn: " ಸಹಾಯಕ್ಕಾಗಿ ಮ್ಯಾನೇಜರ್‌ಗೆ ಕರೆ ಮಾಡಿ: {phone}.", te: " సహాయం కోసం మేనేజర్‌కు కాల్ చేయండి: {phone}." },
  welRules: { en: "\n\nHouse rules:\n{rules}", kn: "\n\nಮನೆ ನಿಯಮಗಳು:\n{rules}", te: "\n\nఇంటి నియమాలు:\n{rules}" },
} satisfies Part;
