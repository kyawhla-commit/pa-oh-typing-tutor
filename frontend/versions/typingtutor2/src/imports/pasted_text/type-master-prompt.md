# Production Frontend UI Prompt — TypeMaster Typing Tutor SaaS

You are a senior frontend engineer and UI/UX designer.

Build a production-ready Typing Tutor web application called **"TypeMaster"**.

The goal is to create a polished commercial SaaS-quality frontend experience similar to modern education platforms.

Focus ONLY on:
- Frontend UI
- User experience
- Component architecture
- Responsive design
- Interactive states

Do NOT build backend, database, authentication APIs, or deployment configuration.

================================================
FRONTEND TECH STACK
================================================

Framework:
- Next.js 16 (App Router)
- React 19
- TypeScript

Styling:
- Tailwind CSS
- shadcn/ui
- CSS variables for theme system

UI / Animation:
- Framer Motion
- Lucide React icons

State Management:
- Zustand

Forms:
- React Hook Form
- Zod validation

Data Visualization:
- Recharts

Tables:
- TanStack Table

Utilities:
- date-fns

Notifications:
- Sonner toast

Code Quality:
- ESLint
- Prettier
- Strict TypeScript


================================================
FRONTEND ARCHITECTURE
================================================

Use a clean scalable structure:


src/

├── app/
│   ├── page.tsx
│   ├── dashboard/
│   ├── practice/
│   ├── test/
│   ├── lessons/
│   ├── progress/
│   ├── achievements/
│   ├── leaderboard/
│   └── settings/

├── components/

│   ├── ui/
│   ├── layout/
│   ├── typing/
│   ├── dashboard/
│   ├── lessons/
│   └── charts/


├── hooks/

├── store/

├── types/

├── constants/

└── lib/


Follow:
- Component-driven development
- Reusable components
- Separation of concerns
- Strong TypeScript typing


================================================
DESIGN SYSTEM
================================================

Create a premium SaaS educational design.


Brand:

Name:
TypeMaster


Style:

- Modern
- Clean
- Professional
- Friendly
- Minimal
- High readability


Color Palette:

Primary:
#2563EB

Secondary:
#60A5FA

Background:
#F8FAFC

Card:
#FFFFFF

Text:
#0F172A

Muted:
#64748B

Success:
#16A34A

Error:
#DC2626


Typography:

Font:
Inter


UI Style:

- Rounded cards
- Soft shadows
- Smooth animations
- Spacious layout
- Consistent spacing
- Professional dashboard feeling


================================================
GLOBAL LAYOUT
================================================

Create responsive layouts.


Desktop:

------------------------------------------------
Logo        Search        Profile
------------------------------------------------

Sidebar       Main Content

Dashboard
Practice
Lessons
Progress
Achievements
Leaderboard
Settings


Mobile:

- Collapsible sidebar
- Mobile navigation
- Touch-friendly controls


================================================
REUSABLE COMPONENTS
================================================

Create reusable components:


Layout:

- Sidebar
- Navbar
- MobileMenu
- Breadcrumb


UI:

- Button
- Card
- Badge
- Modal
- Dropdown
- Tabs
- Tooltip
- ProgressBar
- Skeleton
- EmptyState


Typing:

- TypingBox
- VirtualKeyboard
- TypingStats
- Timer
- SpeedIndicator


Learning:

- LessonCard
- LevelBadge
- ProgressCard


Analytics:

- ChartCard
- StatisticCard


Social:

- LeaderboardTable
- UserRankCard


================================================
LANDING PAGE
================================================

Route:

/


Create a professional marketing homepage.


Hero Section:


Left:

Heading:

"Type Faster.
Build a Brighter You."


Description:

"Master touch typing through interactive lessons, real-time feedback, and personalized progress tracking."


Buttons:

Primary:
Start Learning


Secondary:
Watch Demo



Right:

Create typing application preview mockup.


Include:


Feature section:

Cards:

1.
Typing Practice

Real-time typing feedback.


2.
Typing Tests

Measure speed and accuracy.


3.
Progress Analytics

Track improvement.


4.
Achievements

Stay motivated.


Statistics:

100+
Lessons


1M+
Learners


98%
Average Accuracy


================================================
DASHBOARD PAGE
================================================

Route:

/dashboard


Create:


Welcome Card:

"Good morning, Alex 👋"


Show:

Current Level

Daily Goal

Practice Streak


Statistics:


Current Speed

72 WPM


Accuracy

98%


Words Typed

25,000


Practice Time

25 Hours



Charts:

- Weekly typing activity
- Speed improvement graph



Daily Challenge:


"Today's Challenge"

Type 500 words

Accuracy above 95%


Button:

Start Challenge


================================================
TYPING PRACTICE PAGE
================================================

Route:

/practice


Main purpose:

Distraction-free typing environment.


Layout:


Top:

Practice selector:


Words

Sentences

Paragraph

Code



Timer:

01:23



Typing Area:


Display text:


"The quick brown fox jumps over the lazy dog"


Character states:


Correct:
Green


Wrong:
Red


Current:
Blue highlight



Input:

Large typing area



Live Statistics:


Speed

Accuracy

Errors

Characters



Virtual Keyboard:


Features:

- Full keyboard layout
- Active key animation
- Finger position guide
- Key press animation


================================================
TYPING TEST PAGE
================================================

Route:

/test


Create test setup.


Options:


Time:

15 seconds

30 seconds

1 minute

5 minutes



Difficulty:

Easy

Medium

Hard


After completion:


Result modal:


Speed:

85 WPM


Accuracy:

97%


Characters:

420


Errors:

5



Actions:

Retry

Save Result

View Progress


================================================
LESSONS PAGE
================================================

Route:

/lessons


Create learning roadmap.


Categories:


Beginner

Intermediate

Advanced

Programming



Lesson Card:


Example:


Lesson:

Home Row Keys


Progress:

75%


Difficulty:

Beginner


Duration:

15 minutes


Actions:

Continue


Include:

- Locked lessons
- Completed lessons
- Current lesson highlight


================================================
PROGRESS ANALYTICS PAGE
================================================

Route:

/progress


Create analytics dashboard.


Statistics:

Best Speed

120 WPM


Average Speed

75 WPM


Accuracy

98%


Total Practice

50 Hours



Charts:

- WPM trend line chart
- Accuracy chart
- Practice activity chart


Calendar:

Typing streak tracker


================================================
ACHIEVEMENTS PAGE
================================================

Route:

/achievements


Achievement cards:


Examples:


🏆 First 30 WPM

🔥 7 Day Streak

⭐ Accuracy Master

🚀 Speed Runner


States:

Locked

Unlocked

In Progress


================================================
LEADERBOARD PAGE
================================================

Route:

/leaderboard


Create:


Tabs:

Global

Weekly

Friends



Table:


Rank

Avatar

Username

Level

WPM

Accuracy



Highlight current user row.


================================================
SETTINGS PAGE
================================================

Route:

/settings


Sections:


Profile:

- Avatar
- Username


Learning:

- Target WPM
- Daily goal


Preferences:

- Dark mode
- Sound effects
- Keyboard layout


================================================
UX REQUIREMENTS
================================================


Implement:


Animations:

- Page transitions
- Card hover effects
- Button interactions
- Progress animations


States:


Loading:

- Skeleton loaders


Empty:

"No typing history yet.
Start practicing today."


Error:

"Something went wrong.
Try again."


Success:

Toast notifications



================================================
ACCESSIBILITY
================================================

Follow:

- Keyboard navigation
- Proper focus states
- ARIA labels
- Color contrast standards
- Screen reader support


================================================
FINAL EXPECTATION
================================================

The final result should look like a real commercial SaaS typing platform.

Prioritize:

1. Premium UI quality
2. Excellent user experience
3. Responsive design
4. Reusable components
5. Maintainable frontend architecture
6. Smooth interactions

Use realistic mock data.

Do not create a simple demo.
Create a production-quality frontend interface.