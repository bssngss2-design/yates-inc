'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/contexts/GameContext';

interface TutorialStep {
  id: string;
  dialog: string;
  highlight?: string; // CSS selector or ID for spotlight element
  action?: 'click_rock' | 'open_shop' | 'none';
  waitForAction?: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    dialog: "Hey there, rookie! I'm Foreman Jack. Welcome to the mines of Yates Inc. Let me show you around!",
    action: 'none',
  },
  {
    id: 'explain_rock',
    dialog: "See that big rock in the middle? That's where all the money comes from. Click on it to mine!",
    action: 'click_rock',
    waitForAction: true,
  },
  {
    id: 'good_job',
    dialog: "Nice swing! Every click earns you Yates Dollars. The harder the rock, the more you earn. Keep clicking!",
    action: 'click_rock',
    waitForAction: true,
  },
  {
    id: 'explain_money',
    dialog: "See that money counter on the left? That's your balance. You'll use it to buy better pickaxes and upgrades.",
    action: 'none',
  },
  {
    id: 'explain_shop',
    dialog: "When you've saved up some cash, hit the SHOP button at the bottom to buy pickaxes, miners, and buildings!",
    action: 'none',
  },
  {
    id: 'explain_hp',
    dialog: "Each rock has HP. When it hits zero, the rock breaks and you get bonus money! Then a fresh one spawns.",
    action: 'none',
  },
  {
    id: 'explain_prestige',
    dialog: "Once you're rolling in cash, you can PRESTIGE to reset but earn permanent multipliers. Trust me, it's worth it.",
    action: 'none',
  },
  {
    id: 'explain_saving',
    dialog: "One more thing — your progress saves to the cloud automatically every 8 seconds. But if you want to save RIGHT NOW, hit the ⚙️ Settings button and smash that Save Now button. Or just press Q twice real quick!",
    action: 'none',
  },
  {
    id: 'goodbye',
    dialog: "Alright, I'll let you get to work. Remember: click rocks, get money, buy stuff, prestige, repeat. Good luck, miner! ⛏️",
    action: 'none',
  },
];

const STORAGE_KEY = 'yates_tutorial_completed';

export default function ForemanJackTutorial() {
  const { gameState } = useGame();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isTyping, setIsTyping] = useState(true);
  const [displayedText, setDisplayedText] = useState('');
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if tutorial should show
  useEffect(() => {
    if (!mounted) return;
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed && gameState.totalClicks <= 5) {
      // Delay slightly so the game loads first
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [mounted, gameState.totalClicks]);

  // Typing animation
  useEffect(() => {
    if (!isVisible) return;
    const step = TUTORIAL_STEPS[currentStep];
    if (!step) return;

    setIsTyping(true);
    setDisplayedText('');
    let i = 0;
    const fullText = step.dialog;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText(fullText.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [currentStep, isVisible]);

  // Track clicks for click_rock steps
  useEffect(() => {
    setClickCount(gameState.totalClicks);
  }, [gameState.totalClicks]);

  const handleNext = useCallback(() => {
    if (isTyping) {
      // Skip typing animation
      setDisplayedText(TUTORIAL_STEPS[currentStep].dialog);
      setIsTyping(false);
      return;
    }

    if (currentStep >= TUTORIAL_STEPS.length - 1) {
      // Tutorial complete
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsVisible(false);
      return;
    }

    setCurrentStep(prev => prev + 1);
  }, [currentStep, isTyping]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  }, []);

  if (!mounted || !isVisible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep >= TUTORIAL_STEPS.length - 1;
  const isWaitingForClick = step.waitForAction && step.action === 'click_rock';

  return createPortal(
    <div className="fixed inset-0 z-[150] pointer-events-none">
      {/* Semi-transparent overlay — only blocks clicks on non-game elements */}
      <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={handleNext} />

      {/* Foreman Jack NPC dialog — bottom center */}
      <div className="absolute bottom-20 lg:bottom-20 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 pointer-events-auto">
        <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden">
          {/* NPC Header */}
          <div className="bg-gradient-to-r from-amber-900/60 to-amber-800/40 px-4 py-2 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-700 rounded-full flex items-center justify-center text-xl border-2 border-amber-500">
              👷
            </div>
            <div>
              <span className="text-amber-300 font-bold text-sm">Foreman Jack</span>
              <span className="text-amber-500/50 text-[10px] ml-2">Mining Instructor</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{currentStep + 1}/{TUTORIAL_STEPS.length}</span>
            </div>
          </div>

          {/* Dialog Text */}
          <div className="px-4 py-3 min-h-[60px]">
            <p className="text-gray-200 text-sm leading-relaxed">
              {displayedText}
              {isTyping && <span className="animate-pulse text-amber-400">|</span>}
            </p>
          </div>

          {/* Actions */}
          <div className="px-4 pb-3 flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
            >
              Skip Tutorial
            </button>

            {isWaitingForClick ? (
              <span className="text-amber-400 text-xs animate-pulse">
                👆 Click the rock to continue...
              </span>
            ) : (
              <button
                onClick={handleNext}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition-colors"
              >
                {isTyping ? 'Skip ▸' : isLastStep ? 'Let\'s Mine! ⛏️' : 'Next ▸'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
