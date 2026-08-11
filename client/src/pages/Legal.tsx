import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

/**
 * The four legal pages share one layout, differing only in content.
 *
 * These are plain-English starting points, not lawyer-reviewed documents. They
 * cover what the app actually does today: accounts, read-only brokerage links
 * via Snaptrade, third-party market data, and AI-generated research.
 */

const UPDATED = 'August 2026';

type Section = { heading: string; body: string[] };

const DOCS: Record<string, { title: string; intro: string; sections: Section[] }> = {
  terms: {
    title: 'Terms of use',
    intro: 'These terms cover your use of EquityIQ. By creating an account you agree to them.',
    sections: [
      {
        heading: 'What EquityIQ is',
        body: [
          'EquityIQ is a research and portfolio-tracking tool. It shows market data, tracks holdings you add or import, and generates written analysis.',
          'It is not a broker, dealer, investment adviser, or financial institution. It does not hold your money, execute trades, or manage assets on your behalf.',
        ],
      },
      {
        heading: 'Not advice',
        body: [
          'Nothing in EquityIQ is investment, financial, legal, or tax advice. No output is a recommendation to buy or sell any security.',
          'Written analysis is produced by automated systems and can be wrong, incomplete, or out of date. Verify anything you plan to act on, and speak to a licensed professional about your own situation.',
        ],
      },
      {
        heading: 'Your account',
        body: [
          'Keep your password private and let us know if you believe your account has been accessed by someone else. You are responsible for activity under your account.',
          'You must be old enough to enter a binding contract where you live.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'Do not attempt to break, overload, or gain unauthorised access to the service or to other users\' data. Do not scrape or redistribute market data in breach of the providers\' terms.',
          'We may suspend accounts that put the service or other users at risk.',
        ],
      },
      {
        heading: 'Availability and liability',
        body: [
          'The service is provided as is. We do not guarantee uptime, accuracy, or that it will meet your needs.',
          'To the fullest extent the law allows, EquityIQ is not liable for investment losses or for any indirect or consequential loss arising from your use of the service.',
        ],
      },
      {
        heading: 'Changes',
        body: ['We may update these terms as the product changes. Continued use after an update means you accept the revised terms.'],
      },
    ],
  },

  privacy: {
    title: 'Privacy policy',
    intro: 'What we collect, why we collect it, and what we do not do with it.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Account details: your name, email address, and a hashed version of your password. We never store your password itself.',
          'Portfolio data: holdings, transactions, and balances you enter manually or import from a linked brokerage.',
          'Usage data: watchlists, alerts, journal entries, and lesson progress you create in the app.',
        ],
      },
      {
        heading: 'Brokerage connections',
        body: [
          'Brokerage links are handled by Snaptrade. Your broker credentials are entered on their systems and never reach EquityIQ. We store only the identifiers needed to request your data again.',
          'Connections are read-only. EquityIQ cannot place trades or move money.',
          'Disconnecting a broker removes the link and the stored identifier.',
        ],
      },
      {
        heading: 'Third parties',
        body: [
          'Market data comes from providers including Twelve Data, Finnhub, Alpha Vantage, and Yahoo Finance. Ticker symbols are sent to them to fetch quotes; your identity is not.',
          'Written analysis is generated using Anthropic\'s API. Data sent for analysis relates to the security being researched.',
          'Password reset emails are delivered through Resend.',
        ],
      },
      {
        heading: 'What we do not do',
        body: [
          'We do not sell your personal information. We do not share your portfolio with advertisers or data brokers.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          'You can edit or delete holdings, transactions, alerts, and journal entries at any time from within the app.',
          'To delete your account and everything attached to it, contact us and we will remove it.',
        ],
      },
      {
        heading: 'Cookies',
        body: ['We use a single session cookie to keep you signed in. There are no advertising or tracking cookies.'],
      },
    ],
  },

  security: {
    title: 'Security',
    intro: 'How your account and your data are protected.',
    sections: [
      {
        heading: 'Passwords',
        body: [
          'Passwords are hashed with bcrypt before storage, so the plain value is never written down and cannot be recovered from our database.',
          'Password reset links are single-use, expire after one hour, and only a hash of the token is stored.',
        ],
      },
      {
        heading: 'Sessions',
        body: [
          'Sessions use a signed, http-only cookie that JavaScript cannot read, marked secure in production so it only travels over HTTPS.',
          'Signing out destroys the session on the server, not just in your browser.',
        ],
      },
      {
        heading: 'Brokerage access',
        body: [
          'Broker credentials never reach EquityIQ. Connections are established through Snaptrade and are read-only, so nothing in this app can execute a trade or transfer funds.',
        ],
      },
      {
        heading: 'Transport and infrastructure',
        body: [
          'All traffic is served over HTTPS. The database is hosted on MongoDB Atlas with authentication required.',
          'Sign-in, sign-up, and password reset endpoints are rate limited to slow down automated attacks.',
        ],
      },
      {
        heading: 'Reporting a problem',
        body: ['If you find a security issue, please report it to us before disclosing it publicly so it can be fixed.'],
      },
    ],
  },

  disclosure: {
    title: 'Risk disclosure',
    intro: 'Read this before acting on anything you see in EquityIQ.',
    sections: [
      {
        heading: 'Investing involves risk',
        body: [
          'The value of investments moves up and down. You can lose money, including all of the money you put in.',
          'Past performance does not predict future results. A rising chart is not a forecast.',
        ],
      },
      {
        heading: 'About the data',
        body: [
          'Quotes and fundamentals come from third-party providers. Data may be delayed, incomplete, or wrong, and holdings we cannot price are excluded from totals.',
          'Currency conversion uses a periodically refreshed rate, not the rate your broker would apply.',
          'Figures shown here will not always match your brokerage statement. Your statement is the record of account.',
        ],
      },
      {
        heading: 'About the analysis',
        body: [
          'Written research, forecasts, and scores are produced by automated systems working from the data described above. They can be confidently wrong.',
          'Probabilities and price ranges are estimates, not guarantees, and should not be read as a promise about any outcome.',
        ],
      },
      {
        heading: 'Options and leverage',
        body: [
          'Options can lose their entire value quickly and are not suitable for every investor. Leverage magnifies losses as well as gains.',
        ],
      },
      {
        heading: 'Your decisions are your own',
        body: [
          'EquityIQ is not a licensed adviser and does not know your circumstances, goals, or tax position. Consider speaking to a qualified professional before investing.',
        ],
      },
    ],
  },
};

export default function Legal({ doc }: { doc: keyof typeof DOCS }) {
  const content = DOCS[doc];

  useEffect(() => { window.scrollTo(0, 0); }, [doc]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 md:px-10 h-16 flex items-center justify-between border-b border-hairline">
        <Logo size="md" />
        <Link to="/login" className="text-sm text-ink-secondary hover:text-ink transition">Sign in</Link>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12">
        <p className="eyebrow mb-3">Last updated {UPDATED}</p>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2 mb-4">{content.title}</h1>
        <p className="text-ink-secondary text-lg leading-relaxed mb-10">{content.intro}</p>

        <div className="space-y-9">
          {content.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-semibold text-ink text-lg mb-2.5">{s.heading}</h2>
              <div className="space-y-3">
                {s.body.map((para, i) => (
                  <p key={i} className="text-[15px] text-ink-secondary leading-relaxed">{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="card mt-12">
          <p className="text-sm text-ink-secondary leading-relaxed">
            These documents are written in plain English so they are actually readable. They are a starting point and
            have not been reviewed by a lawyer. If EquityIQ takes on real users at scale, have them reviewed for your
            jurisdiction.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
