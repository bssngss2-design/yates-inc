export default function TOSPage() {
  return (
    <div className="min-h-screen py-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          Terms of Service
        </h1>

        {/* THE BIG RED NOTICE — now actually accurate */}
        <div className="bg-red-500 border-4 border-red-700 rounded-lg p-6 mb-8">
          <p className="text-white font-bold text-xl text-center">
            THIS WEBSITE IS MADE AS A JOKE 100%, and it was made by middle schoolers (and
            later high schoolers) just for fun!! DO NOT expect the product to arrive because
            WE ARE <span className="text-3xl">NOT</span> SELLING ANYTHING IN HERE!! By the
            way, we are not affiliated with the people who made the products, and none of
            the jobs listed are real — we aren&apos;t actual lawyers, Professional Photoshop
            Editors aren&apos;t actually professional, etc. Please do not sue us tk.
          </p>
          <p className="text-white font-bold text-base text-center mt-4 border-t-2 border-white/40 pt-4">
            We DO save the bare minimum we need to make accounts work (username, password
            hash, your in-game progress, paycheck balances, purchases). We don&apos;t sell it,
            we don&apos;t track you across other sites, and there&apos;s no real payment
            processing anywhere on this site — all currency here is fake (Yates$ / Walters$).
            Please don&apos;t slime us out.
          </p>
        </div>

        {/* ============ ACTUAL BORING LEGAL SECTION ============ */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            The Actually-Real Part
          </h2>
          <p className="text-xs italic text-gray-500 dark:text-gray-400 mb-6">
            anruithepotato this is for you u bum
          </p>

          <div className="space-y-6 text-gray-800 dark:text-gray-300">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                A. &quot;Yates Inc.&quot; is not a real corporation
              </h3>
              <p>
                &quot;Yates Inc.&quot; is a parody brand name used for comedic purposes. We are
                not a registered corporation, LLC, or any other legal business entity. No
                goods or services are actually offered for sale. No real currency changes
                hands anywhere on this site. The &quot;Inc.&quot; in the name is part of the
                joke, the same way a lemonade stand can call itself &quot;Mega Corp&quot;
                without anyone calling the SEC.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                B. Privacy Policy (the short, honest version)
              </h3>
              <p className="mb-2">
                When you create an account or play the game, here&apos;s what we store in our
                database (Supabase):
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>A username / display name you pick yourself.</li>
                <li>A hashed password (never stored in plain text).</li>
                <li>An employee ID if you&apos;re hired.</li>
                <li>Your in-game state: clicker progress, paycheck balances, shop purchases,
                  budget contributions, game events, XP / tier.</li>
                <li>Messages you send through the in-site Inbox.</li>
                <li>Basic timestamps (created_at, updated_at) so things work.</li>
              </ul>
              <p className="mt-3">Here&apos;s what we do NOT do:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>We don&apos;t sell, rent, or share your data with anyone.</li>
                <li>We don&apos;t track you across other websites.</li>
                <li>We don&apos;t collect your real name, address, phone number, or payment
                  information — there&apos;s nowhere on this site to enter those, because
                  nothing here is for actual sale.</li>
                <li>We don&apos;t run third-party ad trackers.</li>
              </ul>
              <p className="mt-3">
                Data lives on Supabase&apos;s infrastructure. The only people with full access
                are Logan (CEO / creator) and the site&apos;s approved admins.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                C. Want your account deleted?
              </h3>
              <p>
                Easy. Send a message through the in-site Inbox to Logan (ID{' '}
                <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">000001</code>)
                with the words &quot;delete my account&quot; and we&apos;ll wipe your user row,
                paycheck balances, purchases, and game save. This usually happens within a
                few days, because this is a hobby project, not Amazon. If something&apos;s
                urgent, ping Logan on Discord.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                D. No payments, no real commerce
              </h3>
              <p>
                This site does not process credit cards, debit cards, crypto, PayPal, Venmo,
                or any other real-world payment method. If a form on this site ever asks for
                a real card number, assume the site got hacked and close the tab — none of
                our intended flows collect that information.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                E. Kids, school, and common sense
              </h3>
              <p>
                This site was built by a student and his friends. If you find something
                broken, weird, or concerning, just shoot us a message through the Inbox and
                we&apos;ll look at it. We&apos;re not trying to deceive anyone — the giant
                red box above and every product&apos;s absurd price should make that obvious.
              </p>
            </div>
          </div>
        </div>

        {/* ============ THE ORIGINAL SATIRE SECTION (unchanged) ============ */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="prose prose-sm max-w-none space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              MICROPRINT DISCLAIMER, HYPER-ABSURDIST ADDENDUM &amp; OMNIFEE PROTOCOL
            </h2>

            <p className="text-gray-800 dark:text-gray-300">
              By interacting with any Product (including, but not limited to, Glass Tables,
              Watering Cans, Silverware, Rolling Pins, Custom Keys, Fancy Flippers, Toilet
              アトマティックシートウォーマー, Touilotu Papu, and Very Safe Doors, hereinafter
              collectively the &quot;Items&quot;), you irrevocably assent to the following:
            </p>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                1. FEE CALCULATION &amp; QUASI-QUANTUM ACCOUNTING
              </h3>
              <p className="text-gray-800 dark:text-gray-300">
                1.1 Each Item may be subject to one or more hyper-contextualized,
                conditional, or ontologically ambiguous charges (collectively, &quot;Dynamic
                Microfees&quot;), as partially disclosed in the small-hover text.
              </p>
              <p className="text-gray-800 dark:text-gray-300">
                1.2 Dynamic Microfees may include, without limitation:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-gray-800 dark:text-gray-300">
                <li>$50.13 per Glass Table (requires assembly; assembly includes hypothetical time dilation calculations)</li>
                <li>$15.10 per Watering Can (per pound of Interfacing Entity&apos;s corporeal mass; subject to BMI flux)</li>
                <li>$30.23 per Silverware set (per cumulative meal consumed; historical correction factors may apply)</li>
                <li>$43.76 per Rolling Pin (per instance of baking activity; baking includes theoretical dough-based endeavors)</li>
                <li>$27.97 per Custom Key (per key usage event; key usage defined as any mechanical, digital, or metaphysically implied insertion)</li>
                <li>$41.99 per Fancy Flippers (per instance of water contact, inclusive of precipitation-induced exposure)</li>
                <li>$399.99 per Toilet アトマティックシートウォーマー (per lavatorial engagement; engagement may be literal or symbolic)</li>
                <li>$12.89 per Touilotu Papu (per linear inch of paper used; includes retrospective application)</li>
                <li>$89.99 per Very Safe Door (per use event; door use may include opening, closing, or marginal leaning)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">2. MICROPRINT ACKNOWLEDGMENT</h3>
              <p className="text-gray-800 dark:text-gray-300">
                2.1 Hovering over price values constitutes tacit acknowledgment of all
                small-letter disclaimers. This acknowledgment may be fleeting, non-linear,
                or partially perceptible due to screen refresh rates, quantum superposition,
                or attention span variability.
              </p>
              <p className="text-gray-800 dark:text-gray-300">
                2.2 Failure to observe hover-text does not exempt the Interfacing Entity
                from liability for Dynamic Microfees, which shall be deemed incurred
                retroactively from the moment of product acquisition.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">3. ABSURDITY CLAUSE</h3>
              <p className="text-gray-800 dark:text-gray-300">
                3.1 By purchasing, viewing, or contemplating any Item, the Interfacing
                Entity agrees that all Dynamic Microfees, calculation methods, and ancillary
                pseudo-legals are intentionally nonsensical, performative, and designed
                solely for amusement, dramatic effect, or mild existential discomfort.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">4. TELEMETRY &amp; META-ANALYTICS</h3>
              <p className="text-gray-800 dark:text-gray-300">
                4.1 All hover events, clicks, and potential cognitive dissonances may be
                logged in ephemeral, cryptographically obfuscated registers to enhance
                satirical verisimilitude.
              </p>
              <p className="text-gray-800 dark:text-gray-300">
                4.2 Data harvested may be used to adjust microfee multipliers, predict
                future absurd purchases, or randomly assign ironic nicknames to Interfacing
                Entities.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">5. ENFORCEMENT &amp; COSMIC RECOURSE</h3>
              <p className="text-gray-800 dark:text-gray-300">
                5.1 In the unlikely event of a dispute, the Platform reserves the right to
                adjudicate claims via interpretive dance, ceremonial thumb wrestling, or
                random selection of imaginary arbiters.
              </p>
              <p className="text-gray-800 dark:text-gray-300">
                5.2 All fees are non-refundable, partially retroactive, and subject to
                whimsical adjustment based on lunar cycles, quantum flux, and interpretive
                reading of hover-text.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">6. FINAL ACKNOWLEDGMENT</h3>
              <p className="text-gray-800 dark:text-gray-300">
                6.1 By interacting with this Platform, the Interfacing Entity irrevocably
                agrees to the Microprint, Dynamic Microfees, Absurdity Clause, and all
                other hyper-technical stipulations herein, understanding fully that literal
                comprehension is optional, confusion is encouraged, and amusement is
                mandatory.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 italic mt-6">
          Last updated: April 20, 2026
        </p>
      </div>
    </div>
  );
}
