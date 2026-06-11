export interface LessonKeyTerm {
  term: string;
  definition: string;
}

export interface LessonQuiz {
  question: string;
  options: string[];
  correct: number;
}

export interface Lesson {
  id: string;
  trackId: string;
  title: string;
  subtitle: string;
  emoji: string;
  readingMinutes: number;
  body: string[];
  eli10?: string[];
  keyTerms: LessonKeyTerm[];
  quiz: LessonQuiz;
  type?: 'lesson' | 'case-study';
}

export interface Track {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
}

export const TRACKS: Track[] = [
  { id: 'market-basics', title: 'Market Basics', subtitle: 'How markets work and what stocks are', emoji: '🏛️', color: 'forest' },
  { id: 'reading-companies', title: 'Reading Companies', subtitle: 'Understand what a business is worth', emoji: '🔍', color: 'amber' },
  { id: 'technical-analysis', title: 'Technical Analysis', subtitle: 'Read charts and price signals', emoji: '📈', color: 'dusty' },
  { id: 'options-101', title: 'Options 101', subtitle: 'Calls, puts, and how options work', emoji: '⚡', color: 'brick' },
  { id: 'macro-economy', title: 'Macro & Economy', subtitle: 'Big-picture forces that move markets', emoji: '🌍', color: 'navy' },
];

export const LESSONS: Lesson[] = [

  // ─── TRACK 1: Market Basics ─────────────────────────────────────────────────

  {
    id: 'what-is-a-stock',
    trackId: 'market-basics',
    title: 'What is a stock?',
    subtitle: 'Owning a tiny piece of a company',
    emoji: '🏢',
    readingMinutes: 3,
    body: [
      "When a company wants to raise money to grow its business, it can sell small pieces of ownership to the public. Each piece is called a share, and together all the shares make up the company's stock. When you buy a share of Apple, you literally own a tiny fraction of Apple, Inc.",
      "As the company grows and makes more money, its shares become more valuable — so your investment grows too. If the company shrinks or struggles, the shares lose value. That's the core risk and reward of owning stocks.",
      "The stock market is just the marketplace where buyers and sellers trade these shares every day. Prices change constantly based on how optimistic or pessimistic people are about a company's future.",
      "Big companies like Apple, Microsoft, or Tesla have millions of shares traded every day. Smaller companies might trade far fewer. The total value of all shares is called the company's market capitalization — or \"market cap\" for short.",
    ],
    eli10: [
      "Imagine a lemonade stand that needs money to buy more lemons. Instead of getting a loan, the owner lets friends buy a piece of the stand. If you give $10 and the stand is worth $100, you own 10% of it. Stocks work exactly like that — but with huge companies.",
      "If the lemonade stand does great and becomes worth $200, your 10% is now worth $20. If it does badly and falls to $50, your piece is worth $5. That's the deal with stocks — you share the wins AND the losses.",
      "The stock market is like a giant auction where millions of people trade these ownership pieces all day long. Prices go up when more people want to buy, and down when more people want to sell.",
      "Some companies are worth billions — Apple is worth over $3 trillion. That number is the market cap: the price of one share times the total number of shares.",
    ],
    keyTerms: [
      { term: 'Share', definition: 'A single unit of ownership in a company.' },
      { term: 'Stock', definition: 'All the shares of a company combined.' },
      { term: 'Stock market', definition: 'The marketplace where shares are bought and sold.' },
      { term: 'Market cap', definition: "The total value of all a company's shares combined." },
    ],
    quiz: {
      question: 'When you buy a share of a company, what are you actually getting?',
      options: ['A loan to the company', 'A tiny piece of ownership in the company', 'A guaranteed return on your money', 'A bond issued by the company'],
      correct: 1,
    },
  },

  {
    id: 'what-is-market-cap',
    trackId: 'market-basics',
    title: 'Market cap explained',
    subtitle: 'How big is this company, really?',
    emoji: '📊',
    readingMinutes: 3,
    body: [
      "Market capitalization — market cap for short — is simply the total value of a company's stock. You calculate it by multiplying the current share price by the total number of shares. If Apple's stock is $200 and there are 15 billion shares, the market cap is $3 trillion.",
      "Market cap helps you compare companies regardless of their share price. A $500 share price doesn't mean a company is 'bigger' than one with a $50 share price — what matters is the total value of all shares.",
      "Investors often group companies by size: Large-cap (over $10 billion) are established companies like Microsoft or Walmart. Mid-cap ($2–10 billion) are solid but still growing. Small-cap (under $2 billion) are smaller, newer companies — higher risk, potentially higher reward.",
      "Knowing a company's market cap gives you a quick sense of its size, stability, and growth potential. Large caps tend to be safer but grow more slowly. Small caps can be exciting but also lose value fast.",
    ],
    eli10: [
      "Market cap is just a fancy way of saying 'what is this whole company worth?' Multiply the price of one share by how many shares exist — that's it.",
      "Just because one candy bar costs $3 and another costs $1 doesn't mean the $3 one is the 'bigger' company. Maybe the $1 company has a billion candy bars for sale. Market cap tells you the real size.",
      "Big companies (large-cap) are like ocean liners — super stable but slow to turn. Small companies (small-cap) are like speedboats — exciting and fast, but easier to capsize.",
    ],
    keyTerms: [
      { term: 'Market cap', definition: "Share price × total shares = the total value of the company." },
      { term: 'Large-cap', definition: 'Companies worth over $10 billion — generally stable and well-known.' },
      { term: 'Small-cap', definition: 'Companies worth under $2 billion — higher risk, higher potential.' },
    ],
    quiz: {
      question: 'A company has 100 million shares and each share costs $50. What is its market cap?',
      options: ['$50 million', '$500 million', '$5 billion', '$50 billion'],
      correct: 2,
    },
  },

  {
    id: 'reading-a-stock-price',
    trackId: 'market-basics',
    title: 'Reading a stock price',
    subtitle: 'What all those numbers actually mean',
    emoji: '🔢',
    readingMinutes: 4,
    body: [
      "When you look up a stock, you'll see a lot of numbers. The most important is the current price — what one share costs right now. Below it you'll see the change: how much the price moved today, shown as a dollar amount and a percentage.",
      "The 52-week high and low tell you the highest and lowest the stock traded over the past year. If a stock is near its 52-week high, it's been on a strong run. If it's near its low, it may be struggling — or it could be a buying opportunity.",
      "Volume tells you how many shares were traded today. High volume means a lot of interest — people are actively buying and selling. Low volume means quieter trading, which can make prices more unpredictable.",
      "The open is the price when the market opened (9:30 AM Eastern). The previous close is where the stock finished yesterday. The gap between yesterday's close and today's open is called the gap — if news came out overnight, you'll often see a big gap.",
    ],
    eli10: [
      "The stock price is just what one piece of the company costs right now. The green/red number next to it tells you if the price went up or down today.",
      "The 52-week high and low are like a report card for the whole year — the best day and the worst day in the last 12 months.",
      "Volume is how popular the stock is today. High volume = lots of people trading. Low volume = quiet day, fewer trades.",
      "The market is like a store that opens at 9:30 AM and closes at 4 PM Eastern time, Monday through Friday. The 'open' is the first price of the day, and the 'close' is the last.",
    ],
    keyTerms: [
      { term: '52-week high/low', definition: 'The highest and lowest price over the last year.' },
      { term: 'Volume', definition: 'How many shares were traded today.' },
      { term: 'Open', definition: 'The price when the market started trading that day.' },
      { term: 'Gap', definition: "The difference between yesterday's close and today's open." },
    ],
    quiz: {
      question: "A stock's 52-week low is $45 and it's currently trading at $47. What does this tell you?",
      options: ["The stock is near its highest price ever", "The stock is near its lowest price of the past year", "The stock will definitely go up", "The volume is unusually high"],
      correct: 1,
    },
  },

  {
    id: 'what-are-dividends',
    trackId: 'market-basics',
    title: 'What are dividends?',
    subtitle: 'Getting paid just for holding a stock',
    emoji: '💰',
    readingMinutes: 3,
    body: [
      "Some companies share a portion of their profits directly with their shareholders. These payments are called dividends. They're usually paid quarterly — four times a year — and show up as cash deposited into your brokerage account.",
      "Not all stocks pay dividends. Fast-growing tech companies like Amazon typically reinvest all their profits back into the business. More established companies like Coca-Cola pay consistent dividends because they generate stable profits and don't need to reinvest as aggressively.",
      "The dividend yield tells you what percentage of the stock price you get back in dividends each year. A stock at $100 that pays $4/year has a 4% yield — easy to compare against a savings account or bond.",
      "Dividends create a reliable income stream and can cushion you against stock price drops. Even if a stock falls 10%, receiving a 4% dividend every year helps offset that loss. Many long-term investors prize dividend stocks for exactly this reason.",
    ],
    eli10: [
      "Dividends are like a 'thank you' payment from a company for owning their stock. Imagine a store that sends you $5 every three months just because you own a piece of it.",
      "Not every company does this. Young, fast-growing companies usually keep all their money to grow faster. Old, established companies often pay dividends because they have more cash than they need.",
      "Dividend yield is like an interest rate. A 4% yield means you get $4 per year for every $100 of stock you own.",
    ],
    keyTerms: [
      { term: 'Dividend', definition: "A cash payment companies make to shareholders from their profits." },
      { term: 'Dividend yield', definition: 'The annual dividend as a percentage of the stock price.' },
      { term: 'Quarterly', definition: 'Four times a year — how most dividends are paid.' },
    ],
    quiz: {
      question: 'A $50 stock pays $2 in dividends per year. What is the dividend yield?',
      options: ['2%', '4%', '25%', '50%'],
      correct: 1,
    },
  },

  {
    id: 'what-is-an-etf',
    trackId: 'market-basics',
    title: 'What is an ETF?',
    subtitle: 'Instant diversification in one click',
    emoji: '🗂️',
    readingMinutes: 3,
    body: [
      "An ETF (Exchange-Traded Fund) is like a basket that holds many stocks at once. When you buy one share of an ETF, you automatically own a tiny piece of every stock inside it. It trades on the stock market just like a regular stock.",
      "SPY is the most popular ETF — it tracks the S&P 500, which is the 500 largest US companies. Buying one share of SPY is like buying a tiny piece of Apple, Microsoft, Amazon, and 497 other companies all at once.",
      "ETFs come in all shapes: QQQ tracks the top 100 tech companies. GLD tracks gold. VTI tracks the entire US stock market. ARKK holds innovative, high-growth companies. Each ETF has an expense ratio — a small annual fee (often under 0.1%) for managing the fund.",
      "For most beginners, starting with broad ETFs (like SPY or VTI) is a smart move. You get instant diversification, low fees, and exposure to the overall economy's growth without needing to pick individual stocks.",
    ],
    eli10: [
      "An ETF is like buying a mystery bag of toys that has a little bit of every toy in the store. Instead of picking one toy and hoping it's good, you get them all.",
      "The most popular ETF, SPY, holds the 500 biggest companies in America. One share and you own a piece of Apple, McDonald's, and hundreds of others.",
      "ETFs charge a tiny fee — usually less than a penny per dollar — to manage the basket. That's it. It's the cheapest way to invest in lots of companies at once.",
    ],
    keyTerms: [
      { term: 'ETF', definition: 'A fund holding many stocks, bought and sold like a regular stock.' },
      { term: 'S&P 500', definition: 'An index of the 500 largest US public companies.' },
      { term: 'Expense ratio', definition: 'The small annual fee an ETF charges to manage the fund.' },
    ],
    quiz: {
      question: 'What happens when you buy one share of an ETF that tracks the S&P 500?',
      options: ['You own one share of the largest company in the index', 'You get exposure to all 500 companies in the index', 'You must pay taxes immediately', 'You can only sell it after one year'],
      correct: 1,
    },
  },

  {
    id: 'what-is-diversification',
    trackId: 'market-basics',
    title: 'Diversification',
    subtitle: "Why you shouldn't put all your eggs in one basket",
    emoji: '🧺',
    readingMinutes: 3,
    body: [
      "Diversification means spreading your investments across many different stocks, industries, or asset types. The classic reason: if one company collapses, it shouldn't destroy your whole portfolio.",
      "Imagine putting everything into one airline stock — then COVID hits. Your investment goes to near zero. But if you had 20 stocks across airlines, tech, healthcare, and consumer goods, that airline loss hurts but doesn't ruin you.",
      "The easiest way to diversify immediately is through index funds or ETFs. An ETF like SPY or QQQ holds hundreds of stocks in one package. Buying one share instantly gives you broad exposure.",
      "Don't confuse diversification with owning many stocks from the same industry. Owning 10 different bank stocks isn't true diversification — if the banking sector crashes, they all fall together. True diversification spreads across different industries, company sizes, and even countries.",
    ],
    eli10: [
      "If you put all your birthday money on one horse in a race, you could win big — or lose everything. Spreading your money across 10 horses means you'll probably win something no matter what.",
      "Diversification is just fancy talk for 'don't bet everything on one thing.'",
      "ETFs are the easiest way to diversify. One purchase, hundreds of companies. Done.",
    ],
    keyTerms: [
      { term: 'Diversification', definition: 'Spreading investments to reduce the risk of any single holding.' },
      { term: 'ETF (Exchange-Traded Fund)', definition: 'A fund holding many stocks, traded like a single stock.' },
      { term: 'Index fund', definition: 'A fund that tracks a market index like the S&P 500.' },
    ],
    quiz: {
      question: 'Which of the following is the best example of diversification?',
      options: ['Owning 10 different bank stocks', 'Owning stocks across tech, healthcare, energy, and consumer goods', 'Putting everything into the safest company you can find', 'Buying and selling quickly to avoid losses'],
      correct: 1,
    },
  },

  {
    id: 'how-to-think-about-risk',
    trackId: 'market-basics',
    title: 'Thinking about risk',
    subtitle: "Every investment has a risk — here's how to think about it",
    emoji: '🎯',
    readingMinutes: 4,
    body: [
      "Every investment involves risk — the possibility you'll lose money. The key insight: higher potential returns almost always come with higher risk. A savings account is safe but earns little. A speculative small-cap stock could triple in value or lose 80%.",
      "Risk tolerance is personal. It depends on how long you plan to invest (time horizon), how much you can afford to lose without financial hardship, and how well you'd sleep if your portfolio dropped 30%. A 25-year-old saving for retirement can afford more risk than a 60-year-old who needs the money in five years.",
      "Position sizing is one of the most important risk management tools. It means deciding how much of your total portfolio to put in any single investment. A common rule: never put more than 5-10% of your portfolio in a single speculative stock.",
      "Stop losses are orders that automatically sell a stock if it falls below a certain price. They help you limit losses without needing to watch the market constantly. For example, if you buy at $100, you might set a stop loss at $85 — meaning you'd never lose more than 15%.",
    ],
    eli10: [
      "Risk is just the chance you might lose some of your money. The more exciting the potential reward, the more risk is usually involved. Safe = boring but stable. Exciting = could be great, could be terrible.",
      "How much risk is right for you? Think about it like spicy food. Some people love extra hot. Others need mild. Know your tolerance before you invest.",
      "Never put too much money in one thing. Even if you love a company, only put a small slice of your total savings into it.",
    ],
    keyTerms: [
      { term: 'Risk tolerance', definition: 'How much potential loss you can handle emotionally and financially.' },
      { term: 'Time horizon', definition: 'How long you plan to keep your money invested.' },
      { term: 'Position sizing', definition: 'Deciding what percentage of your portfolio to put in one investment.' },
      { term: 'Stop loss', definition: 'An automatic sell order that triggers if a stock falls to a set price.' },
    ],
    quiz: {
      question: "You have $10,000 to invest. Following the 5% rule, what's the maximum you'd put in any single speculative stock?",
      options: ['$100', '$500', '$1,000', '$5,000'],
      correct: 1,
    },
  },

  {
    id: 'bulls-and-bears',
    trackId: 'market-basics',
    title: 'Bull vs. bear markets',
    subtitle: 'Why everyone keeps talking about these animals',
    emoji: '🐂',
    readingMinutes: 3,
    body: [
      "You'll hear 'bull market' and 'bear market' constantly in financial news. A bull market is when stock prices are rising and investors are optimistic. A bear market is when prices are falling — generally defined as a drop of 20% or more from recent highs.",
      "Bull markets often last for years. The 2009–2020 bull run was one of the longest in history. Bear markets tend to be shorter but feel very painful when you're in one. The 2020 COVID crash lasted just two months before recovering.",
      "Recessions (economic downturns) and bear markets often go together, but not always. Markets are forward-looking — they often fall before a recession officially starts, and start recovering before it officially ends.",
      "As a beginner, the most important thing to know: bear markets are temporary. Every bear market in history has eventually been followed by a new bull market. The biggest investing mistake is panic-selling during a bear market and missing the recovery.",
    ],
    eli10: [
      "A bull market is when stocks go up and everyone's happy. A bear market is when stocks fall a lot and everyone's worried. Imagine a classroom mood — sometimes everyone's excited, sometimes everyone's stressed.",
      "Good news: even the worst bear markets eventually end. The COVID crash scared everyone — then the market hit all-time highs less than a year later.",
      "The biggest mistake beginners make: selling everything when the market falls, then missing the recovery. Time in the market beats timing the market.",
    ],
    keyTerms: [
      { term: 'Bull market', definition: 'A period of rising stock prices and investor optimism.' },
      { term: 'Bear market', definition: 'A drop of 20%+ from recent highs — a period of falling prices.' },
      { term: 'Recession', definition: 'A period of economic decline, often accompanied by rising unemployment.' },
    ],
    quiz: {
      question: 'The stock market drops 25% from its recent high. What is this called?',
      options: ['A bull market', 'A correction', 'A bear market', 'A recession'],
      correct: 2,
    },
  },

  {
    id: 'what-is-volatility',
    trackId: 'market-basics',
    title: 'Understanding volatility',
    subtitle: 'How wild can this stock get?',
    emoji: '🌊',
    readingMinutes: 3,
    body: [
      "Volatility measures how much a stock's price swings up and down. A highly volatile stock might move 5-10% in a single day. A low-volatility stock might move only 0.5-1%. Volatility itself isn't good or bad — it's just a measure of unpredictability.",
      "For beginners, high volatility can be emotionally exhausting. Imagine buying a stock at $100, watching it drop to $70, then rise back to $120. Your investment is up — but can you stay calm through that 30% drop without panic-selling?",
      "Beta is a related measure that compares a stock's volatility to the overall market. A beta of 1 means the stock moves with the market. A beta of 2 means it moves twice as much. High-beta stocks are exciting but risky.",
      "The VIX ('fear index') measures overall market volatility. When it spikes, it usually means investors are scared. When it's low, markets are calm. You'll see this referenced in market news often.",
    ],
    eli10: [
      "Volatility is how shaky a stock's price is. A rollercoaster is volatile — it goes up fast and comes down fast. A slow elevator is not volatile — it moves steadily.",
      "High volatility means the stock can make you rich faster — but also lose your money faster. It's exciting AND scary at the same time.",
      "Beta is a score that tells you how wild a stock is compared to the market. Beta of 2 means twice as wild.",
    ],
    keyTerms: [
      { term: 'Volatility', definition: "How much a stock's price swings up and down." },
      { term: 'Beta', definition: 'How much a stock moves compared to the overall market. Beta of 2 = twice as volatile.' },
      { term: 'VIX', definition: "The market's 'fear index' — measures overall expected volatility." },
    ],
    quiz: {
      question: 'A stock has a beta of 2. If the market drops 5%, how much would this stock likely drop?',
      options: ['2%', '5%', '10%', '0.5%'],
      correct: 2,
    },
  },

  {
    id: 'how-markets-work',
    trackId: 'market-basics',
    title: 'How markets actually work',
    subtitle: 'Bid, ask, and how your order gets filled',
    emoji: '⚙️',
    readingMinutes: 4,
    body: [
      "The stock market is an auction happening billions of times a day. When you want to buy Apple stock, someone else has to want to sell it. The price you pay is where buyers and sellers agree to meet.",
      "The bid price is the highest a buyer is willing to pay. The ask price is the lowest a seller will accept. The difference between them is the spread. For popular stocks like Apple, the spread is a fraction of a penny. For tiny stocks, the spread can be much wider.",
      "A market order fills immediately at whatever the current price is. A limit order lets you set the maximum you'll pay (or minimum you'll accept). Limit orders give you price control but might not execute if the market moves away from your price.",
      "The main US markets — NYSE and Nasdaq — trade from 9:30 AM to 4:00 PM Eastern, Monday through Friday. Pre-market (4–9:30 AM) and after-hours (4–8 PM) trading exists but with much lower volume and wider spreads — beginners should generally avoid it.",
    ],
    eli10: [
      "Buying a stock is like bidding in an auction. You say how much you'll pay, the seller says how little they'll accept, and when you agree — the trade happens.",
      "Bid = what buyers want to pay. Ask = what sellers want. If they're the same, a trade happens. The gap between them is the 'spread.'",
      "A market order is like walking into a store and paying whatever the price tag says. A limit order is like saying 'I'll only buy it if it goes on sale for $X.'",
      "The market is open from 9:30 AM to 4 PM New York time on weekdays. Outside those hours you can still sometimes trade, but it's riskier.",
    ],
    keyTerms: [
      { term: 'Bid price', definition: "The highest price a buyer is willing to pay for a stock." },
      { term: 'Ask price', definition: 'The lowest price a seller will accept for a stock.' },
      { term: 'Spread', definition: 'The gap between bid and ask. Wider spread = less liquid stock.' },
      { term: 'Limit order', definition: 'An order to buy/sell only at a specific price or better.' },
    ],
    quiz: {
      question: "A stock's bid is $99.95 and the ask is $100.05. If you place a market order to buy, what price do you pay?",
      options: ['$99.95', '$100.00', '$100.05', '$99.00'],
      correct: 2,
    },
  },

  // ─── TRACK 2: Reading Companies ─────────────────────────────────────────────

  {
    id: 'what-is-pe-ratio',
    trackId: 'reading-companies',
    title: 'The P/E ratio',
    subtitle: 'Are you paying too much for this stock?',
    emoji: '⚖️',
    readingMinutes: 4,
    body: [
      "The Price-to-Earnings ratio (P/E ratio) is one of the most useful tools for judging whether a stock is cheap or expensive. It answers the question: how much are investors paying for every dollar of profit this company makes?",
      "To calculate it, divide the stock price by the earnings per share (EPS). If a stock costs $50 and earns $5 per share, the P/E is 10 — you're paying $10 for every $1 of earnings. A higher P/E means investors expect strong future growth. A lower P/E might mean the stock is undervalued — or that the company is struggling.",
      "Context matters. Tech companies often have P/E ratios of 30, 50, or even higher because investors expect fast growth. Bank stocks might trade at P/E ratios of 10-15 because their growth is slower. Always compare P/E against other companies in the same industry.",
      "A very high P/E can be risky — it means the stock price assumes everything will go perfectly. If earnings disappoint, the stock can drop sharply. A low P/E can be a bargain — or a warning sign that the company is in trouble.",
    ],
    eli10: [
      "P/E ratio is how many years it would take a company to 'earn back' what you're paying for it. P/E of 20 means you're paying 20 years of current profits upfront.",
      "High P/E means investors are excited about the future. Low P/E means they're not. Sometimes low P/E is a bargain — sometimes it's a warning.",
      "Always compare a company's P/E to its competitors. A P/E of 25 for a tech company might be cheap. The same P/E for a bank would be very expensive.",
    ],
    keyTerms: [
      { term: 'P/E ratio', definition: "Share price ÷ earnings per share. How much you're paying for $1 of profit." },
      { term: 'EPS (Earnings Per Share)', definition: "The company's profit divided by the number of shares." },
      { term: 'Undervalued', definition: 'A stock trading for less than it seems to be worth.' },
    ],
    quiz: {
      question: 'A stock is priced at $100 and earned $4 per share last year. What is the P/E ratio?',
      options: ['4', '25', '400', '0.04'],
      correct: 1,
    },
  },

  {
    id: 'understanding-earnings',
    trackId: 'reading-companies',
    title: 'Earnings reports',
    subtitle: 'The quarterly report card every stock gets',
    emoji: '📋',
    readingMinutes: 4,
    body: [
      "Every three months, public companies are required to report their financial results. This is called an earnings report. It's like a report card that shows how much revenue they made, how much profit they kept, and what they expect going forward.",
      "Two numbers matter most: revenue (total sales) and earnings per share (EPS). But what matters isn't just whether these numbers are good — it's whether they beat, met, or missed what analysts expected. A 'beat' often sends a stock up. A 'miss' can send it down even if the company was still profitable.",
      "The guidance is often even more important than the actual results. This is the company's forecast for the next quarter. Strong guidance = bullish signal. Weak guidance = stock can drop even if current results were great.",
      "Earnings season happens four times a year: January-February (Q4), April-May (Q1), July-August (Q2), October-November (Q3). During this period, stocks can be very volatile. Holding through earnings without understanding the risk is one of the most common beginner mistakes.",
    ],
    eli10: [
      "Every three months, companies tell the world how much money they made. It's like getting a report card — but instead of grades, it's dollars.",
      "The tricky part: it's not enough to do well. You have to do BETTER than what experts expected. If everyone thought you'd make $100 and you made $90, the stock might go down even though you made money.",
      "Guidance is the company telling you what they expect to happen next. Good expectations → stock goes up. Disappointing expectations → stock goes down, even if today was great.",
    ],
    keyTerms: [
      { term: 'Earnings report', definition: 'A quarterly financial update every public company must publish.' },
      { term: 'Revenue', definition: 'Total money coming in from sales — before expenses.' },
      { term: 'Beat / Miss', definition: 'Whether results were better or worse than what analysts expected.' },
      { term: 'Guidance', definition: "The company's own forecast for the next quarter." },
    ],
    quiz: {
      question: 'A company reports earnings of $2.10 per share. Analysts expected $2.50. What happens next?',
      options: ["The stock probably rises because $2.10 is still positive", "The stock often falls because it missed expectations", "Nothing — earnings don't affect stock prices", "The company goes bankrupt"],
      correct: 1,
    },
  },

  {
    id: 'revenue-vs-profit',
    trackId: 'reading-companies',
    title: 'Revenue vs. profit',
    subtitle: 'Big sales numbers can hide small (or negative) profits',
    emoji: '💵',
    readingMinutes: 3,
    body: [
      "Revenue is the total amount of money a company brings in from sales. Profit is what's left after paying all expenses — salaries, rent, materials, taxes, and everything else. A company can have enormous revenue and still lose money.",
      "Gross profit is revenue minus the direct cost of making the product. Operating profit (EBIT) subtracts business expenses like salaries and rent. Net profit is what remains after interest payments and taxes — often called the 'bottom line.'",
      "Many high-growth companies deliberately run at a loss for years — Amazon barely made a profit for its first decade. They reinvest every dollar into growing faster. Whether that's a good bet depends on whether the growth strategy is working.",
      "When evaluating a company, always check: is revenue growing? Is the profit margin improving? A company with 20% revenue growth and improving margins is a very different animal from one with 20% revenue growth but widening losses.",
    ],
    eli10: [
      "Revenue is how much money comes in. Profit is how much you keep after paying for everything. Selling $1,000 of pizza but spending $1,200 on ingredients means you LOST $200 — even with high revenue.",
      "Gross profit = revenue minus what it cost to make the thing. Net profit = what's left after paying EVERYONE — employees, rent, taxes.",
      "Some companies spend more than they earn on purpose — to grow faster. Amazon did this for years. The question is: will the growth eventually make it worth it?",
    ],
    keyTerms: [
      { term: 'Revenue', definition: 'Total income from sales before any expenses are deducted.' },
      { term: 'Gross profit', definition: 'Revenue minus the cost of making/delivering the product.' },
      { term: 'Net profit', definition: 'What remains after ALL expenses, interest, and taxes.' },
      { term: 'Profit margin', definition: 'Net profit as a percentage of revenue. Higher = more efficient.' },
    ],
    quiz: {
      question: 'A company makes $10 million in revenue and spends $12 million running the business. What is their net profit?',
      options: ['$10 million', '$2 million profit', '-$2 million (a loss)', '$22 million'],
      correct: 2,
    },
  },

  {
    id: 'reading-a-balance-sheet',
    trackId: 'reading-companies',
    title: 'Reading a balance sheet',
    subtitle: "What a company owns vs. what it owes",
    emoji: '📑',
    readingMinutes: 4,
    body: [
      "A balance sheet is a snapshot of what a company owns (assets) and what it owes (liabilities) at a single point in time. The difference between the two is shareholders' equity — roughly what the company is 'worth' on paper.",
      "Assets include cash, inventory, buildings, equipment, and anything else of value. Current assets (like cash and inventory) can be converted to cash within a year. Long-term assets (like factories) take longer.",
      "Liabilities are debts — bank loans, unpaid bills, bonds issued to investors. Current liabilities are due within a year. Long-term liabilities include bonds and mortgages due further out.",
      "A strong balance sheet has more assets than liabilities, plenty of cash, and manageable debt. A weak balance sheet — lots of debt, little cash — means the company could struggle if business slows down. Always check both sides of the balance sheet before investing.",
    ],
    eli10: [
      "A balance sheet is like asking: 'What do you own and what do you owe?' If you own a $200k house but owe $150k on it, your equity is $50k. Companies work the same way.",
      "Assets = everything the company owns (cash, buildings, equipment). Liabilities = everything the company owes (loans, unpaid bills).",
      "Assets minus liabilities = equity. Positive equity is good. Negative equity (owing more than you own) is a serious red flag.",
    ],
    keyTerms: [
      { term: 'Assets', definition: 'Everything a company owns that has value.' },
      { term: 'Liabilities', definition: 'All debts and obligations the company owes.' },
      { term: "Shareholders' equity", definition: 'Assets minus liabilities — the net worth of the company.' },
      { term: 'Current assets', definition: 'Assets convertible to cash within one year.' },
    ],
    quiz: {
      question: "A company has $500 million in assets and $300 million in liabilities. What is shareholders' equity?",
      options: ['$800 million', '$200 million', '$300 million', '$500 million'],
      correct: 1,
    },
  },

  {
    id: 'what-is-debt-ratio',
    trackId: 'reading-companies',
    title: 'Debt: how much is too much?',
    subtitle: 'Not all debt is bad — but some is dangerous',
    emoji: '⚠️',
    readingMinutes: 3,
    body: [
      "Debt isn't inherently bad. Companies borrow money to build factories, fund research, or expand — investments that can generate far more than they cost. The question is whether the debt is manageable relative to the company's earnings.",
      "The debt-to-equity ratio (D/E) compares total debt to shareholders' equity. A D/E of 1.0 means the company has borrowed as much as its equity. Higher ratios mean more leverage — higher potential returns in good times, but higher risk in bad times.",
      "Interest coverage ratio tells you how easily a company can pay its interest bills. Take EBIT (earnings before interest and taxes) and divide by interest expense. A ratio of 5+ is healthy. Below 2 is a warning sign — a business slowdown could make it hard to service the debt.",
      "Capital-intensive industries (airlines, utilities, manufacturing) typically carry more debt than software companies. Always compare a company's debt levels to others in the same industry before drawing conclusions.",
    ],
    eli10: [
      "Borrowing money to invest can be smart — as long as you can pay it back. A company that borrows $1 billion to build a factory that earns $500 million per year is making a smart bet.",
      "Debt-to-equity is like your debt-to-savings ratio. If you owe 10x what you have saved, any problem could wipe you out. Same for companies.",
      "Interest coverage tells you if the company can pay its loan interest. If they can barely cover it, they're in trouble.",
    ],
    keyTerms: [
      { term: 'Debt-to-equity ratio', definition: "Total debt divided by shareholders' equity. Measures how leveraged a company is." },
      { term: 'Interest coverage ratio', definition: 'EBIT ÷ interest expense. How easily a company can pay its interest.' },
      { term: 'Leverage', definition: 'Using borrowed money to amplify potential returns (and potential losses).' },
    ],
    quiz: {
      question: 'A company earns $100 million (EBIT) and pays $40 million in interest. What is the interest coverage ratio?',
      options: ['0.4', '2.5', '4', '40'],
      correct: 1,
    },
  },

  {
    id: 'cash-flow-explained',
    trackId: 'reading-companies',
    title: 'Cash flow is king',
    subtitle: 'Profits can be faked. Cash cannot.',
    emoji: '💸',
    readingMinutes: 3,
    body: [
      "A company can report a profit on paper while simultaneously running out of cash. How? Accounting allows for creative treatment of revenue and expenses — companies can recognize revenue before they receive payment, or delay recognizing expenses.",
      "Free cash flow (FCF) cuts through this: it's the actual cash left after the company runs its operations and pays for capital expenditures (equipment, buildings). FCF is the money the company can actually spend on dividends, buybacks, or paying down debt.",
      "Warren Buffett famously focuses on free cash flow. A company with consistent, growing FCF is generating real wealth for shareholders. A company reporting accounting profits but burning cash is a red flag.",
      "When you see a company's financials, look at the cash flow statement — not just the income statement. High revenue growth means nothing if the business is hemorrhaging cash. Strong FCF with modest revenue is often a better business than the reverse.",
    ],
    eli10: [
      "Imagine a kid who sells lemonade for $10 but the paper cups, lemons, and sugar cost $12. The accountant might report it cleverly — but the lemonade stand is actually losing money. Cash flow tells you what really happened.",
      "Free cash flow is money left over after running the business. That's the REAL profit.",
      "Warren Buffett (one of the greatest investors ever) cares more about cash flow than almost any other number. If a business generates cash, it's a good business.",
    ],
    keyTerms: [
      { term: 'Cash flow', definition: 'Actual cash moving in and out of the business — not accounting profits.' },
      { term: 'Free cash flow (FCF)', definition: 'Cash from operations minus capital expenditures. What the business truly earns.' },
      { term: 'Capital expenditure (CapEx)', definition: 'Money spent on physical assets like equipment or buildings.' },
    ],
    quiz: {
      question: 'Why might a company report accounting profits while still running out of cash?',
      options: ['Accounting errors', 'Revenue recognized before payment received, or expenses delayed', 'The CEO is stealing', 'Taxes are too high'],
      correct: 1,
    },
  },

  {
    id: 'what-are-stock-buybacks',
    trackId: 'reading-companies',
    title: 'Stock buybacks',
    subtitle: "When a company buys its own shares — and why",
    emoji: '🔄',
    readingMinutes: 3,
    body: [
      "A stock buyback (or share repurchase) happens when a company uses its own cash to buy shares on the open market. Those shares are retired, reducing the total number of shares outstanding.",
      "Fewer shares outstanding means each remaining share now represents a larger percentage of the company. If earnings stay the same but there are 10% fewer shares, earnings per share (EPS) rises by about 11%. This makes the stock look more valuable without the underlying business actually changing.",
      "Buybacks are popular when executives believe the stock is undervalued, or when they want to reward shareholders without committing to a regular dividend. They're also tax-advantaged compared to dividends in some jurisdictions.",
      "Critics argue buybacks can be used to artificially boost EPS while the underlying business stagnates — and that the cash would be better spent on R&D, employees, or expansion. The key question: is management buying back at a fair price, or overpaying?",
    ],
    eli10: [
      "Imagine a pie cut into 10 slices. If someone buys back 2 slices and throws them away, each of the remaining 8 slices is now a bigger piece. Buybacks work the same way with stock.",
      "Companies buy back stock when they think their own stock is a good deal, or when they want to boost the price.",
      "It can be great for shareholders — but sometimes companies should spend that money on growing the business instead.",
    ],
    keyTerms: [
      { term: 'Buyback (Repurchase)', definition: 'When a company buys its own shares to reduce outstanding count.' },
      { term: 'Shares outstanding', definition: 'The total number of shares currently held by investors.' },
      { term: 'EPS accretion', definition: 'How buybacks increase earnings per share by reducing the share count.' },
    ],
    quiz: {
      question: 'A company earns $100M profit with 100M shares (EPS = $1). It buys back 20M shares. What is the new EPS?',
      options: ['$0.80', '$1.00', '$1.25', '$2.00'],
      correct: 2,
    },
  },

  {
    id: 'comparing-competitors',
    trackId: 'reading-companies',
    title: 'Comparing competitors',
    subtitle: 'Is this company the best in its industry?',
    emoji: '🏆',
    readingMinutes: 3,
    body: [
      "No company exists in isolation. To judge whether a stock is worth buying, you must compare it to its closest competitors. A P/E of 25 might be cheap for a software company but expensive for a grocery chain.",
      "Key metrics to compare: P/E ratio, revenue growth rate, profit margins, return on equity (ROE), and debt levels. A company that beats competitors on most of these metrics is usually the better investment.",
      "Market share matters too. A company growing revenue at 20% is impressive — unless competitors are growing at 40%. Relative performance reveals whether a company is actually winning or just benefiting from a rising tide.",
      "Look for competitive advantages — what Buffett calls 'moats.' These are things that protect a company from competition: patents, brand loyalty, switching costs, network effects, or cost advantages. A wide moat means competitors can't easily take the business.",
    ],
    eli10: [
      "Comparing stocks is like comparing athletes. A runner doing 100 meters in 11 seconds sounds good — until you learn everyone else does it in 10 seconds. Context changes everything.",
      "Compare companies on things like revenue growth, profitability, and how much debt they have.",
      "A 'moat' is something that makes it hard for competitors to steal customers. Disney's moat is its beloved characters. Google's moat is that everyone's already using it.",
    ],
    keyTerms: [
      { term: 'Competitive moat', definition: 'Sustainable advantages that protect a business from competition.' },
      { term: 'Return on equity (ROE)', definition: 'Net profit divided by equity — how efficiently a company uses shareholder money.' },
      { term: 'Market share', definition: "A company's share of total sales in its industry." },
    ],
    quiz: {
      question: 'Company A grows revenue 15% per year. Its competitors grow at 30%. What does this likely indicate?',
      options: ['Company A is the market leader', 'Company A may be losing market share', 'Company A has better margins', 'Revenue growth does not matter'],
      correct: 1,
    },
  },

  // ─── TRACK 3: Technical Analysis ────────────────────────────────────────────

  {
    id: 'understanding-rsi',
    trackId: 'technical-analysis',
    title: 'What is RSI?',
    subtitle: 'Has the stock moved too far, too fast?',
    emoji: '📈',
    readingMinutes: 4,
    body: [
      "RSI stands for Relative Strength Index. It's a number between 0 and 100 that measures how fast a stock has been moving up or down recently. Think of it like a temperature gauge for momentum.",
      "The rule of thumb: RSI above 70 means the stock has risen very quickly and might be 'overbought' — due for a rest or pullback. RSI below 30 means the stock has fallen fast and might be 'oversold' — potentially a buying opportunity. RSI around 50 is neutral.",
      "RSI doesn't predict the future with certainty. An overbought stock can keep rising. An oversold stock can keep falling. But RSI gives you a useful signal when combined with other information.",
      "In EquityIQ, you'll see the RSI displayed in the Technicals tab. Green means healthy territory. Red means potentially overbought or oversold. Use it as one piece of the puzzle, not the whole picture.",
    ],
    eli10: [
      "RSI is like a speedometer for a stock's price. Above 70 means it's been moving up really fast and might slow down. Below 30 means it's been falling really fast and might bounce.",
      "Think of it as: high RSI = stock might be 'tired' from going up. Low RSI = stock might be 'tired' from going down.",
      "RSI alone won't tell you everything. Use it alongside other clues.",
    ],
    keyTerms: [
      { term: 'RSI', definition: 'A 0–100 score measuring momentum. Above 70 = possibly overbought, below 30 = possibly oversold.' },
      { term: 'Overbought', definition: 'When a stock has risen so fast it may be due for a pullback.' },
      { term: 'Oversold', definition: 'When a stock has fallen so fast it may bounce back.' },
    ],
    quiz: {
      question: 'A stock has an RSI of 28. What does this most likely indicate?',
      options: ['The stock is in a strong uptrend', 'The stock may be oversold and due for a bounce', 'The stock is guaranteed to go up', 'Investors are very optimistic about the stock'],
      correct: 1,
    },
  },

  {
    id: 'what-is-macd',
    trackId: 'technical-analysis',
    title: 'MACD explained',
    subtitle: 'Spotting momentum shifts before they happen',
    emoji: '📉',
    readingMinutes: 4,
    body: [
      "MACD stands for Moving Average Convergence Divergence — a momentum indicator that shows the relationship between two moving averages of a stock's price. Don't let the long name scare you; the concept is straightforward.",
      "MACD is calculated by subtracting the 26-day exponential moving average (EMA) from the 12-day EMA. The result is plotted alongside a 9-day signal line. When MACD crosses above the signal line, it's considered a bullish signal. When it crosses below, it's bearish.",
      "The MACD histogram shows the difference between MACD and the signal line. Positive and growing bars suggest strengthening momentum. Negative and growing bars suggest weakening. Traders watch for when the histogram starts shrinking — that can signal a reversal coming.",
      "MACD works best in trending markets and can give false signals in choppy, sideways markets. Like RSI, it's most useful when combined with other indicators and fundamental analysis.",
    ],
    eli10: [
      "MACD compares the recent short-term trend to the longer-term trend. If short-term is better than long-term, things are getting stronger (bullish). If it's worse, things are getting weaker (bearish).",
      "When the MACD line crosses above the signal line → possible buy signal. When it crosses below → possible sell signal.",
      "The histogram bars show how strong the signal is. Tall bars = strong momentum. Shrinking bars = momentum fading.",
    ],
    keyTerms: [
      { term: 'MACD', definition: 'A momentum indicator comparing short-term and long-term moving averages.' },
      { term: 'Signal line', definition: 'A 9-day average of MACD used to generate buy/sell signals.' },
      { term: 'Bullish crossover', definition: 'When MACD crosses above the signal line — often a buy signal.' },
      { term: 'MACD histogram', definition: 'The difference between MACD and signal line, shown as bars.' },
    ],
    quiz: {
      question: 'MACD crosses above the signal line. What do technical analysts typically interpret this as?',
      options: ['A sell signal', 'A bullish (buy) signal', 'A sign the stock is overbought', 'A sign that earnings will miss'],
      correct: 1,
    },
  },

  {
    id: 'moving-averages-explained',
    trackId: 'technical-analysis',
    title: 'Moving averages',
    subtitle: 'Smoothing out the noise to see the trend',
    emoji: '〰️',
    readingMinutes: 3,
    body: [
      "A moving average (MA) calculates the average price of a stock over a set period — 20 days, 50 days, or 200 days. By averaging recent prices, it smooths out daily noise and reveals the underlying trend.",
      "The 50-day MA and 200-day MA are the most widely watched. When a stock is above its 200-day MA, it's generally in a long-term uptrend. Below it suggests a downtrend. The 50-day MA captures medium-term momentum.",
      "When the 50-day MA crosses above the 200-day MA, it's called a 'Golden Cross' — a bullish signal. When the 50-day drops below the 200-day, it's called a 'Death Cross' — bearish. These events are watched by millions of traders worldwide.",
      "Moving averages also act as support and resistance. A stock often bounces off its 200-day MA during pullbacks. If it breaks through decisively, the next support level could be much lower.",
    ],
    eli10: [
      "A moving average is like taking a running average of your test scores. Instead of one bad day ruining everything, it shows your overall direction.",
      "The 200-day moving average is like the stock's long-term 'home base.' When the price is above it, things are generally going well. When it falls below, things are generally getting worse.",
      "Golden Cross (50-day crosses above 200-day) = bullish signal. Death Cross (50-day crosses below 200-day) = bearish signal.",
    ],
    keyTerms: [
      { term: 'Moving average (MA)', definition: 'The average price over a set period, updated daily as new prices come in.' },
      { term: '200-day MA', definition: 'A key trend indicator — price above it generally means uptrend.' },
      { term: 'Golden Cross', definition: 'When the 50-day MA crosses above the 200-day MA — bullish signal.' },
      { term: 'Death Cross', definition: 'When the 50-day MA crosses below the 200-day MA — bearish signal.' },
    ],
    quiz: {
      question: "A stock's 50-day moving average crosses below its 200-day moving average. This is called a:",
      options: ['Golden Cross', 'Bull run', 'Death Cross', 'Breakout'],
      correct: 2,
    },
  },

  {
    id: 'support-and-resistance',
    trackId: 'technical-analysis',
    title: 'Support and resistance',
    subtitle: 'Price levels that act like a floor and ceiling',
    emoji: '🪜',
    readingMinutes: 3,
    body: [
      "Support is a price level where a stock tends to stop falling and bounce back up. Resistance is a price level where it tends to stop rising and pull back. These levels form because of human psychology — traders remember where prices were and make decisions based on those memories.",
      "If Apple has bounced off $170 three times in the past year, then $170 is strong support. Traders expect it to hold again, creating a self-fulfilling prophecy. When support breaks, it often becomes resistance.",
      "A breakout occurs when the stock price moves decisively above a resistance level — often on high volume. Breakouts can signal the start of a new, sustained move higher. A breakdown is the opposite — falling through support with conviction.",
      "Support and resistance levels are more art than science. Round numbers (like $100 or $500) often act as psychological support/resistance. So do 52-week highs, prior earnings gaps, and moving averages.",
    ],
    eli10: [
      "Think of support as a trampoline — every time the price falls to that level, it bounces back up. Resistance is like a ceiling — every time the price reaches it, it gets pushed back down.",
      "These levels form because lots of traders remember 'last time it hit $50, it bounced' — and they all buy at $50, which makes it bounce again.",
      "When a price breaks through resistance, it's a big deal — like punching through the ceiling. When it breaks through support, that's also a big deal — falling through the floor.",
    ],
    keyTerms: [
      { term: 'Support', definition: 'A price level where a stock tends to find buyers and stop falling.' },
      { term: 'Resistance', definition: 'A price level where sellers tend to appear and stop a stock from rising.' },
      { term: 'Breakout', definition: 'When price moves decisively above resistance — often a bullish signal.' },
      { term: 'Breakdown', definition: 'When price falls decisively below support — often a bearish signal.' },
    ],
    quiz: {
      question: 'A stock has bounced off $80 four times over the past year. What is $80 called?',
      options: ['Resistance', 'Support', 'A breakout level', 'A moving average'],
      correct: 1,
    },
  },

  {
    id: 'candlestick-basics',
    trackId: 'technical-analysis',
    title: 'Reading candlestick charts',
    subtitle: 'Every candle tells the story of a battle',
    emoji: '🕯️',
    readingMinutes: 4,
    body: [
      "A candlestick chart shows four pieces of information for each time period: the open price, close price, high price, and low price. The 'body' of the candle is between open and close. The 'wicks' extend to the high and low.",
      "Green (or white) candles mean the price closed higher than it opened — buyers won that period. Red (or black) candles mean the price closed lower than it opened — sellers won. At a glance, you can see the history of buying and selling pressure.",
      "Key patterns: A 'doji' has almost no body (open = close), showing indecision. A 'hammer' has a small body and a long lower wick — bulls pushed back after a big decline. A 'shooting star' is the opposite — a small body with a long upper wick after a rally, suggesting weakness.",
      "Patterns are more reliable over longer time frames (daily or weekly candles) and when they appear after a clear trend. A hammer after a sustained downtrend is more significant than a random hammer in the middle of nowhere.",
    ],
    eli10: [
      "Each candle in a candlestick chart is like a scoreboard for that day (or hour). Green = buyers won. Red = sellers won. The taller the candle, the more decisive the battle.",
      "The 'wick' sticking out from the top or bottom shows how far the price went before getting pushed back. A long lower wick means sellers tried to push it down but buyers fought back hard.",
      "Certain shapes of candles tell stories. A 'doji' (tiny body) means nobody won — total indecision. A 'hammer' (small body, long lower wick) after a big drop often means the falling is slowing.",
    ],
    keyTerms: [
      { term: 'Candlestick', definition: 'A chart element showing open, high, low, and close for a time period.' },
      { term: 'Doji', definition: 'A candle with almost no body — open and close are nearly equal. Signals indecision.' },
      { term: 'Hammer', definition: 'Small body + long lower wick. After a downtrend, often a reversal signal.' },
      { term: 'Wick', definition: 'The thin line above or below the candle body showing high/low range.' },
    ],
    quiz: {
      question: 'A green candlestick has a small body with a very long lower wick. What does this suggest?',
      options: ['Strong selling pressure', 'Sellers tried to push the price down but buyers pushed back', 'The stock will go to zero', 'Volume is very low'],
      correct: 1,
    },
  },

  {
    id: 'volume-analysis',
    trackId: 'technical-analysis',
    title: 'Volume analysis',
    subtitle: 'Price moves on conviction — volume tells you how much',
    emoji: '📊',
    readingMinutes: 3,
    body: [
      "Volume is the number of shares traded in a period. It's one of the most important — and most overlooked — technical indicators. Volume provides context for price moves. A 5% price jump means very different things at 2x normal volume versus 0.5x normal volume.",
      "High volume confirms a price move. If a stock breaks out to new highs on high volume, it suggests strong conviction behind the move — many buyers are committed. A breakout on low volume is suspicious and more likely to fail.",
      "Rising price + rising volume = healthy uptrend. Rising price + falling volume = the move may be losing steam. Falling price + rising volume = strong selling pressure. Falling price + falling volume = the selling may be slowing.",
      "Volume spikes (unusually high volume in a single day) often signal important events — earnings surprises, news, or institutional buying or selling. Watch for volume spikes as potential turning points.",
    ],
    eli10: [
      "Volume is how many people are trading the stock today. A crowd of 10,000 pushing a price up is more convincing than 50 people doing the same thing.",
      "High volume on a price move = the move is 'real' and backed by conviction. Low volume on a price move = might be a fake-out.",
      "Volume spike (suddenly way more trades than usual) usually means something important happened — good or bad news.",
    ],
    keyTerms: [
      { term: 'Volume', definition: 'Number of shares traded in a given period.' },
      { term: 'Volume confirmation', definition: 'When a price breakout is accompanied by above-average volume — adds credibility.' },
      { term: 'Volume spike', definition: 'An unusual surge in trading volume, often signaling a major event.' },
    ],
    quiz: {
      question: 'A stock breaks out to new highs but volume is 50% below average. This breakout is considered:',
      options: ['More reliable because fewer sellers', 'Less reliable — low volume suggests weak conviction', 'Guaranteed to continue', 'A sign of a bear market'],
      correct: 1,
    },
  },

  {
    id: 'chart-patterns',
    trackId: 'technical-analysis',
    title: 'Common chart patterns',
    subtitle: 'Shapes that repeat in markets throughout history',
    emoji: '🎨',
    readingMinutes: 4,
    body: [
      "Markets are driven by human psychology, and human psychology tends to repeat. As a result, certain price patterns appear over and over — and experienced traders use them to anticipate future moves.",
      "Head and Shoulders is one of the most reliable reversal patterns. The stock makes a peak (left shoulder), a higher peak (head), then a lower peak (right shoulder). Breaking below the 'neckline' connecting the lows is a bearish signal.",
      "Cup and Handle is a continuation pattern. The stock dips in a rounded U-shape (the cup), then consolidates slightly (the handle), then breaks out higher. William O'Neil popularized this pattern for growth stocks.",
      "Triangles (ascending, descending, and symmetrical) form when price makes a series of higher lows and lower highs, squeezing toward a point. Eventually the stock breaks out — usually in the direction of the prior trend. These patterns often precede significant moves.",
    ],
    eli10: [
      "Chart patterns are like shapes that keep appearing because people keep making the same emotional decisions. Recognizing the shape can help you guess what might happen next.",
      "Head and Shoulders = a mountain range shape. When you see it after a big rally, it often means the uptrend is ending.",
      "Cup and Handle = like a tea cup. The round bottom is the 'cup' and the small dip before the breakout is the 'handle.' When it breaks up from the handle, it's often a buy signal.",
    ],
    keyTerms: [
      { term: 'Head and Shoulders', definition: 'A reversal pattern with three peaks. Breaking the neckline = bearish signal.' },
      { term: 'Cup and Handle', definition: 'A bullish continuation pattern shaped like a tea cup.' },
      { term: 'Triangle pattern', definition: 'Converging trendlines creating a squeeze before a breakout.' },
      { term: 'Neckline', definition: 'The support line in a Head and Shoulders pattern.' },
    ],
    quiz: {
      question: 'A Head and Shoulders pattern breaks below its neckline. What do technical analysts typically expect next?',
      options: ['A rally to new highs', 'Continued downward pressure', 'A volume dip', 'No change in trend'],
      correct: 1,
    },
  },

  {
    id: 'when-technicals-fail',
    trackId: 'technical-analysis',
    title: 'When technicals fail',
    subtitle: 'News and fundamentals can override any chart',
    emoji: '💥',
    readingMinutes: 3,
    body: [
      "Technical analysis is a powerful tool — but it has limits. The most important: breaking news can override any pattern instantly. A perfect cup-and-handle setup becomes irrelevant if the company announces a fraud investigation the next morning.",
      "Technical analysis describes patterns from the past. It extrapolates them into the future based on how humans tend to behave. But markets are complex adaptive systems — any signal that becomes widely known tends to become less reliable as traders all try to front-run it.",
      "The most effective approaches combine technical and fundamental analysis. Use fundamentals to identify good businesses at reasonable prices. Use technicals to time your entry and exit — when to buy, when to sell, where to put your stop loss.",
      "Avoid the trap of 'confirmation bias' — looking at a chart and seeing only the pattern that supports what you already believe. Always ask: what would have to happen for this setup to fail? Prepare for both outcomes.",
    ],
    eli10: [
      "Charts can't predict breaking news. If a company announces something huge — good or bad — the stock can move in ways no chart could have predicted.",
      "Technicals work on probabilities, not certainties. Even the best pattern fails sometimes. Always have a plan for when it doesn't work.",
      "The best investors use BOTH charts (technicals) AND company research (fundamentals). Charts tell you when. Fundamentals tell you what.",
    ],
    keyTerms: [
      { term: 'Fundamental analysis', definition: 'Evaluating a stock based on company financials, earnings, and business quality.' },
      { term: 'Confirmation bias', definition: 'Seeing only evidence that confirms what you already believe.' },
      { term: 'Stop loss', definition: 'A pre-set exit point that limits how much you can lose on a trade.' },
    ],
    quiz: {
      question: 'A stock forms a perfect bullish chart pattern but then announces terrible earnings. What most likely happens?',
      options: ['The chart pattern plays out as expected', 'The earnings news overrides the chart pattern', 'Volume drops to zero', 'The pattern becomes more reliable'],
      correct: 1,
    },
  },

  // ─── TRACK 4: Options 101 ────────────────────────────────────────────────────

  {
    id: 'what-is-an-option',
    trackId: 'options-101',
    title: 'What is an option?',
    subtitle: 'The right, but not the obligation, to buy or sell',
    emoji: '⚡',
    readingMinutes: 4,
    body: [
      "An option is a contract that gives you the right — but not the obligation — to buy or sell 100 shares of a stock at a specific price, before a specific date. Options are powerful tools: you can use them to speculate, hedge, or generate income.",
      "Think of a real estate analogy: you pay $5,000 for the right to buy a house for $200,000 within 6 months. If the house rises to $250,000, you exercise your option, buy at $200k, and profit $50k (minus the $5k you paid). If the house falls to $180k, you let the option expire and only lose the $5,000.",
      "One key concept: each options contract controls 100 shares. So an option priced at $3.00 costs $300 in total (3 × 100). This creates leverage — a small move in the stock can produce a large percentage change in the option's value.",
      "Options expire. Unlike stocks, which you can hold forever, every option has an expiration date. After that date, the option is worthless if not exercised. This time limit is crucial to understand before trading options.",
    ],
    eli10: [
      "An option is like paying a small deposit to reserve the right to buy something at today's price — even if prices go up. If prices go down, you don't have to buy. You just lose the deposit.",
      "The cool thing: you only risk what you paid for the option. The bad thing: if nothing happens by the expiration date, you lose your deposit completely.",
      "Each option contract covers 100 shares. So even a cheap-looking option price gets multiplied by 100.",
    ],
    keyTerms: [
      { term: 'Option contract', definition: 'The right (not obligation) to buy or sell 100 shares at a set price before a set date.' },
      { term: 'Premium', definition: 'The price you pay for an option contract.' },
      { term: 'Expiration date', definition: 'The last day an option can be exercised. After this, it expires worthless.' },
      { term: 'Exercise', definition: "Using your option to buy (or sell) the stock at the agreed-upon price." },
    ],
    quiz: {
      question: 'You buy an option contract priced at $2.50. How much do you actually pay in total?',
      options: ['$2.50', '$25', '$250', '$2,500'],
      correct: 2,
    },
  },

  {
    id: 'calls-and-puts',
    trackId: 'options-101',
    title: 'Calls and puts',
    subtitle: 'Betting on up or down with limited risk',
    emoji: '📞',
    readingMinutes: 4,
    body: [
      "There are only two types of options: calls and puts. A call option gives you the right to BUY shares at the strike price. You buy calls when you expect the stock to go UP. A put option gives you the right to SELL shares at the strike price. You buy puts when you expect the stock to go DOWN.",
      "Example: Apple is at $180. You buy a call option with a $185 strike price expiring in 30 days, paying $3 ($300 total). If Apple rises to $195, your option is now worth at least $10 — a profit of $7 (233%) on your $300 investment. But if Apple stays below $185, your option expires worthless and you lose the $300.",
      "Puts work the opposite way. You buy a put with a $175 strike price on Apple at $180. If Apple drops to $160, your put (the right to sell at $175) is now worth at least $15. You profit. If Apple stays above $175, the put expires worthless.",
      "Key insight: buyers of calls and puts have defined risk. The maximum you can lose is the premium you paid. This is very different from shorting stocks, where potential losses are theoretically unlimited.",
    ],
    eli10: [
      "CALL = you think the stock will GO UP. PUT = you think the stock will GO DOWN. Easy memory trick: CALL up a friend (up). PUT it down (down).",
      "When you buy a call: if the stock goes way up, you make a lot. If it doesn't reach your target price, you lose what you paid for the option.",
      "The best thing about buying options: you can never lose more than what you paid. The worst thing: most options expire worthless.",
    ],
    keyTerms: [
      { term: 'Call option', definition: 'The right to BUY 100 shares at the strike price. Profits when stock rises.' },
      { term: 'Put option', definition: 'The right to SELL 100 shares at the strike price. Profits when stock falls.' },
      { term: 'Strike price', definition: 'The price at which you can buy (call) or sell (put) the shares.' },
    ],
    quiz: {
      question: 'You believe a stock will fall sharply next month. Which option do you buy?',
      options: ['A call option', 'A put option', 'A dividend option', 'A futures contract'],
      correct: 1,
    },
  },

  {
    id: 'strike-price-expiration',
    trackId: 'options-101',
    title: 'Strike price and expiration',
    subtitle: 'The two key ingredients of every option',
    emoji: '📅',
    readingMinutes: 3,
    body: [
      "Every option has two critical variables: the strike price and the expiration date. The strike price is the agreed-upon price you can buy (call) or sell (put) the stock. The expiration date is the deadline — after that, the option is worthless.",
      "Strike price selection is about how much risk and leverage you want. Options with strikes near the current stock price (at-the-money) cost more but have a higher probability of profiting. Options far from the current price (out-of-the-money) are cheaper but are less likely to pay off.",
      "Expiration selection is about time. Longer-dated options give the stock more time to move in your direction — but they cost more. Shorter-dated options are cheaper but carry more risk of expiring worthless if the move doesn't happen fast enough.",
      "A common mistake for beginners: buying cheap out-of-the-money options with short expirations. These look attractive because they're inexpensive and offer huge potential gains — but they expire worthless the vast majority of the time.",
    ],
    eli10: [
      "Strike price = the target price you're betting on. Expiration = the deadline you have to be right by.",
      "Options close to today's price cost more but are more likely to work. Options far from today's price are cheap bets that rarely pay off.",
      "Longer expiration = more time to be right. Shorter expiration = cheaper but riskier.",
    ],
    keyTerms: [
      { term: 'At-the-money (ATM)', definition: "An option with a strike price near the current stock price." },
      { term: 'Out-of-the-money (OTM)', definition: "An option that would be worthless if exercised today — strike price is unfavorable." },
      { term: 'In-the-money (ITM)', definition: "An option that has intrinsic value — can be profitably exercised today." },
    ],
    quiz: {
      question: "Apple is at $180. You have a call option with a $175 strike price. Is this option in, at, or out of the money?",
      options: ['Out of the money', 'At the money', 'In the money', 'Cannot be determined'],
      correct: 2,
    },
  },

  {
    id: 'what-is-premium',
    trackId: 'options-101',
    title: 'Understanding option premium',
    subtitle: 'What makes an option expensive or cheap?',
    emoji: '💰',
    readingMinutes: 4,
    body: [
      "The premium is what you pay to buy an option. It has two components: intrinsic value and time value. Intrinsic value is how much the option would be worth if exercised right now. Time value is the extra amount paid for the possibility the option will gain more value before expiration.",
      "An Apple call at $175 when Apple is $185 has $10 of intrinsic value (you can buy at $175 and immediately sell at $185). If the premium is $12, then $2 is time value — the market's estimate of how much more it could be worth by expiration.",
      "Implied Volatility (IV) is the biggest driver of time value. When the market expects big price swings — around earnings, for example — IV rises, making options more expensive. After the event passes and uncertainty resolves, IV often 'crushes' (drops), destroying the time value even if the stock moved in your direction.",
      "This 'IV crush' is one of the most common reasons beginners lose money buying options through earnings. The stock moves as predicted, but the option barely profits because the implied volatility that inflated the premium collapsed.",
    ],
    eli10: [
      "Premium = what you pay for the option. Part of that is the 'real' value today (intrinsic). Part is hope for tomorrow (time value).",
      "Options get more expensive when big news is coming (like earnings) because the market expects big price swings. After the news, that extra 'excitement premium' disappears.",
      "IV crush = you were right about which way the stock moved, but still lost money because you overpaid for excitement that evaporated.",
    ],
    keyTerms: [
      { term: 'Option premium', definition: 'The total price paid for an option contract.' },
      { term: 'Intrinsic value', definition: "What the option is worth if exercised right now." },
      { term: 'Time value', definition: 'The portion of premium above intrinsic value — reflects time until expiration.' },
      { term: 'Implied Volatility (IV)', definition: "The market's expectation of future price swings, embedded in the option's price." },
    ],
    quiz: {
      question: 'Options tend to become more expensive right before earnings because:',
      options: ['The stock always goes up before earnings', 'Implied volatility rises due to uncertainty about the outcome', 'The strike price changes', 'Options have no time value'],
      correct: 1,
    },
  },

  {
    id: 'the-greeks-intro',
    trackId: 'options-101',
    title: 'The Greeks: Delta, Theta, Vega',
    subtitle: 'How options prices change with the market',
    emoji: '🔬',
    readingMinutes: 4,
    body: [
      "The Greeks are measures that describe how an option's price changes in response to different market factors. You don't need to be a mathematician to use them — understanding the basics will make you a much smarter options trader.",
      "Delta measures how much an option's price moves for each $1 move in the stock. A call with delta 0.50 gains $0.50 when the stock rises $1. Delta ranges from 0 to 1 for calls (0 to -1 for puts). Delta also approximates the probability the option will expire in-the-money.",
      "Theta is time decay — the amount the option loses per day just from the passage of time. Options lose value every day as expiration approaches, all else being equal. Theta works against buyers but in favor of option sellers.",
      "Vega measures sensitivity to implied volatility. High-vega options profit when volatility increases (and lose when it decreases). This is why buying options before earnings can be risky — if IV is already elevated, Vega will hurt you if IV falls after the announcement.",
    ],
    eli10: [
      "The Greeks are just names for 'what makes this option's price go up or down?' Instead of reading a long formula, you check the Greek number.",
      "Delta = how much does the option move if the stock moves $1? High delta = options moves almost like the stock. Low delta = barely moves.",
      "Theta = how much does the option lose each day just from time passing? Like an ice cube melting — options are always 'melting' toward expiration.",
    ],
    keyTerms: [
      { term: 'Delta', definition: "How much the option's price changes per $1 move in the stock. Also approximates probability of expiring in-the-money." },
      { term: 'Theta', definition: "Daily time decay — how much value an option loses each day, all else equal." },
      { term: 'Vega', definition: "Sensitivity to implied volatility. High vega = big impact from IV changes." },
    ],
    quiz: {
      question: 'An option has a theta of -$0.05. What does this mean?',
      options: ['The option gains $0.05 per day', 'The option loses $0.05 per day from time decay', 'The stock moves $0.05 per day', "The option's delta is $0.05"],
      correct: 1,
    },
  },

  {
    id: 'covered-calls',
    trackId: 'options-101',
    title: 'Covered calls: earning income from stocks you own',
    subtitle: 'How to make your portfolio work harder',
    emoji: '🎁',
    readingMinutes: 4,
    body: [
      "A covered call is when you own 100 shares of a stock and sell (write) a call option against those shares. You collect the premium immediately. In exchange, you cap your upside — if the stock rises above your strike price, the shares get 'called away' at that price.",
      "Example: You own 100 shares of Microsoft at $400. You sell a call with a $415 strike expiring in 30 days for $3 ($300 in premium). Three outcomes: Stock stays below $415 — you keep $300 and still own the shares. Stock rises to $430 — you sell at $415, keeping the $300 premium but missing gains above $415. Stock falls — you still own shares at a loss, but your $300 cushions it.",
      "Covered calls are one of the most conservative options strategies and are allowed in most retirement accounts. They're best for stocks you're comfortable holding long-term but don't expect to skyrocket short-term.",
      "The risk: if the stock surges dramatically (say, a buyout at $500), you miss most of that gain. The covered call caps your maximum profit. In exchange for that cap, you get steady premium income month after month.",
    ],
    eli10: [
      "A covered call is like renting out your car for a month. You get paid rent (the premium). If you agree to sell the car at a set price and someone wants to buy it — you have to sell. But you already got paid rent.",
      "Best used when: you own shares and you don't think they'll shoot up anytime soon. You collect regular income while waiting.",
      "Risk: if the stock suddenly doubles, you're stuck selling at the price you agreed on. You miss the extra gain.",
    ],
    keyTerms: [
      { term: 'Covered call', definition: 'Selling a call option against shares you already own — generates income, limits upside.' },
      { term: 'Called away', definition: 'When a covered call is exercised and you must sell your shares at the strike price.' },
      { term: 'Premium income', definition: 'Cash received from selling options — collected immediately regardless of outcome.' },
    ],
    quiz: {
      question: 'You own 100 shares of a stock at $50 and sell a $55 call for $2 premium. The stock rises to $60. What happens?',
      options: ['You profit $10/share + $2 premium', 'Your shares are called away at $55, but you keep the $2 premium', 'You lose everything', 'Nothing — only call buyers benefit'],
      correct: 1,
    },
  },

  {
    id: 'protective-puts',
    trackId: 'options-101',
    title: 'Protective puts: portfolio insurance',
    subtitle: 'How to protect gains without selling your stock',
    emoji: '🛡️',
    readingMinutes: 3,
    body: [
      "A protective put is when you own shares and buy a put option to protect against a large decline. It's essentially portfolio insurance — you pay a premium to cap your potential loss.",
      "Example: You own Tesla at $250 and are worried about a market correction. You buy a put with a $220 strike for $5 ($500). If Tesla crashes to $180, your put lets you sell at $220 — limiting your loss to $30/share + $5 premium instead of $70/share.",
      "The cost of protection varies with the level of fear in the market. When the VIX is high (fearful market), puts are expensive. When the VIX is low (calm market), puts are cheaper — a good time to buy insurance.",
      "Protective puts are often used by portfolio managers to hedge concentrated positions or before earnings announcements. For individual investors, they're useful when you have large gains in a stock you'd rather hold but want to protect.",
    ],
    eli10: [
      "A protective put is like car insurance for your stock. You pay a small amount each month. If something terrible happens (the stock crashes), the insurance pays out.",
      "You don't sell the stock — you still own it. But you have protection if it falls below a certain level.",
      "The cost: the premium you pay for the put. If the stock never crashes, you lose that premium — just like unused insurance.",
    ],
    keyTerms: [
      { term: 'Protective put', definition: 'Buying a put option on shares you own — caps your downside loss.' },
      { term: 'Portfolio insurance', definition: 'Using puts to protect a stock portfolio against large declines.' },
      { term: 'Hedge', definition: 'An investment that reduces the risk of an adverse price movement.' },
    ],
    quiz: {
      question: 'You own a stock at $100 and buy a protective put at a $90 strike for $3. The stock falls to $70. What is your maximum loss per share?',
      options: ['$30', '$13', '$70', '$3'],
      correct: 1,
    },
  },

  {
    id: 'options-risk-management',
    trackId: 'options-101',
    title: 'Options risk management',
    subtitle: 'Why most options expire worthless — and what to do about it',
    emoji: '⚖️',
    readingMinutes: 4,
    body: [
      "Statistics are sobering: studies show that roughly 70-80% of options held to expiration expire worthless. Buying options isn't a get-rich-quick scheme — it requires getting the direction, timing, AND magnitude of the move right.",
      "The biggest mistake beginners make: buying cheap out-of-the-money options with short expiration. These lottery tickets are exciting but rarely pay off. When they do, it's memorable. The many times they don't is quickly forgotten. This is called 'results-oriented thinking' — judging a strategy by its occasional wins, not its overall expected value.",
      "Professional options traders often focus on SELLING options rather than buying — collecting premium as their business model and managing risk with defined spreads. This is a more consistent strategy, but it requires more capital and discipline.",
      "If you're going to buy options, use strict position sizing: never risk more than 1-2% of your total portfolio on any single options trade. Use longer-dated options (60-90 days out) to give yourself time. And always define your exit plan before you enter — both for profits and for losses.",
    ],
    eli10: [
      "Most options expire worthless. This doesn't mean options are bad — it means you need to be smart about them. Don't spend money you can't afford to lose.",
      "Cheap options that look like they could 10x are usually cheap for a reason — they almost never work.",
      "Professional rule: never risk more than 1-2% of what you have on a single options trade. This way, even if you're wrong, you stay in the game.",
    ],
    keyTerms: [
      { term: 'Expiring worthless', definition: 'When an option reaches its expiration date with no intrinsic value — a total loss for the buyer.' },
      { term: 'Expected value', definition: 'The average outcome across all possible scenarios — what truly matters in trading.' },
      { term: 'Defined risk spread', definition: 'An options strategy that caps both maximum gain and maximum loss.' },
    ],
    quiz: {
      question: 'Approximately what percentage of options held to expiration expire worthless?',
      options: ['10-20%', '30-40%', '70-80%', '99%'],
      correct: 2,
    },
  },

  // ─── TRACK 5: Macro & Economy ────────────────────────────────────────────────

  {
    id: 'what-is-inflation',
    trackId: 'macro-economy',
    title: 'What is inflation?',
    subtitle: "Why $100 buys less each year — and what it means for stocks",
    emoji: '💹',
    readingMinutes: 4,
    body: [
      "Inflation is the rate at which prices rise over time. If inflation is 3%, then something that costs $100 today will cost $103 next year. The Federal Reserve tracks inflation using the Consumer Price Index (CPI) — a basket of everyday goods and services.",
      "Moderate inflation (1-3%) is healthy and normal in a growing economy. It encourages spending (why hold cash if it loses value?) and gives companies room to raise prices. But high inflation (above 5-6%) erodes purchasing power and can destabilize an economy.",
      "For stock investors, inflation has complex effects. Companies that can raise prices quickly (think consumer staples, energy, real estate) tend to perform better. Tech and growth stocks — which are valued on future earnings far in the future — often suffer because inflation makes those future earnings worth less in today's dollars.",
      "The most dangerous scenario is 'stagflation' — high inflation combined with slow economic growth. This happened in the 1970s and was devastating for both stocks and bonds. Understanding inflation helps you build a portfolio that can survive different economic environments.",
    ],
    eli10: [
      "Inflation is why a movie ticket costs $15 now when it cost $5 in 1990. Money slowly buys less stuff over time.",
      "A little inflation is normal and even good. A lot of inflation is bad — your savings buy less and less.",
      "Some stocks do well during inflation (like oil companies and real estate). Others do badly (like tech companies that won't be profitable for years).",
    ],
    keyTerms: [
      { term: 'Inflation', definition: 'The rate at which prices rise over time, eroding purchasing power.' },
      { term: 'CPI (Consumer Price Index)', definition: 'The main measure of inflation — tracks prices of everyday goods and services.' },
      { term: 'Stagflation', definition: 'The worst of both worlds: high inflation AND slow economic growth.' },
      { term: 'Purchasing power', definition: 'How much real stuff a dollar (or any currency) can actually buy.' },
    ],
    quiz: {
      question: 'Inflation is currently 7%. Which type of stock typically performs best in this environment?',
      options: ['High-growth tech companies with no profits', 'Energy companies that can raise prices', 'Bond-like dividend stocks', 'Cryptocurrency'],
      correct: 1,
    },
  },

  {
    id: 'interest-rates-and-stocks',
    trackId: 'macro-economy',
    title: 'Interest rates and stocks',
    subtitle: 'The most important relationship in investing',
    emoji: '🏦',
    readingMinutes: 4,
    body: [
      "Interest rates are arguably the single most important macro factor affecting stock prices. When rates rise, borrowing becomes more expensive for companies, consumers slow their spending, and bonds become more attractive competitors to stocks. When rates fall, the opposite happens.",
      "The relationship between rates and growth stocks is particularly strong. Growth stocks are valued based on future earnings discounted back to today. Higher interest rates mean those future earnings are worth less today — so the stock price must fall to compensate. This is why high-growth tech stocks fell 50-70% in 2022 when the Fed aggressively raised rates.",
      "Value stocks and financials (banks) often do better in rising rate environments. Banks make more money on the spread between what they pay on deposits and what they charge on loans. Value stocks have earnings today, not in the future, so they're less sensitive to discounting effects.",
      "The yield on 10-year US Treasury bonds is the benchmark 'risk-free rate.' When it rises, investors demand higher returns from stocks to compensate for the extra risk. This 'competition' from bonds pushes stock prices down and their earnings yields up.",
    ],
    eli10: [
      "Think of interest rates as the price of borrowing money. When that price is high, everyone borrows less — companies spend less, people buy fewer houses, and the economy slows down.",
      "Higher rates = future company profits are worth less today = growth stocks fall. Lower rates = future profits are worth more today = growth stocks rise.",
      "Banks love higher interest rates because they charge higher rates on loans. Many other companies hate it because it costs more to borrow.",
    ],
    keyTerms: [
      { term: 'Interest rate', definition: 'The cost of borrowing money, set by central banks and markets.' },
      { term: 'Discount rate', definition: 'The rate used to calculate what future cash flows are worth today. Higher rate = lower present value.' },
      { term: '10-year Treasury yield', definition: "The return on 10-year US government bonds — the benchmark 'risk-free rate.'" },
    ],
    quiz: {
      question: 'The Federal Reserve raises interest rates sharply. Which type of stock is most likely to fall the hardest?',
      options: ['Bank stocks', 'Energy companies', 'High-growth tech stocks with no current profits', 'Grocery chains'],
      correct: 2,
    },
  },

  {
    id: 'what-is-the-fed',
    trackId: 'macro-economy',
    title: "The Federal Reserve: what it is and why it matters",
    subtitle: "The most powerful financial institution in the world",
    emoji: '🏛️',
    readingMinutes: 4,
    body: [
      "The Federal Reserve (the Fed) is the central bank of the United States. It has two main jobs: keep inflation under control, and keep unemployment low. To achieve these goals, it primarily uses interest rates — specifically the federal funds rate, which influences borrowing costs across the entire economy.",
      "When the economy overheats (inflation rises), the Fed raises interest rates to slow things down. Higher rates make borrowing expensive, reducing spending and investment, which cools inflation. When the economy contracts (recession risk), the Fed lowers rates to stimulate borrowing and spending.",
      "The Fed also conducts 'quantitative easing' (QE) — buying bonds to inject money into the financial system. This was used aggressively during the 2008 crisis and 2020 COVID pandemic. QE tends to boost asset prices, including stocks.",
      "FOMC meetings (Federal Open Market Committee) happen 8 times per year. The Fed Chair (Jerome Powell as of 2024) announces rate decisions afterward. Markets move sharply based on Fed decisions and comments. 'Don't fight the Fed' is one of investing's most enduring rules.",
    ],
    eli10: [
      "The Fed is like the traffic cop of the economy. When things are moving too fast (inflation going crazy), they raise rates to slow it down. When things are stuck (recession), they lower rates to speed it up.",
      "The Fed's most important tool: the interest rate. They lower it to help the economy grow. They raise it to cool down inflation.",
      "When the Fed speaks, the whole market listens. Their decisions can move stocks up or down by 2-3% in minutes.",
    ],
    keyTerms: [
      { term: 'Federal Reserve (Fed)', definition: 'The US central bank — controls monetary policy and interest rates.' },
      { term: 'Federal funds rate', definition: 'The key interest rate the Fed controls — influences all other borrowing costs.' },
      { term: 'Quantitative easing (QE)', definition: 'The Fed buying bonds to inject money into the economy and lower rates.' },
      { term: 'FOMC', definition: 'Federal Open Market Committee — meets 8x/year to vote on interest rate decisions.' },
    ],
    quiz: {
      question: "The Fed wants to combat rising inflation. What is its most likely action?",
      options: ['Lower interest rates', 'Raise interest rates', 'Buy more bonds (QE)', 'Print more money'],
      correct: 1,
    },
  },

  {
    id: 'gdp-and-markets',
    trackId: 'macro-economy',
    title: 'GDP and market cycles',
    subtitle: 'Reading the economy to position your portfolio',
    emoji: '🌐',
    readingMinutes: 3,
    body: [
      "GDP (Gross Domestic Product) is the total value of all goods and services produced in a country. It's the broadest measure of economic health. When GDP is growing, companies generally do well — which helps stock prices. When GDP shrinks for two consecutive quarters, it's officially called a recession.",
      "Markets are forward-looking — they often move 6-12 months ahead of the actual economy. The stock market usually starts falling months before a recession officially begins, and starts recovering months before the recession officially ends. This is why trying to 'wait for the economy to improve' before buying stocks often means buying at the top.",
      "Economic cycles have four phases: expansion (growth), peak (top of growth), contraction (slowdown/recession), and trough (bottom). Different sectors perform better in different phases — consumer staples during contraction, industrials during expansion, financials during early recovery.",
      "Leading economic indicators (like building permits, stock prices, and consumer confidence) try to predict where the economy is heading. Lagging indicators (like unemployment rate) confirm what's already happened. Investors focus on leading indicators to stay ahead of the cycle.",
    ],
    eli10: [
      "GDP is like the economy's report card. Growing GDP = the country is doing well. Shrinking GDP for two quarters in a row = recession.",
      "The stock market predicts the future — it starts falling before a recession and starts rising before the recovery. So by the time everyone knows it's a recession, the market may already be coming back.",
      "Different types of companies do better at different times. During a recession, people still buy food and medicine — so those stocks hold up. During a boom, luxury goods and industrial companies do great.",
    ],
    keyTerms: [
      { term: 'GDP', definition: 'Total value of all goods and services produced in a country — the main economic measure.' },
      { term: 'Recession', definition: 'Two consecutive quarters of negative GDP growth — a contraction period.' },
      { term: 'Economic cycle', definition: 'The recurring pattern of expansion, peak, contraction, and trough.' },
      { term: 'Leading indicator', definition: 'A data point that tends to change before the economy changes.' },
    ],
    quiz: {
      question: 'GDP contracts for two consecutive quarters. What is this called?',
      options: ['An expansion', 'A bull market', 'A recession', 'Quantitative easing'],
      correct: 2,
    },
  },

  {
    id: 'jobs-report-explained',
    trackId: 'macro-economy',
    title: 'The jobs report explained',
    subtitle: 'Why employment data moves markets every month',
    emoji: '📊',
    readingMinutes: 3,
    body: [
      "On the first Friday of every month, the Bureau of Labor Statistics releases the Jobs Report — officially called the Employment Situation Summary. It's one of the most market-moving economic reports released, capable of sending stocks up or down 1-2% immediately.",
      "The headline number everyone watches: Non-Farm Payrolls (NFP) — the net number of jobs added to the economy (excluding farm workers and government). A strong jobs report (say, +250,000 jobs) signals a healthy economy. A weak one signals potential slowdown.",
      "The unemployment rate is the percentage of the workforce actively looking for work but unable to find it. But it's often less important than NFP because it can fall for bad reasons — people giving up looking for work and leaving the labor force entirely.",
      "Wages data matters enormously for inflation. If wages are rising fast, that feeds into inflation — and pressures the Fed to raise rates. This creates the strange dynamic where 'too many jobs' can actually be bad for stocks in the short term, because it implies higher rates ahead.",
    ],
    eli10: [
      "The jobs report is a monthly count of how many people got hired vs. fired. More jobs = economy is healthy. Fewer jobs = economy might be struggling.",
      "It comes out every first Friday of the month at 8:30 AM Eastern. Stock markets sometimes jump or drop right when it's released.",
      "Weird but true: sometimes TOO many jobs is bad for stocks. That's because it means the Fed might raise interest rates to slow things down.",
    ],
    keyTerms: [
      { term: 'Non-Farm Payrolls (NFP)', definition: 'The monthly change in total employed persons, excluding farm and government workers.' },
      { term: 'Unemployment rate', definition: 'Percentage of the workforce actively looking for work but not employed.' },
      { term: 'Wage growth', definition: 'Rate at which average worker pay is increasing — a key inflation driver.' },
    ],
    quiz: {
      question: 'The jobs report shows 400,000 new jobs added — far above the 200,000 expected. How might this affect the Fed?',
      options: ['The Fed will likely lower rates to celebrate', 'The Fed may feel pressure to raise rates to cool the hot labor market', 'The Fed will stop meeting', "Jobs data doesn't affect the Fed"],
      correct: 1,
    },
  },

  {
    id: 'sectors-of-the-economy',
    trackId: 'macro-economy',
    title: 'The 11 market sectors',
    subtitle: 'How to think about where to invest',
    emoji: '🗺️',
    readingMinutes: 4,
    body: [
      "The stock market is divided into 11 sectors by GICS (Global Industry Classification Standard). Each sector contains companies with similar business models that tend to move together. Understanding sectors helps you diversify strategically.",
      "Defensive sectors (Consumer Staples, Healthcare, Utilities) provide goods and services people need regardless of the economy — food, medicine, electricity. These hold up better in recessions. Cyclical sectors (Consumer Discretionary, Industrials, Materials) boom when the economy is strong and suffer when it weakens.",
      "Technology is the largest sector by market cap in the US, comprising roughly 30% of the S&P 500. This concentration means the overall market heavily follows big tech — Apple, Microsoft, Nvidia, Google, and Amazon together make up over 20% of the S&P 500 alone.",
      "Sector rotation is the strategy of moving money between sectors based on the economic cycle. Early cycle: Financials and Consumer Discretionary. Mid cycle: Technology and Industrials. Late cycle: Energy and Materials. Recession: Healthcare and Consumer Staples. This is a useful framework, though timing it perfectly is very difficult.",
    ],
    eli10: [
      "The 11 sectors are like neighborhoods in the market city. Technology, Healthcare, Finance, Energy, Consumer Staples, Consumer Discretionary, Utilities, Real Estate, Materials, Industrials, and Communication Services.",
      "Defensive sectors (healthcare, utilities, staples) are where you hide when storms hit — people always need medicine and electricity.",
      "Cyclical sectors (tech, consumer discretionary) boom in good times but suffer more in bad times.",
    ],
    keyTerms: [
      { term: 'Market sector', definition: 'A group of companies with similar business activities — there are 11 in the S&P 500.' },
      { term: 'Defensive sector', definition: 'Sectors that hold up well in recessions because demand is stable (food, healthcare, utilities).' },
      { term: 'Sector rotation', definition: 'Moving money between sectors based on where we are in the economic cycle.' },
    ],
    quiz: {
      question: 'During a recession, which sector tends to perform the best?',
      options: ['Consumer Discretionary (luxury goods)', 'Technology', 'Consumer Staples (food, household goods)', 'Materials (raw metals)'],
      correct: 2,
    },
  },

  {
    id: 'recession-indicators',
    trackId: 'macro-economy',
    title: 'Spotting recession risks',
    subtitle: 'Warning signs to watch in the economy',
    emoji: '🚨',
    readingMinutes: 4,
    body: [
      "No indicator perfectly predicts recessions, but several have historically been reliable warning signs. The most famous: yield curve inversion. This occurs when short-term Treasury bond yields (like the 2-year) exceed long-term yields (10-year). It has preceded every US recession since the 1970s.",
      "The yield curve inverts because investors expect the Fed to cut rates in the future (signaling economic weakness). When the 2-year yield is higher than the 10-year yield, the curve is 'inverted.' Importantly, recessions typically begin 12-24 months after inversion — so it's an early warning, not an immediate alarm.",
      "Other indicators to watch: credit spreads (the gap between corporate bond yields and Treasury yields — widens when companies are under stress), initial jobless claims (weekly unemployment filings — a spike signals layoffs), and the ISM Manufacturing Index (below 50 for several months signals contraction).",
      "The Conference Board's Leading Economic Index (LEI) aggregates 10 leading indicators into a single score. Six months of consecutive decline in LEI has historically preceded recessions. No single indicator is perfect — economic forecasting is genuinely hard, and many recessions are called only in hindsight.",
    ],
    eli10: [
      "The clearest recession warning signal: when short-term interest rates get HIGHER than long-term rates. This is called an 'inverted yield curve' and it's been right before every recent recession.",
      "Other warning signs: lots of people suddenly losing their jobs (jobless claims spike), credit card companies charging higher rates on corporate loans (credit spreads widening).",
      "No signal is perfect. Even experts often disagree on when the next recession will happen.",
    ],
    keyTerms: [
      { term: 'Yield curve inversion', definition: 'When short-term bond yields exceed long-term yields — historically a recession predictor.' },
      { term: 'Credit spread', definition: 'The extra yield corporate bonds pay above Treasuries — widens when risk rises.' },
      { term: 'Initial jobless claims', definition: 'Weekly count of new unemployment benefit applications — spike signals rising layoffs.' },
    ],
    quiz: {
      question: 'The 2-year Treasury yield rises above the 10-year Treasury yield. This is called:',
      options: ['A bull market signal', 'A yield curve inversion', 'Quantitative easing', 'A credit spread'],
      correct: 1,
    },
  },

  {
    id: 'global-market-forces',
    trackId: 'macro-economy',
    title: 'Global forces that move US markets',
    subtitle: "What happens abroad doesn't stay abroad",
    emoji: '🌍',
    readingMinutes: 3,
    body: [
      "US stocks don't operate in isolation. Global events — a war in Europe, an economic crisis in China, a political upset in a major oil-producing country — can ripple through to US markets within hours.",
      "China is the world's second-largest economy and a major trading partner. A Chinese economic slowdown hits US companies that sell goods there (Apple, Tesla) and commodities producers (copper and oil demand falls). In 2015-2016, a Chinese market crash helped drag US stocks down 10-15%.",
      "The US dollar's strength matters for multinational companies. A strong dollar makes US exports more expensive for foreign buyers, reducing revenue. About 40% of S&P 500 revenue comes from outside the US, so currency moves have significant impact.",
      "Geopolitical events — wars, sanctions, trade disputes — can spike commodity prices and create market volatility. The Russian invasion of Ukraine in 2022 sent oil and wheat prices soaring. US sanctions on China's chip industry affected the entire global semiconductor market.",
    ],
    eli10: [
      "The world economy is like a giant web. When one part breaks — like China having problems, or a war starting — other parts feel the shake.",
      "When the US dollar gets stronger, American companies that sell things abroad make less money in dollar terms. That hurts their profits.",
      "Oil is the economy's blood. Anything that affects oil prices (wars, OPEC decisions) affects almost every industry.",
    ],
    keyTerms: [
      { term: 'US dollar index (DXY)', definition: 'Measures the USD against a basket of foreign currencies — stronger dollar often hurts multinational earnings.' },
      { term: 'Geopolitical risk', definition: 'The risk that political events (wars, sanctions, elections) affect markets.' },
      { term: 'Commodity', definition: 'Raw materials like oil, gold, copper, or wheat that trade globally.' },
    ],
    quiz: {
      question: 'The US dollar strengthens significantly against the euro. How does this typically affect large US companies that sell in Europe?',
      options: ['Their European sales convert to more dollars, boosting profits', 'Their European sales convert to fewer dollars, reducing reported profits', 'No effect — currency doesn\'t matter', 'They stop selling in Europe'],
      correct: 1,
    },
  },

  // ─── CASE STUDIES ────────────────────────────────────────────────────────────

  {
    id: 'case-study-gamestop',
    trackId: 'market-basics',
    title: 'GameStop: The Short Squeeze',
    subtitle: 'How Reddit took on Wall Street — and won (for a while)',
    emoji: '🎮',
    readingMinutes: 5,
    type: 'case-study',
    body: [
      "In January 2021, GameStop (GME) was a struggling video game retailer. Large hedge funds had bet heavily that its stock would fall — a strategy called short selling. They borrowed and sold shares, hoping to buy them back cheaper later. Short interest was over 140% of the available float — an unusually extreme position.",
      "Reddit users on r/WallStreetBets noticed the extreme short position and coordinated buying to force a 'short squeeze.' When a stock rises sharply, short sellers face mounting losses and must buy shares to cover their positions — which forces the price even higher in a feedback loop.",
      "GameStop rose from around $20 to nearly $500 in a matter of days — a 2,400% move. Hedge fund Melvin Capital lost over $6 billion. Retail brokerage Robinhood controversially halted buying of GME, sparking widespread outrage and congressional hearings.",
      "The lesson: markets can behave irrationally in the short term. Sentiment, social media, and technical dynamics (like short squeezes) can drive prices wildly away from fundamental value. GameStop later returned to earth — eventually falling below $20 — but not before many retail investors who bought at the top lost most of their money.",
    ],
    eli10: [
      "GameStop is a video game store. Fancy investors bet it would go down. Then millions of people on Reddit bought the stock to mess with those bets — and it worked, temporarily.",
      "Short squeeze = everyone who bet the stock would fall now has to buy it (to stop losing money), which makes it go UP even more. It's a feedback loop.",
      "The lesson: markets can go crazy in the short term. GameStop was worth $500 briefly — it was NOT worth $500. Price and value are different things.",
    ],
    keyTerms: [
      { term: 'Short selling', definition: 'Borrowing and selling shares, betting the price will fall so you can buy them back cheaper.' },
      { term: 'Short squeeze', definition: 'When rising prices force short sellers to buy shares, driving the price even higher.' },
      { term: 'Short interest', definition: 'The percentage of shares sold short — high short interest can create squeeze conditions.' },
    ],
    quiz: {
      question: 'In a short squeeze, what forces short sellers to buy shares?',
      options: ['Regulatory requirements', 'Rising prices creating mounting losses on their short positions', 'Dividend payments', 'SEC investigations'],
      correct: 1,
    },
  },

  {
    id: 'case-study-2008',
    trackId: 'macro-economy',
    title: 'The 2008 Financial Crisis',
    subtitle: 'What caused the worst crash since the Great Depression',
    emoji: '🏚️',
    readingMinutes: 5,
    type: 'case-study',
    body: [
      "The 2008 financial crisis was triggered by the collapse of the US housing market. For years, banks had made reckless mortgage loans to people who couldn't afford them — 'subprime mortgages.' These were bundled into complex securities (CDOs) and sold around the world as if they were safe investments.",
      "When housing prices started falling in 2006-2007, homeowners defaulted on their loans. The CDOs that banks and investors held became nearly worthless. Bear Stearns and Lehman Brothers — two major investment banks — failed. Credit markets froze. Banks stopped lending to each other because nobody knew who held the toxic assets.",
      "The S&P 500 fell 57% from its October 2007 peak to the March 2009 trough. Unemployment rose to 10%. The US government injected $700 billion through the TARP bailout program and the Fed cut interest rates to near zero and began quantitative easing.",
      "Recovery came — eventually. The S&P 500 bottomed in March 2009 and went on to a record-breaking 11-year bull market. The key lessons: excessive leverage is dangerous, complex financial products can hide enormous risk, and even catastrophic crises eventually end. Those who held through the bottom or bought near the trough made extraordinary returns in the decade that followed.",
    ],
    eli10: [
      "Banks gave house loans to people who couldn't pay them back. They packaged these bad loans and sold them pretending they were good. When people stopped paying, the whole house of cards fell.",
      "The stock market fell by more than half. Millions of people lost jobs. It was the worst financial crisis since the Great Depression of the 1930s.",
      "But the market recovered. People who bought stocks at the bottom in 2009 made incredible returns over the next decade. The lesson: catastrophes end, and patient investors are rewarded.",
    ],
    keyTerms: [
      { term: 'Subprime mortgage', definition: 'A home loan made to a borrower with poor credit — high default risk.' },
      { term: 'CDO (Collateralized Debt Obligation)', definition: 'A complex security bundling many loans together — obscured the true risk.' },
      { term: 'Systemic risk', definition: 'Risk that one institution failing could topple the entire financial system.' },
      { term: 'TARP', definition: 'Troubled Asset Relief Program — the $700B government bailout of the banking system.' },
    ],
    quiz: {
      question: 'What was the primary trigger of the 2008 financial crisis?',
      options: ['A technology sector collapse', 'The collapse of the housing market and mortgage-backed securities', 'An oil price spike', 'Hyperinflation'],
      correct: 1,
    },
  },

  {
    id: 'case-study-dotcom',
    trackId: 'reading-companies',
    title: 'The Dotcom Bubble',
    subtitle: 'When the future was real but the prices were insane',
    emoji: '💻',
    readingMinutes: 4,
    type: 'case-study',
    body: [
      "In the late 1990s, the internet was new and investors were certain it would change everything. They were right. But they were also paying absurd prices for companies with no revenue, no profits, and often no real business plan — just a dot-com in the name.",
      "From 1995 to 2000, the Nasdaq rose 500%. Companies like Pets.com raised hundreds of millions, spent lavishly on advertising (including a Super Bowl ad), and went bankrupt within a year of their IPO. Cisco's market cap briefly exceeded $500 billion — making it the most valuable company in the world at the time.",
      "When the bubble burst between 2000 and 2002, the Nasdaq fell 78%. Amazon fell from $107 to $7. Google wasn't yet public. Many dot-com companies vanished entirely. Billions in investor wealth evaporated.",
      "The lesson isn't that the internet was wrong — it genuinely changed everything. The lesson is that a great idea at any price is still a bad investment. Amazon recovered from $7 and became one of history's greatest investments. But investors who bought at the top in 2000 didn't break even for over a decade. Valuation still matters, even for revolutionary companies.",
    ],
    eli10: [
      "In the late 1990s, everyone was sure the internet would make every company rich forever. So investors paid crazy prices for any company with '.com' in the name — even ones with no customers or products.",
      "When it became clear that most of these companies were just spending money and not making any, prices crashed. Amazon fell 95%. The Nasdaq lost 78% of its value.",
      "The internet DID change everything. But paying too much for even a real revolution is a bad investment. Amazon came back. Most dot-coms didn't.",
    ],
    keyTerms: [
      { term: 'Speculative bubble', definition: 'When asset prices rise far above fundamental value due to excitement and herd behavior.' },
      { term: 'Valuation', definition: "How much you're paying relative to what a company is actually worth." },
      { term: 'IPO (Initial Public Offering)', definition: 'When a private company sells shares to the public for the first time.' },
    ],
    quiz: {
      question: "Many dot-com companies in the 1990s had no revenue or profits but soared in price. What eventually happened?",
      options: ['They became the most valuable companies in history', 'The bubble burst and most went to zero', 'The government rescued them all', 'They merged into one giant tech company'],
      correct: 1,
    },
  },
];
