'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useMail } from '@/contexts/MailContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';
import { usePaycheck } from '@/contexts/PaycheckContext';
import { useState } from 'react';
import CartSidebar from './CartSidebar';
import InboxSidebar from './InboxSidebar';
import PaycheckSidebar from './PaycheckSidebar';
// Stock Market removed - feature deprecated
import BudgetSidebar from './BudgetSidebar';
import GitCommitsModal from './GitCommitsModal';

// Format money with K, M, B, T, Q suffixes
function formatMoney(amount: number): string {
  if (!isFinite(amount)) return '∞';
  if (amount >= 1e42) return `${(amount / 1e42).toFixed(1)}Tr`;
  if (amount >= 1e39) return `${(amount / 1e39).toFixed(1)}Dr`;
  if (amount >= 1e36) return `${(amount / 1e36).toFixed(1)}Un`;
  if (amount >= 1e33) return `${(amount / 1e33).toFixed(1)}Dc`;
  if (amount >= 1e30) return `${(amount / 1e30).toFixed(1)}No`;
  if (amount >= 1e27) return `${(amount / 1e27).toFixed(1)}Oc`;
  if (amount >= 1e24) return `${(amount / 1e24).toFixed(1)}Sp`;
  if (amount >= 1e21) return `${(amount / 1e21).toFixed(1)}Sx`;
  if (amount >= 1e18) return `${(amount / 1e18).toFixed(1)}Qi`;
  if (amount >= 1e15) return `${(amount / 1e15).toFixed(1)}Q`;
  if (amount >= 1e12) return `${(amount / 1e12).toFixed(1)}T`;
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`;
  return amount.toFixed(0);
}

export default function Navbar() {
  const { cartCount } = useCart();
  const { unreadCount } = useMail();
  const { isLoggedIn, logout, employee } = useAuth();
  const { isClient, client, setClient } = useClient();
  const { currentUserPaycheck } = usePaycheck();
  const [showCart, setShowCart] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showPaychecks, setShowPaychecks] = useState(false);
  // Stock market removed
  const [showBudget, setShowBudget] = useState(false);
  const [showGitCommits, setShowGitCommits] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if current user is Logan (CEO)
  const isCEO = employee?.id === '000001';

  return (
    <>
      <nav className="bg-white dark:bg-gray-900 shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Link href="/" className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  YATES
                </Link>
                <button
                  onClick={() => setShowGitCommits(true)}
                  className="text-xl sm:text-2xl font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="View Dev Status & Commits"
                >
                  INC.
                </button>
              </div>
              {!isLoggedIn && !isClient && (
                <Link
                  href="/client-signup"
                  className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium -mt-1 transition-colors"
                >
                  Make an account
                </Link>
              )}
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-6 items-center">
              <Link
                href="/products"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Products
              </Link>
              <Link
                href="/contact"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Contact
              </Link>
              <Link
                href="/employees"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Employees
              </Link>
              <Link
                href="/el"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                EL
              </Link>


              {/* Company Budget button - all employees */}
              {isLoggedIn && (
                <button
                  onClick={() => setShowBudget(true)}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center gap-1"
                  title="Company Budget"
                >
                  🏦
                </button>
              )}

              {/* Paychecks button - CEO only */}
              {isCEO && (
                <button
                  onClick={() => setShowPaychecks(true)}
                  className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium flex items-center gap-1"
                  title="Manage Paychecks"
                >
                  💰 Paychecks
                </button>
              )}
              
              {/* Inbox button */}
              <button
                onClick={() => setShowInbox(true)}
                className="relative text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                title="Inbox"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                {unreadCount > 0 && (isLoggedIn || isClient) && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowCart(true)}
                className="relative text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Shop
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Logout button & Balance */}
              {(isLoggedIn || isClient) && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300 dark:border-gray-700">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {isLoggedIn && employee 
                        ? employee.name.split(' ')[0] 
                        : client?.username}
                    </span>
                    {isLoggedIn && employee && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        {employee.role}
                      </span>
                    )}
                    {/* Show balance for logged-in employees */}
                    {isLoggedIn && currentUserPaycheck && (
                      <div className="flex gap-2 text-xs mt-0.5">
                        {currentUserPaycheck.yates_balance > 0 && (
                          <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                            ${formatMoney(currentUserPaycheck.yates_balance)} Y$
                          </span>
                        )}
                        {currentUserPaycheck.walters_balance > 0 && (
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            ${formatMoney(currentUserPaycheck.walters_balance)} W$
                          </span>
                        )}
                        {currentUserPaycheck.yates_balance === 0 && currentUserPaycheck.walters_balance === 0 && (
                          <span className="text-gray-400">$0</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (isLoggedIn) logout();
                      if (isClient) setClient(null);
                    }}
                    className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm flex items-center gap-1"
                    title="Log out"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button + quick actions */}
            <div className="flex md:hidden items-center gap-3">
              {/* Mobile Inbox */}
              <button
                onClick={() => setShowInbox(true)}
                className="relative text-gray-700 dark:text-gray-300 p-2"
                title="Inbox"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                {unreadCount > 0 && (isLoggedIn || isClient) && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Mobile Cart */}
              <button
                onClick={() => setShowCart(true)}
                className="relative text-gray-700 dark:text-gray-300 p-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                  />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 dark:text-gray-300 p-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
              <div className="flex flex-col space-y-4">
                <Link
                  href="/products"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Products
                </Link>
                <Link
                  href="/contact"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </Link>
                <Link
                  href="/employees"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Employees
                </Link>
                <Link
                  href="/el"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  EL
                </Link>


                {(isLoggedIn || isClient) && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-3">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isLoggedIn && employee ? employee.name : client?.username}
                      </div>
                      {isLoggedIn && employee && (
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          {employee.role}
                        </div>
                      )}
                      {/* Mobile balance display */}
                      {isLoggedIn && currentUserPaycheck && (
                        <div className="flex gap-3 text-sm mt-2">
                          <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                            ${currentUserPaycheck.yates_balance.toFixed(0)} Yates$
                          </span>
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            ${currentUserPaycheck.walters_balance.toFixed(0)} Walters$
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Company Budget - mobile (employees only) */}
                    {isLoggedIn && (
                      <button
                        onClick={() => {
                          setShowBudget(true);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left text-emerald-600 dark:text-emerald-400 font-medium mb-3"
                      >
                        🏦 Company Budget
                      </button>
                    )}
                    {/* CEO Paychecks button - mobile */}
                    {isCEO && (
                      <button
                        onClick={() => {
                          setShowPaychecks(true);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left text-green-600 dark:text-green-400 font-medium mb-3"
                      >
                        💰 Manage Paychecks
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (isLoggedIn) logout();
                        if (isClient) setClient(null);
                        setMobileMenuOpen(false);
                      }}
                      className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
      <CartSidebar isOpen={showCart} onClose={() => setShowCart(false)} />
      <InboxSidebar isOpen={showInbox} onClose={() => setShowInbox(false)} />
      {isCEO && <PaycheckSidebar isOpen={showPaychecks} onClose={() => setShowPaychecks(false)} />}
      {isLoggedIn && <BudgetSidebar isOpen={showBudget} onClose={() => setShowBudget(false)} />}
      <GitCommitsModal isOpen={showGitCommits} onClose={() => setShowGitCommits(false)} />
    </>
  );
}
