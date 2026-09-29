export const PRACTICE_TEXTS = {
  words: [
    "the quick brown fox jumps over the lazy dog and runs away into the forest",
    "programming is the art of telling another human what one wants the computer to do",
    "success is not final failure is not fatal it is the courage to continue that counts",
  ],
  sentences: [
    "The best way to predict the future is to create it. Every expert was once a beginner.",
    "Simplicity is the ultimate sophistication. Good design is obvious. Great design is transparent.",
    "Code is like humor. When you have to explain it, it is bad. Write clean self-documenting code.",
  ],
  paragraphs: [
    "In the beginning was the command line. Before the graphical user interface was democratized, people typed their instructions directly into machines. There was no mouse, no icons, no windows. Just text. The command line remains the most direct path to computational power, and those who master it gain a superpower.",
    "Touch typing is one of the most valuable skills a knowledge worker can develop. The ability to type without looking at your keyboard frees your mind to focus on what you're actually creating. Professional typists routinely exceed 80 words per minute, while the average person types around 40. The gap represents hours of productivity every single day.",
  ],
  code: [
    `function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst result = fibonacci(10);\nconsole.log(result);`,
    `const fetchUser = async (id) => {\n  const response = await fetch(\`/api/users/\${id}\`);\n  if (!response.ok) throw new Error('Failed');\n  return response.json();\n};`,
  ],
};

export const LESSONS = [
  { id: 1, title: "Home Row Keys", description: "Master the foundation: ASDF JKL;", level: "BEGINNER", category: "Home Row", duration: 5, order: 1, content: "asdf jkl; asdf jkl; fjfj dkdk slsl a;a; fdjsla; fjdksl" },
  { id: 2, title: "Top Row Keys", description: "Reach up to QWERTY UIOP", level: "BEGINNER", category: "Top Row", duration: 7, order: 2, content: "qwer tyui op qwerty uiop power quiet write type upper" },
  { id: 3, title: "Bottom Row Keys", description: "Navigate ZXCV BNM", level: "BEGINNER", category: "Bottom Row", duration: 7, order: 3, content: "zxcv bnm zxcvbnm box can vim next mix zen vex" },
  { id: 4, title: "Numbers Row", description: "Type digits with confidence", level: "BEGINNER", category: "Numbers", duration: 8, order: 4, content: "1234 5678 90 1029 3847 5621 7483 9201 3456 7890" },
  { id: 5, title: "Common Words", description: "The 200 most frequent English words", level: "INTERMEDIATE", category: "Common Words", duration: 10, order: 5, content: "the and for are but not you all can her was one our out day get has him his how man new now old see two way who" },
  { id: 6, title: "Sentences", description: "Build flow with complete thoughts", level: "INTERMEDIATE", category: "Sentences", duration: 12, order: 6, content: "She sells sea shells by the sea shore. The big red dog ran fast past the old barn house." },
  { id: 7, title: "Speed Practice", description: "Push past your limits", level: "INTERMEDIATE", category: "Speed", duration: 10, order: 7, content: "fast fire free fresh friend from front frost frown frozen" },
  { id: 8, title: "Long Paragraphs", description: "Endurance training for serious typists", level: "ADVANCED", category: "Paragraphs", duration: 15, order: 8, content: PRACTICE_TEXTS.paragraphs[0] },
  { id: 9, title: "Programming", description: "Code syntax and special characters", level: "ADVANCED", category: "Programming", duration: 15, order: 9, content: "const x = () => { return null; }; function foo(bar) { if (bar > 0) return true; }" },
];

export const ACHIEVEMENTS = [
  { id: 1, key: "FIRST_30_WPM", title: "Speed Demon", description: "Reach 30 WPM for the first time", icon: "⚡", earned: true, earnedAt: "2024-01-15", rarity: "common" },
  { id: 2, key: "FIRST_60_WPM", title: "Professional", description: "Reach 60 WPM", icon: "🎯", earned: true, earnedAt: "2024-02-03", rarity: "uncommon" },
  { id: 3, key: "FIRST_80_WPM", title: "Expert Typist", description: "Reach 80 WPM", icon: "🏆", earned: false, rarity: "rare" },
  { id: 4, key: "FIRST_100_WPM", title: "Century Club", description: "Break the 100 WPM barrier", icon: "💯", earned: false, rarity: "epic" },
  { id: 5, key: "FIRST_1000_WORDS", title: "Word Warrior", description: "Type 1,000 words total", icon: "📝", earned: true, earnedAt: "2024-01-20", rarity: "common" },
  { id: 6, key: "FIRST_10000_WORDS", title: "Wordsmith", description: "Type 10,000 words total", icon: "📚", earned: true, earnedAt: "2024-02-10", rarity: "uncommon" },
  { id: 7, key: "SEVEN_DAY_STREAK", title: "Week Warrior", description: "Practice 7 days in a row", icon: "🔥", earned: true, earnedAt: "2024-01-22", rarity: "uncommon" },
  { id: 8, key: "THIRTY_DAY_STREAK", title: "Iron Fingers", description: "Practice 30 days in a row", icon: "💪", earned: false, rarity: "epic" },
  { id: 9, key: "ACCURACY_MASTER", title: "Precision Master", description: "Achieve 99% accuracy on a test", icon: "🎖️", earned: false, rarity: "rare" },
  { id: 10, key: "PERFECT_TEST", title: "Perfect Score", description: "Complete a test with 100% accuracy", icon: "⭐", earned: false, rarity: "legendary" },
  { id: 11, key: "NIGHT_OWL", title: "Night Owl", description: "Practice after midnight", icon: "🦉", earned: true, earnedAt: "2024-01-19", rarity: "common" },
  { id: 12, key: "EARLY_BIRD", title: "Early Bird", description: "Practice before 6 AM", icon: "🐦", earned: false, rarity: "common" },
];

export const LEADERBOARD = [
  { rank: 1, username: "NinjaTypist", avatar: "NT", wpm: 142, accuracy: 98.2, sessions: 1847, country: "🇯🇵" },
  { rank: 2, username: "KeyboardQueen", avatar: "KQ", wpm: 138, accuracy: 97.8, sessions: 2103, country: "🇺🇸" },
  { rank: 3, username: "SpeedDemon99", avatar: "SD", wpm: 131, accuracy: 96.5, sessions: 956, country: "🇩🇪" },
  { rank: 4, username: "CodeTyper", avatar: "CT", wpm: 124, accuracy: 98.9, sessions: 1234, country: "🇬🇧" },
  { rank: 5, username: "FlashFingers", avatar: "FF", wpm: 119, accuracy: 95.1, sessions: 789, country: "🇨🇦" },
  { rank: 6, username: "TypeMaster_X", avatar: "TM", wpm: 115, accuracy: 97.3, sessions: 1567, country: "🇫🇷" },
  { rank: 7, username: "you", avatar: "ME", wpm: 73, accuracy: 94.2, sessions: 182, country: "🇺🇸", isMe: true },
  { rank: 8, username: "DigitalDash", avatar: "DD", wpm: 71, accuracy: 93.7, sessions: 345, country: "🇦🇺" },
  { rank: 9, username: "SwiftKeys", avatar: "SK", wpm: 68, accuracy: 95.8, sessions: 421, country: "🇧🇷" },
  { rank: 10, username: "TextTornado", avatar: "TT", wpm: 65, accuracy: 92.1, sessions: 298, country: "🇮🇳" },
];

export const WPM_TREND = [
  { date: "Jan 1", wpm: 42, accuracy: 88 },
  { date: "Jan 8", wpm: 48, accuracy: 89 },
  { date: "Jan 15", wpm: 51, accuracy: 91 },
  { date: "Jan 22", wpm: 55, accuracy: 90 },
  { date: "Feb 1", wpm: 58, accuracy: 92 },
  { date: "Feb 8", wpm: 61, accuracy: 93 },
  { date: "Feb 15", wpm: 65, accuracy: 91 },
  { date: "Feb 22", wpm: 68, accuracy: 94 },
  { date: "Mar 1", wpm: 70, accuracy: 93 },
  { date: "Mar 8", wpm: 73, accuracy: 94 },
  { date: "Mar 15", wpm: 75, accuracy: 95 },
  { date: "Mar 22", wpm: 73, accuracy: 94 },
];

export const DAILY_PRACTICE = [
  { day: "Mon", minutes: 25 }, { day: "Tue", minutes: 40 }, { day: "Wed", minutes: 15 },
  { day: "Thu", minutes: 55 }, { day: "Fri", minutes: 30 }, { day: "Sat", minutes: 70 }, { day: "Sun", minutes: 45 },
];

export const WEAK_KEYS = [
  { key: "Q", errorRate: 18 }, { key: "Z", errorRate: 15 }, { key: "X", errorRate: 12 },
  { key: "P", errorRate: 9 }, { key: "B", errorRate: 7 }, { key: "Y", errorRate: 6 },
];

export const USER = {
  username: "you",
  email: "user@typemaster.app",
  avatar: "ME",
  level: 12,
  experiencePoints: 4820,
  targetWpm: 100,
  dailyGoal: 30,
  currentWpm: 73,
  bestWpm: 81,
  accuracy: 94.2,
  totalSessions: 182,
  totalWords: 12847,
  streak: 14,
  joinedAt: "2024-01-01",
};
