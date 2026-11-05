import type { Part } from "./types";

export const auth = {
  heroLine1: { en: "Every bed, every tenant,", kn: "ಪ್ರತಿ ಹಾಸಿಗೆ, ಪ್ರತಿ ಬಾಡಿಗೆದಾರ,", te: "ప్రతి మంచం, ప్రతి అద్దెదారు," },
  heroLine2: { en: "every rupee.", kn: "ಪ್ರತಿ ರೂಪಾಯಿ.", te: "ప్రతి రూపాయి." },
  heroSorted: { en: "Sorted.", kn: "ಲೆಕ್ಕ ಸರಿ.", te: "లెక్క పక్కా." },
  heroBody: {
    en: "Neravu helps PG owners track occupancy, collect rent and chase dues without a single spreadsheet.",
    kn: "ನೆರವು PG ಮಾಲೀಕರಿಗೆ ಹಾಸಿಗೆ, ಬಾಡಿಗೆ ಮತ್ತು ಬಾಕಿಯನ್ನು ಯಾವುದೇ ಸ್ಪ್ರೆಡ್‌ಶೀಟ್ ಇಲ್ಲದೆ ನೋಡಿಕೊಳ್ಳಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.",
    te: "నేరవు PG యజమానులకు మంచాలు, అద్దె, బకాయిలను స్ప్రెడ్‌షీట్ లేకుండా చూసుకోవడానికి సహాయపడుతుంది.",
  },
  heroFoot: { en: "Built for PG and hostel owners in India.", kn: "ಭಾರತದ PG ಮತ್ತು ಹಾಸ್ಟೆಲ್ ಮಾಲೀಕರಿಗಾಗಿ.", te: "భారతదేశంలోని PG మరియు హాస్టల్ యజమానుల కోసం." },
  welcomeBack: { en: "Welcome back", kn: "ಮರಳಿ ಸ್ವಾಗತ", te: "తిరిగి స్వాగతం" },
  loginSub: { en: "Log in to manage your PG.", kn: "ನಿಮ್ಮ PG ನೋಡಿಕೊಳ್ಳಲು ಲಾಗಿನ್ ಮಾಡಿ.", te: "మీ PG ని నిర్వహించడానికి లాగిన్ చేయండి." },
  login: { en: "Log in", kn: "ಲಾಗಿನ್", te: "లాగిన్" },
  newHere: { en: "New to Neravu?", kn: "ನೆರವಿಗೆ ಹೊಸಬರೇ?", te: "నేరవుకి కొత్తా?" },
  createOwner: { en: "Create an owner account", kn: "ಮಾಲೀಕರ ಖಾತೆ ತೆರೆಯಿರಿ", te: "యజమాని ఖాతా సృష్టించండి" },
  createOwnerTitle: { en: "Create your owner account", kn: "ನಿಮ್ಮ ಮಾಲೀಕರ ಖಾತೆ ತೆರೆಯಿರಿ", te: "మీ యజమాని ఖాతా సృష్టించండి" },
  signupSub: { en: "Free while in early access.", kn: "ಆರಂಭಿಕ ಹಂತದಲ್ಲಿ ಉಚಿತ.", te: "ప్రారంభ దశలో ఉచితం." },
  createAccount: { en: "Create account", kn: "ಖಾತೆ ತೆರೆಯಿರಿ", te: "ఖాతా సృష్టించండి" },
  passwordHint: { en: "At least 8 characters.", kn: "ಕನಿಷ್ಠ 8 ಅಕ್ಷರಗಳು.", te: "కనీసం 8 అక్షరాలు." },
  errLogin: { en: "Email or password is incorrect.", kn: "ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ತಪ್ಪಾಗಿದೆ.", te: "ఇమెయిల్ లేదా పాస్‌వర్డ్ తప్పు." },
  errExists: { en: "An account with this email already exists. Try logging in.", kn: "ಈ ಇಮೇಲ್‌ನ ಖಾತೆ ಈಗಾಗಲೇ ಇದೆ. ಲಾಗಿನ್ ಮಾಡಿ.", te: "ఈ ఇమెయిల్‌తో ఖాతా ఇప్పటికే ఉంది. లాగిన్ చేయండి." },
  errName: { en: "Enter your name", kn: "ನಿಮ್ಮ ಹೆಸರು ಬರೆಯಿರಿ", te: "మీ పేరు రాయండి" },
  errEmail: { en: "Enter a valid email", kn: "ಸರಿಯಾದ ಇಮೇಲ್ ಬರೆಯಿರಿ", te: "సరైన ఇమెయిల్ రాయండి" },
  errPassword: { en: "Password must be at least 8 characters", kn: "ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 8 ಅಕ್ಷರ ಇರಬೇಕು", te: "పాస్‌వర్డ్ కనీసం 8 అక్షరాలు ఉండాలి" },
  haveAccount: { en: "Already have an account?", kn: "ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?", te: "ఇప్పటికే ఖాతా ఉందా?" },
} satisfies Part;
