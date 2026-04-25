'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Game state types
type GamePhase = 'dialog-intro' | 'dialog-challenge' | 'dialog-replay' | 'puzzle' | 'dialog-success' | 'redirect';
type Direction = 'up' | 'down' | 'left' | 'right';
type Position = { x: number; y: number };

// 16x16 puzzle grid
const GRID_SIZE = 16;

// Exit position (top center)
const EXIT_POS = { x: Math.floor(GRID_SIZE / 2), y: 0 };

// Starting positions
const PLAYER_START = { x: 8, y: 14 };
const POLICE1_START = { x: 2, y: 2 };
const POLICE2_START = { x: 13, y: 2 };
const POLICE3_START = { x: 7, y: 7 }; // Third cop in the middle

// Check if player already beat this challenge
function hasCompletedChallenge(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('yates-secret-completed') === 'true';
}

// Generate random maze walls with guaranteed connectivity
function generateMaze(): Set<string> {
  const walls = new Set<string>();
  
  // Outer walls (except exit)
  for (let i = 0; i < GRID_SIZE; i++) {
    walls.add(`0,${i}`);
    walls.add(`${GRID_SIZE - 1},${i}`);
    if (i !== EXIT_POS.x && i !== EXIT_POS.x + 1) {
      walls.add(`${i},0`);
    }
    walls.add(`${i},${GRID_SIZE - 1}`);
  }
  
  // Smaller, safer wall patterns that won't trap cops
  const wallPatterns = [
    // Short horizontal walls (max 4 blocks)
    () => {
      const y = 3 + Math.floor(Math.random() * 10);
      const x = 2 + Math.floor(Math.random() * 9);
      for (let i = 0; i < 4; i++) walls.add(`${x + i},${y}`);
    },
    // Short vertical walls (max 4 blocks)
    () => {
      const x = 3 + Math.floor(Math.random() * 10);
      const y = 2 + Math.floor(Math.random() * 9);
      for (let i = 0; i < 4; i++) walls.add(`${x},${y + i}`);
    },
    // Small L-shapes
    () => {
      const sx = 3 + Math.floor(Math.random() * 9);
      const sy = 3 + Math.floor(Math.random() * 9);
      walls.add(`${sx},${sy}`);
      walls.add(`${sx + 1},${sy}`);
      walls.add(`${sx},${sy + 1}`);
    },
    // Single blocks scattered
    () => {
      for (let i = 0; i < 4; i++) {
        const bx = 2 + Math.floor(Math.random() * 12);
        const by = 2 + Math.floor(Math.random() * 12);
        walls.add(`${bx},${by}`);
      }
    },
    // 2x2 blocks
    () => {
      const bx = 3 + Math.floor(Math.random() * 10);
      const by = 3 + Math.floor(Math.random() * 10);
      walls.add(`${bx},${by}`);
      walls.add(`${bx + 1},${by}`);
      walls.add(`${bx},${by + 1}`);
      walls.add(`${bx + 1},${by + 1}`);
    },
  ];
  
  // Add 12-15 smaller patterns (more patterns but smaller)
  const patternCount = 12 + Math.floor(Math.random() * 4);
  for (let i = 0; i < patternCount; i++) {
    const pattern = wallPatterns[Math.floor(Math.random() * wallPatterns.length)];
    pattern();
  }
  
  // Clear 3x3 area around each critical position
  const criticalPositions = [
    PLAYER_START,
    POLICE1_START,
    POLICE2_START,
    POLICE3_START,
    EXIT_POS,
  ];
  
  criticalPositions.forEach(pos => {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        walls.delete(`${pos.x + dx},${pos.y + dy}`);
      }
    }
  });
  
  // Extra clearance around exit
  walls.delete(`${EXIT_POS.x},${EXIT_POS.y + 2}`);
  walls.delete(`${EXIT_POS.x + 1},${EXIT_POS.y + 2}`);
  
  return walls;
}

// BFS pathfinding
function findPath(start: Position, target: Position, walls: Set<string>): Position | null {
  const queue: { x: number; y: number; path: Position[] }[] = [{ ...start, path: [] }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);
  
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.x === target.x && current.y === target.y) {
      return current.path.length > 0 ? current.path[0] : null;
    }
    
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const key = `${nx},${ny}`;
      
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && 
          !visited.has(key) && !walls.has(key)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, path: [...current.path, { x: nx, y: ny }] });
      }
    }
  }
  
  return null;
}

// Dialog sequences
const DIALOGS = {
  intro: [{ speaker: 'darkness', text: 'Hi mere mortal, would you like to achieve highness?' }],
  introChoices: [
    { text: 'Yes', action: 'continue' },
    { text: 'No', action: 'close' },
  ],
  challenge: [{ speaker: 'darkness', text: 'Good, just prove me your strength.' }],
  challengeQuestion: [{ speaker: 'player', text: 'How?' }],
  challengeAnswer: [{ speaker: 'darkness', text: 'Go in this bank and try to get to the end.' }],
  challengeChoices: [
    { text: 'Sure', action: 'puzzle' },
    { text: "That's weird", action: 'close' },
  ],
  // Replay dialog for returning players
  replay: [{ speaker: 'darkness', text: 'Hmm want to try again?' }],
  replayChoices: [
    { text: 'Yes', action: 'puzzle-replay' },
    { text: 'No', action: 'close' },
  ],
  puzzleComplete: [{ speaker: 'player', text: 'I beat it?' }],
  puzzleCompleteChoices: [
    { text: 'Yes', action: 'showSuccess' },
    { text: 'No', action: 'close' },
  ],
  success: [{ speaker: 'darkness', text: 'Ohh you have escaped? Good I shall reward you.' }],
  // Replay success (no reward)
  replaySuccess: [{ speaker: 'darkness', text: 'Nice, you did it again. No extra reward though.' }],
};

export default function SecretChallengePage() {
  const router = useRouter();
  const [isReplay, setIsReplay] = useState(false);
  const [phase, setPhase] = useState<GamePhase>(() => 
    hasCompletedChallenge() ? 'dialog-replay' : 'dialog-intro'
  );
  const [showChoices, setShowChoices] = useState(false);
  const [currentDialogStage, setCurrentDialogStage] = useState<'intro' | 'question' | 'answer' | 'complete' | 'success'>('intro');
  
  // Puzzle state
  const [walls, setWalls] = useState<Set<string>>(() => generateMaze());
  const [playerPos, setPlayerPos] = useState<Position>(PLAYER_START);
  const police1PosRef = useRef<Position>(POLICE1_START);
  const police2PosRef = useRef<Position>(POLICE2_START);
  const police3PosRef = useRef<Position>(POLICE3_START);
  const [, forceUpdate] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const lastMoveRef = useRef<number>(0);

  const closePage = useCallback(() => {
    window.close();
    router.push('/info');
  }, [router]);

  const grantRewardAndRedirect = useCallback(() => {
    if (!isReplay) {
      localStorage.setItem('yates-secret-completed', 'true');
    }
    setPhase('redirect');
    setTimeout(() => {
      router.push(isReplay ? '/info' : '/info?secret=completed');
    }, 100);
  }, [router, isReplay]);

  const isValidPosition = useCallback((x: number, y: number, currentWalls: Set<string>) => {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    if ((x === EXIT_POS.x || x === EXIT_POS.x + 1) && y === EXIT_POS.y) return true;
    return !currentWalls.has(`${x},${y}`);
  }, []);

  const movePlayer = useCallback((direction: Direction) => {
    if (gameOver || won || phase !== 'puzzle') return;
    
    const now = Date.now();
    if (now - lastMoveRef.current < 70) return;
    lastMoveRef.current = now;

    setPlayerPos(prev => {
      let newX = prev.x;
      let newY = prev.y;
      
      switch (direction) {
        case 'up': newY--; break;
        case 'down': newY++; break;
        case 'left': newX--; break;
        case 'right': newX++; break;
      }
      
      if (isValidPosition(newX, newY, walls)) {
        if ((newX === EXIT_POS.x || newX === EXIT_POS.x + 1) && newY === EXIT_POS.y) {
          setWon(true);
          setPhase('dialog-success');
          setCurrentDialogStage('complete');
          setShowChoices(false);
        }
        return { x: newX, y: newY };
      }
      return prev;
    });
  }, [gameOver, won, phase, isValidPosition, walls]);

  // Check collision
  useEffect(() => {
    if (phase !== 'puzzle' || gameOver || won) return;
    
    const p1 = police1PosRef.current;
    const p2 = police2PosRef.current;
    const p3 = police3PosRef.current;
    
    if ((playerPos.x === p1.x && playerPos.y === p1.y) ||
        (playerPos.x === p2.x && playerPos.y === p2.y) ||
        (playerPos.x === p3.x && playerPos.y === p3.y)) {
      setGameOver(true);
    }
  }, [phase, playerPos, gameOver, won]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'puzzle') return;
      
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          e.preventDefault(); movePlayer('up'); break;
        case 'ArrowDown': case 's': case 'S':
          e.preventDefault(); movePlayer('down'); break;
        case 'ArrowLeft': case 'a': case 'A':
          e.preventDefault(); movePlayer('left'); break;
        case 'ArrowRight': case 'd': case 'D':
          e.preventDefault(); movePlayer('right'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, movePlayer]);

  // Police movement - ALL 3 cops move every 220ms (FAST)
  useEffect(() => {
    if (phase !== 'puzzle' || gameOver || won) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const movePoliceUnit = (currentPos: Position, otherPositions: Position[]): Position => {
      const target = playerPos;
      const nextStep = findPath(currentPos, target, walls);
      
      if (nextStep) {
        if (Math.random() < 0.92) {
          const blocked = otherPositions.some(p => p.x === nextStep.x && p.y === nextStep.y);
          if (!blocked) return nextStep;
        }
      }
      
      const directions = [
        { x: currentPos.x - 1, y: currentPos.y },
        { x: currentPos.x + 1, y: currentPos.y },
        { x: currentPos.x, y: currentPos.y - 1 },
        { x: currentPos.x, y: currentPos.y + 1 },
      ];
      
      const validMoves = directions.filter(d => 
        isValidPosition(d.x, d.y, walls) && 
        !otherPositions.some(p => p.x === d.x && p.y === d.y)
      );
      
      if (validMoves.length > 0) {
        return validMoves[Math.floor(Math.random() * validMoves.length)];
      }
      
      // STUCK! Teleport to a random valid position near the player
      const teleportOptions: Position[] = [];
      for (let x = 2; x < GRID_SIZE - 2; x++) {
        for (let y = 2; y < GRID_SIZE - 2; y++) {
          if (!walls.has(`${x},${y}`) && 
              !otherPositions.some(p => p.x === x && p.y === y) &&
              !(x === playerPos.x && y === playerPos.y) &&
              Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y) > 3 && // Not too close
              Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y) < 10) { // Not too far
            teleportOptions.push({ x, y });
          }
        }
      }
      
      if (teleportOptions.length > 0) {
        return teleportOptions[Math.floor(Math.random() * teleportOptions.length)];
      }
      
      return currentPos;
    };

    // All 3 cops move every 220ms
    gameLoopRef.current = setInterval(() => {
      const p1 = police1PosRef.current;
      const p2 = police2PosRef.current;
      const p3 = police3PosRef.current;
      
      const p1New = movePoliceUnit(p1, [p2, p3]);
      const p2New = movePoliceUnit(p2, [p1New, p3]);
      const p3New = movePoliceUnit(p3, [p1New, p2New]);
      
      police1PosRef.current = p1New;
      police2PosRef.current = p2New;
      police3PosRef.current = p3New;
      
      forceUpdate(n => n + 1);
      
      if ((playerPos.x === p1New.x && playerPos.y === p1New.y) ||
          (playerPos.x === p2New.x && playerPos.y === p2New.y) ||
          (playerPos.x === p3New.x && playerPos.y === p3New.y)) {
        setGameOver(true);
      }
    }, 220);
    
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [phase, gameOver, won, playerPos, walls, isValidPosition]);

  const advanceDialog = useCallback(() => {
    if (phase === 'dialog-intro') {
      setShowChoices(true);
    } else if (phase === 'dialog-replay') {
      setShowChoices(true);
    } else if (phase === 'dialog-challenge') {
      if (currentDialogStage === 'intro') {
        setCurrentDialogStage('question');
      } else if (currentDialogStage === 'question') {
        setCurrentDialogStage('answer');
      } else if (currentDialogStage === 'answer') {
        setShowChoices(true);
      }
    } else if (phase === 'dialog-success') {
      if (currentDialogStage === 'complete') {
        setShowChoices(true);
      } else if (currentDialogStage === 'success') {
        grantRewardAndRedirect();
      }
    }
  }, [phase, currentDialogStage, grantRewardAndRedirect]);

  const handleChoice = useCallback((action: string) => {
    if (action === 'close') {
      closePage();
    } else if (action === 'continue') {
      setPhase('dialog-challenge');
      setCurrentDialogStage('intro');
      setShowChoices(false);
    } else if (action === 'puzzle') {
      setIsReplay(false);
      setPhase('puzzle');
      setShowChoices(false);
    } else if (action === 'puzzle-replay') {
      setIsReplay(true);
      setPhase('puzzle');
      setShowChoices(false);
    } else if (action === 'showSuccess') {
      setCurrentDialogStage('success');
      setShowChoices(false);
    }
  }, [closePage]);

  const retryPuzzle = useCallback(() => {
    setWalls(generateMaze());
    setPlayerPos(PLAYER_START);
    police1PosRef.current = POLICE1_START;
    police2PosRef.current = POLICE2_START;
    police3PosRef.current = POLICE3_START;
    setGameOver(false);
    setWon(false);
  }, []);

  const getCurrentDialog = useCallback(() => {
    if (phase === 'dialog-intro') return DIALOGS.intro[0];
    if (phase === 'dialog-replay') return DIALOGS.replay[0];
    if (phase === 'dialog-challenge') {
      if (currentDialogStage === 'intro') return DIALOGS.challenge[0];
      if (currentDialogStage === 'question') return DIALOGS.challengeQuestion[0];
      if (currentDialogStage === 'answer') return DIALOGS.challengeAnswer[0];
    }
    if (phase === 'dialog-success') {
      if (currentDialogStage === 'complete') return DIALOGS.puzzleComplete[0];
      if (currentDialogStage === 'success') {
        return isReplay ? DIALOGS.replaySuccess[0] : DIALOGS.success[0];
      }
    }
    return null;
  }, [phase, currentDialogStage, isReplay]);

  const getCurrentChoices = useCallback(() => {
    if (phase === 'dialog-intro') return DIALOGS.introChoices;
    if (phase === 'dialog-replay') return DIALOGS.replayChoices;
    if (phase === 'dialog-challenge' && currentDialogStage === 'answer') return DIALOGS.challengeChoices;
    if (phase === 'dialog-success' && currentDialogStage === 'complete') return DIALOGS.puzzleCompleteChoices;
    return [];
  }, [phase, currentDialogStage]);

  const renderCell = (x: number, y: number) => {
    const isWall = walls.has(`${x},${y}`);
    const isExit = (x === EXIT_POS.x || x === EXIT_POS.x + 1) && y === EXIT_POS.y;
    const isPlayer = x === playerPos.x && y === playerPos.y;
    const isPolice1 = x === police1PosRef.current.x && y === police1PosRef.current.y;
    const isPolice2 = x === police2PosRef.current.x && y === police2PosRef.current.y;
    const isPolice3 = x === police3PosRef.current.x && y === police3PosRef.current.y;
    
    const isLightTile = (x + y) % 2 === 0;
    
    let cellStyle = '';
    let content = null;
    
    if (isWall) {
      cellStyle = 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-500';
    } else if (isExit) {
      cellStyle = 'bg-gradient-to-t from-green-700 to-green-500 border-green-400 animate-pulse';
      if (!isPlayer && !isPolice1 && !isPolice2 && !isPolice3) {
        content = <span className="text-[8px] sm:text-xs font-bold text-white">EXIT</span>;
      }
    } else {
      // Softer floor colors - gray/blue tones
      cellStyle = isLightTile 
        ? 'bg-slate-300 border-slate-400' 
        : 'bg-slate-400 border-slate-500';
    }
    
    if (isPlayer) {
      content = <span className="text-sm sm:text-base">🤓</span>;
    } else if (isPolice1 || isPolice2 || isPolice3) {
      content = <span className="text-sm sm:text-base">👮</span>;
    }
    
    return (
      <div
        key={`${x},${y}`}
        className={`w-5 h-5 sm:w-6 sm:h-6 ${cellStyle} border flex items-center justify-center`}
      >
        {content}
      </div>
    );
  };

  // Dialog phases
  if (phase === 'dialog-intro' || phase === 'dialog-challenge' || phase === 'dialog-success' || phase === 'dialog-replay') {
    const dialog = getCurrentDialog();
    const choices = getCurrentChoices();
    
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6">
          <div 
            className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 cursor-pointer"
            onClick={() => !showChoices && advanceDialog()}
          >
            {dialog && (
              <div className="space-y-2">
                <p className={`text-sm ${dialog.speaker === 'darkness' ? 'text-purple-400' : 'text-cyan-400'}`}>
                  {dialog.speaker === 'darkness' ? '???' : 'You'}
                </p>
                <p className="text-white text-lg font-light leading-relaxed">
                  {dialog.text}
                </p>
              </div>
            )}
            {!showChoices && (
              <p className="text-gray-500 text-xs mt-4 animate-pulse">Click to continue...</p>
            )}
          </div>

          {showChoices && (
            <div className="space-y-2">
              {choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChoice(choice.action)}
                  className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-left transition-colors border border-gray-700 hover:border-gray-600"
                >
                  {choice.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Puzzle phase
  if (phase === 'puzzle') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center p-4">
        <h2 className="text-white text-2xl mb-2 font-bold">🏦 Escape the Bank</h2>
        <p className="text-gray-400 text-sm mb-4">WASD or Arrow keys • Reach the EXIT!</p>
        
        <div className="bg-gray-900 p-3 rounded-xl border-4 border-slate-600 shadow-2xl">
          <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
            {Array.from({ length: GRID_SIZE }, (_, y) =>
              Array.from({ length: GRID_SIZE }, (_, x) => renderCell(x, y))
            )}
          </div>
        </div>

        <div className="flex gap-6 mt-4 text-sm">
          <span className="text-white">🤓 You</span>
          <span className="text-red-400">👮 Cops (x3)</span>
          <span className="text-green-400">EXIT</span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:hidden">
          <div />
          <button onClick={() => movePlayer('up')} className="bg-gray-700 active:bg-gray-600 p-4 rounded-lg text-white text-xl font-bold">↑</button>
          <div />
          <button onClick={() => movePlayer('left')} className="bg-gray-700 active:bg-gray-600 p-4 rounded-lg text-white text-xl font-bold">←</button>
          <button onClick={() => movePlayer('down')} className="bg-gray-700 active:bg-gray-600 p-4 rounded-lg text-white text-xl font-bold">↓</button>
          <button onClick={() => movePlayer('right')} className="bg-gray-700 active:bg-gray-600 p-4 rounded-lg text-white text-xl font-bold">→</button>
        </div>

        {gameOver && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-gray-900 to-gray-800 p-8 rounded-2xl border-2 border-red-500 text-center space-y-4 shadow-2xl">
              <h3 className="text-red-400 text-3xl font-bold">🚨 CAUGHT!</h3>
              <p className="text-gray-400">The police got you!</p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={retryPuzzle}
                  className="bg-blue-600 hover:bg-blue-500 active:bg-blue-400 text-white px-8 py-3 rounded-xl font-bold text-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={closePage}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl transition-colors"
                >
                  Give Up
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'redirect') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-purple-400 animate-pulse text-xl">Redirecting...</p>
      </div>
    );
  }

  return null;
}
