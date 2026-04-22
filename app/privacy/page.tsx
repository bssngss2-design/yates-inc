import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 italic">
          Last updated: April 21, 2026 • The short, honest version.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 space-y-6 text-gray-800 dark:text-gray-300">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Who runs this site?
            </h2>
            <p>
              Yates Co. is a parody / hobby project built by students. It is not a
              registered business. No goods or services are actually sold here, no real
              money changes hands, and nothing is shipped. See the{' '}
              <Link href="/tos" className="text-blue-600 dark:text-blue-400 underline">
                Terms of Service
              </Link>{' '}
              for the full context.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              What we collect
            </h2>
            <p className="mb-2">
              If you create an account or play the game, we store the following in our
              database (Supabase):
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>The username / display name you pick yourself.</li>
              <li>A password (stored server-side, never returned to the browser).</li>
              <li>An employee ID, if you&apos;re hired in-game.</li>
              <li>
                Your in-game state: clicker progress, paycheck balances, shop purchases,
                budget contributions, game events, XP / tier.
              </li>
              <li>Messages you send through the in-site Inbox.</li>
              <li>Basic timestamps (created_at, updated_at).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              What we do <em>not</em> collect
            </h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Real name, email, phone number, physical address.</li>
              <li>
                Real payment info. The &quot;pay&quot; page is a joke; the form never
                submits anywhere and actively blocks card numbers that pass a real-card
                check.
              </li>
              <li>Third-party ad-tracking data. We don&apos;t run ad trackers.</li>
              <li>Cross-site browsing behavior. We don&apos;t track you off this site.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Who sees your data
            </h2>
            <p>
              The data lives on Supabase. The only humans with full access are Logan
              (CEO / creator) and a small number of approved admins. We don&apos;t sell,
              rent, trade, or otherwise share your data with anyone.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Your rights (CCPA / similar state laws)
            </h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <strong>See what we have on you:</strong> DM Logan through the Inbox
                and we&apos;ll dump your user row.
              </li>
              <li>
                <strong>Delete your account:</strong> click the trash-can icon next to
                the log-out button, type <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">DELETE</code>,
                confirm. Your client row is wiped from the database immediately.
              </li>
              <li>
                <strong>Correct your data:</strong> just edit it in the UI. If something
                is stuck, message Logan.
              </li>
              <li>
                <strong>Opt out of sale of personal info:</strong> we don&apos;t sell
                it, so there&apos;s nothing to opt out of.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Children under 13 (COPPA)
            </h2>
            <p>
              This site is <strong>not directed to children under 13</strong>. We do
              not knowingly collect personal information from under-13s. Signup requires
              confirming you&apos;re 13 or older. If you&apos;re a parent or guardian
              and you believe your under-13 kid created an account, use the in-app
              &quot;Delete my account&quot; button or message Logan (ID{' '}
              <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">000001</code>)
              and we&apos;ll wipe the account immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Contact
            </h2>
            <p>
              Questions or anything sketchy? Send a message to Logan (ID{' '}
              <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">000001</code>)
              through the in-site Inbox, or use the{' '}
              <Link href="/contact" className="text-blue-600 dark:text-blue-400 underline">
                Contact page
              </Link>.
            </p>
          </section>

          <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              Full ToS and the longer satire addendum live at{' '}
              <Link href="/tos" className="text-blue-600 dark:text-blue-400 underline">
                /tos
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
