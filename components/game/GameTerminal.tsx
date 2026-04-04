'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';
import { PICKAXES, ROCKS } from '@/lib/gameData';
import { supabase } from '@/lib/supabase';
import { TRINKETS, TITLES, ACHIEVEMENTS, getPrestigePriceMultiplier } from '@/types/game';
// Terminal password validation is now server-side via /api/terminal/validate

// Admin IDs that can ban users (only Bernardo and Logan)
const BAN_ADMIN_IDS = ['123456', '000001'];

interface GameTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onMine: () => void;
}

export default function GameTerminal({ isOpen, onClose, onMine }: GameTerminalProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([
    '🔒 ADMIN TERMINAL',
    '💀 Sup lil cheaters?',
    'Type help for commands',
    '',
  ]);
  // Load command history from localStorage
  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('yates-terminal-history');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cmActive, setCmActive] = useState(false);
  
  // Guest authentication state (memory only - resets on close/refresh)
  const [guestAuthenticated, setGuestAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const cmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { gameState, resetGame, buyPickaxe, equipPickaxe, prestige, dismissWarning, clearClickHistory, addMoney, addMiners, addPrestigeTokens, giveTrinket, givePickaxe, setTotalClicks, toggleAutoPrestige, giveTitle, equipTitle, unlockAllAchievements, selectPath, maxAll, giveAllTrinkets, spawnWanderingTrader, addStokens } = useGame();
  const { employee } = useAuth();
  const { client } = useClient();
  
  // Check if current user is employee (numbered ID) or ban admin
  const userId = employee?.id || client?.id || null;
  const isEmployee = userId ? /^\d+$/.test(userId) : false;
  const isBanAdmin = userId ? BAN_ADMIN_IDS.includes(userId) : false;

  // Handle terminal close - reset guest auth state
  const handleClose = useCallback(() => {
    setGuestAuthenticated(false);
    setPasswordInput('');
    setPasswordError('');
    onClose();
  }, [onClose]);

  // Focus input when terminal opens
  useEffect(() => {
    if (isOpen) {
      // Focus password input for non-employees, command input for employees
      if (!isEmployee && !guestAuthenticated && passwordInputRef.current) {
        passwordInputRef.current.focus();
      } else if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen, isEmployee, guestAuthenticated]);

  // Auto-scroll history to bottom
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (terminalRef.current && !terminalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      // Small delay to prevent immediate close on open
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  // Handle password submission for guests — validated server-side
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/terminal/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();

      if (data.valid) {
        setGuestAuthenticated(true);
        setPasswordInput('');
        setPasswordError('');
        // Reset history to welcome message for guests
        setHistory([
          '🔓 GUEST ACCESS GRANTED',
          '💀 Welcome to the shadow realm...',
          'Type help for commands',
          '(Type S0 to sign out)',
          '',
        ]);
      } else {
        setPasswordError('Invalid password. Nice try tho 😏');
        setPasswordInput('');
      }
    } catch (err) {
      setPasswordError('Failed to validate. Try again.');
      setPasswordInput('');
    }
  };

  // CM() mode - 7 clicks/sec + auto-buy pickaxes (NO auto-prestige - use 'autoprestige' command separately)
  useEffect(() => {
    if (cmActive) {
      // Clear any blocks when CM is activated (admin mode)
      if (gameState.isBlocked) {
        dismissWarning();
      }
      // Clear click history when CM starts
      clearClickHistory();
      
      cmIntervalRef.current = setInterval(() => {
        // Auto-click
        onMine();
        
        const highestOwned = gameState.ownedPickaxeIds.length > 0 ? Math.max(...gameState.ownedPickaxeIds) : 0;
        const nextPickaxe = PICKAXES.find(p => p.id === highestOwned + 1);
        if (nextPickaxe) {
          const scaledPrice = Math.floor(nextPickaxe.price * getPrestigePriceMultiplier(gameState.prestigeCount, gameState.isHardMode, gameState.sideLevel || 0));
          if (gameState.yatesDollars >= scaledPrice) {
            buyPickaxe(nextPickaxe.id);
          }
        }
        // Note: Auto-prestige removed - use 'autoprestige' command if you want it
      }, 1000 / 7); // 7 clicks per second
    } else {
      if (cmIntervalRef.current) {
        clearInterval(cmIntervalRef.current);
        cmIntervalRef.current = null;
      }
      // Clear click history when CM is turned off so manual clicks don't trigger anti-cheat
      clearClickHistory();
      // Also clear any blocks
      if (gameState.isBlocked) {
        dismissWarning();
      }
    }

    return () => {
      if (cmIntervalRef.current) {
        clearInterval(cmIntervalRef.current);
      }
    };
  }, [cmActive, onMine, gameState.ownedPickaxeIds, gameState.yatesDollars, buyPickaxe, prestige]);

  const addToHistory = useCallback((line: string) => {
    setHistory(prev => [...prev, line]);
  }, []);

  // Ban a user by their user_id, email, or username (only ban admins can do this)
  const banUser = useCallback(async (targetInput: string, reason?: string) => {
    if (!isBanAdmin) {
      addToHistory('❌ ACCESS DENIED - Only Bernardo/Logan can ban');
      return;
    }
    
    try {
      let targetUserId = targetInput;
      let empData = null;
      let clientData = null;
      
      // Check if input looks like a UUID (contains dashes and is long) or numeric ID
      const isDirectId = targetInput.includes('-') || /^\d+$/.test(targetInput);
      
      if (!isDirectId) {
        // Search by email or username
        addToHistory(`🔍 Searching for "${targetInput}"...`);
        
        // Search in clients by mail_handle or username
        const { data: clientByEmail } = await supabase
          .from('clients')
          .select('id, username, mail_handle')
          .ilike('mail_handle', targetInput)
          .maybeSingle();
        
        const { data: clientByUsername } = await supabase
          .from('clients')
          .select('id, username, mail_handle')
          .ilike('username', targetInput)
          .maybeSingle();
        
        // Search in employees by name
        const { data: empByName } = await supabase
          .from('employees')
          .select('id, name')
          .ilike('name', targetInput)
          .maybeSingle();
        
        if (clientByEmail) {
          clientData = clientByEmail;
          targetUserId = clientByEmail.id;
          addToHistory(`✅ Found client by email: ${clientByEmail.username}`);
        } else if (clientByUsername) {
          clientData = clientByUsername;
          targetUserId = clientByUsername.id;
          addToHistory(`✅ Found client by username: ${clientByUsername.username}`);
        } else if (empByName) {
          empData = empByName;
          targetUserId = empByName.id;
          addToHistory(`✅ Found employee: ${empByName.name}`);
        } else {
          addToHistory(`❌ No user found matching "${targetInput}"`);
          return;
        }
      } else {
        // Direct ID lookup
        const { data: emp } = await supabase
          .from('employees')
          .select('id, name')
          .eq('id', targetUserId)
          .maybeSingle();
        
        const { data: client } = await supabase
          .from('clients')
          .select('id, username, mail_handle')
          .eq('id', targetUserId)
          .maybeSingle();
        
        empData = emp;
        clientData = client;
        
        if (!empData && !clientData) {
          addToHistory(`❌ User ID "${targetUserId}" not found`);
          return;
        }
      }
      
      const userType = empData ? 'employee' : 'client';
      const username = empData?.name || clientData?.username || 'Unknown';
      const email = clientData?.mail_handle || null;
      
      // Insert ban record
      const { error } = await supabase.from('banned_users').upsert({
        user_id: targetUserId,
        user_type: userType,
        email: email,
        username: username,
        banned_by: userId,
        ban_reason: reason || 'No reason provided',
        is_permanent: true,
      }, {
        onConflict: 'user_id'
      });
      
      if (error) {
        addToHistory(`❌ Failed to ban: ${error.message}`);
        return;
      }
      
      addToHistory(`🔨 BANNED: ${username} (${targetUserId})`);
      addToHistory(`   Type: ${userType}`);
      if (reason) addToHistory(`   Reason: ${reason}`);
    } catch (err) {
      addToHistory(`❌ Error: ${err}`);
    }
  }, [isBanAdmin, userId, addToHistory]);

  // Unban a user (only ban admins can do this)
  // Can accept user_id, email, or username - same as ban
  const unbanUser = useCallback(async (targetInput: string) => {
    if (!isBanAdmin) {
      addToHistory('❌ ACCESS DENIED - Only Bernardo/Logan can unban');
      return;
    }
    
    try {
      let targetUserId = targetInput;
      let foundUsername = targetInput;
      
      // Check if input looks like a UUID (contains dashes) or numeric ID (employee)
      const isDirectId = targetInput.includes('-') || /^\d+$/.test(targetInput);
      
      if (!isDirectId) {
        // Search by email or username in banned_users table first
        addToHistory(`🔍 Searching for "${targetInput}"...`);
        
        // Check banned_users by username or email
        const { data: bannedByUsername } = await supabase
          .from('banned_users')
          .select('user_id, username, email')
          .ilike('username', targetInput)
          .maybeSingle();
        
        const { data: bannedByEmail } = await supabase
          .from('banned_users')
          .select('user_id, username, email')
          .ilike('email', targetInput)
          .maybeSingle();
        
        if (bannedByUsername) {
          targetUserId = bannedByUsername.user_id;
          foundUsername = bannedByUsername.username || targetUserId;
          addToHistory(`✅ Found banned user by username: ${foundUsername}`);
        } else if (bannedByEmail) {
          targetUserId = bannedByEmail.user_id;
          foundUsername = bannedByEmail.username || targetUserId;
          addToHistory(`✅ Found banned user by email: ${foundUsername}`);
        } else {
          // Try searching in clients/employees tables
          const { data: clientByEmail } = await supabase
            .from('clients')
            .select('id, username, mail_handle')
            .ilike('mail_handle', targetInput)
            .maybeSingle();
          
          const { data: clientByUsername } = await supabase
            .from('clients')
            .select('id, username, mail_handle')
            .ilike('username', targetInput)
            .maybeSingle();
          
          const { data: empByName } = await supabase
            .from('employees')
            .select('id, name')
            .ilike('name', targetInput)
            .maybeSingle();
          
          if (clientByEmail) {
            targetUserId = clientByEmail.id;
            foundUsername = clientByEmail.username;
          } else if (clientByUsername) {
            targetUserId = clientByUsername.id;
            foundUsername = clientByUsername.username;
          } else if (empByName) {
            targetUserId = empByName.id;
            foundUsername = empByName.name;
          } else {
            addToHistory(`❌ No user found matching "${targetInput}"`);
            return;
          }
          addToHistory(`✅ Found user: ${foundUsername}`);
        }
      } else {
        // Check if this ID is actually banned
        const { data: banRecord } = await supabase
          .from('banned_users')
          .select('username')
          .eq('user_id', targetUserId)
          .maybeSingle();
        
        if (banRecord?.username) {
          foundUsername = banRecord.username;
        }
      }
      
      // First check if user is actually banned
      const { data: existingBan } = await supabase
        .from('banned_users')
        .select('user_id')
        .eq('user_id', targetUserId)
        .maybeSingle();
      
      if (!existingBan) {
        addToHistory(`⚠️ User "${foundUsername}" is not banned`);
        return;
      }
      
      // Now delete the ban
      const { error } = await supabase
        .from('banned_users')
        .delete()
        .eq('user_id', targetUserId);
      
      if (error) {
        addToHistory(`❌ Failed to unban: ${error.message}`);
        return;
      }
      
      addToHistory(`✅ UNBANNED: ${foundUsername} (${targetUserId})`);
    } catch (err) {
      addToHistory(`❌ Error: ${err}`);
    }
  }, [isBanAdmin, addToHistory]);

  // List all banned users (only ban admins can see this)
  const listBanned = useCallback(async () => {
    if (!isBanAdmin) {
      addToHistory('❌ ACCESS DENIED - Only Bernardo/Logan can view');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('banned_users')
        .select('*')
        .order('banned_at', { ascending: false });
      
      if (error) {
        addToHistory(`❌ Error: ${error.message}`);
        return;
}

      if (!data || data.length === 0) {
        addToHistory('📋 No banned users');
        return;
      }
      
      addToHistory('');
      addToHistory('🔨 BANNED USERS:');
      addToHistory('━━━━━━━━━━━━━━━━');
      data.forEach((ban) => {
        addToHistory(`${ban.username || ban.user_id} (${ban.user_type})`);
        addToHistory(`  ID: ${ban.user_id}`);
        addToHistory(`  Reason: ${ban.ban_reason || 'None'}`);
        addToHistory('');
      });
    } catch (err) {
      addToHistory(`❌ Error: ${err}`);
    }
  }, [isBanAdmin, addToHistory]);

  // List all users (clients) - admin or authenticated guest
  const listUsers = useCallback(async () => {
    if (!isBanAdmin && !guestAuthenticated) {
      addToHistory('❌ ACCESS DENIED - Requires terminal access');
      return;
      }
    
    try {
      // Fetch clients
      const { data: clients, error: clientErr } = await supabase
        .from('clients')
        .select('id, username, mail_handle')
        .order('created_at', { ascending: false });
      
      if (clientErr) {
        addToHistory(`❌ Error: ${clientErr.message}`);
        return;
      }
      
      addToHistory('');
      addToHistory('👥 CLIENTS:');
      addToHistory('━━━━━━━━━━━');
      if (!clients || clients.length === 0) {
        addToHistory('  No clients found');
    } else {
        clients.forEach((c: { id: string; username: string; mail_handle: string }) => {
          addToHistory(`${c.username || 'no-name'}`);
          addToHistory(`  ID: ${c.id}`);
          addToHistory(`  Handle: @${c.mail_handle || 'none'}`);
          addToHistory('');
        });
      }
    } catch (err) {
      addToHistory(`❌ Error: ${err}`);
    }
  }, [isBanAdmin, guestAuthenticated, addToHistory]);

  // Give items to another player (admin or authenticated guest)
  const giveToPlayer = useCallback(async (username: string, type: string, amount: number) => {
    if (!isBanAdmin && !guestAuthenticated) {
      addToHistory('❌ ACCESS DENIED - Requires terminal access');
      return;
    }

    try {
      // Find user by username (case insensitive)
      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .select('id, username')
        .ilike('username', username)
        .maybeSingle();

      // Also check employees
      const { data: employeeData, error: employeeErr } = await supabase
        .from('employees')
        .select('id, name')
        .ilike('name', username)
        .maybeSingle();

      const targetUser = clientData || employeeData;
      const targetName = clientData?.username || employeeData?.name;
      const targetId = targetUser?.id;

      if (!targetUser || !targetId) {
        addToHistory(`❌ User "${username}" not found`);
        return;
      }

      // Fetch their game data
      const { data: gameData, error: gameErr } = await supabase
        .from('user_game_data')
        .select('*')
        .eq('user_id', targetId)
        .maybeSingle();

      if (gameErr) {
        addToHistory(`❌ Error fetching game data: ${gameErr.message}`);
        return;
      }

      if (!gameData) {
        addToHistory(`❌ No game data for ${targetName}. They need to play first.`);
        return;
      }

      // Update based on type
      // Always update timestamp so receiving player's sync will pick up the change
      let updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      let successMsg = '';

      switch (type.toLowerCase()) {
        case 'money':
          updateData.yates_dollars = (gameData.yates_dollars || 0) + amount;
          successMsg = `💰 Gave $${amount.toLocaleString()} to ${targetName}!`;
          break;
        case 'tokens':
          updateData.prestige_tokens = (gameData.prestige_tokens || 0) + amount;
          successMsg = `✨ Gave ${amount} prestige tokens to ${targetName}!`;
          break;
        case 'miners':
          updateData.miner_count = Math.min(420, (gameData.miner_count || 0) + amount);
          successMsg = `👷 Gave ${amount} miners to ${targetName}!`;
          break;
        case 'trinket':
          // Give a trinket by ID
          const trinketId = String(amount); // amount is actually the trinket ID for this type
          const currentTrinkets = gameData.owned_trinket_ids || [];
          if (currentTrinkets.includes(trinketId)) {
            addToHistory(`❌ ${targetName} already owns that trinket`);
            return;
          }
          updateData.owned_trinket_ids = [...currentTrinkets, trinketId];
          successMsg = `💎 Gave trinket "${trinketId}" to ${targetName}!`;
          break;
        case 'pcx':
        case 'pickaxe':
          // Give a pickaxe by ID
          const pcxId = amount;
          const currentPickaxes = gameData.owned_pickaxe_ids || [1];
          if (currentPickaxes.includes(pcxId)) {
            addToHistory(`❌ ${targetName} already owns pickaxe #${pcxId}`);
            return;
          }
          updateData.owned_pickaxe_ids = [...currentPickaxes, pcxId];
          successMsg = `⛏️ Gave pickaxe #${pcxId} to ${targetName}!`;
          break;
        default:
          addToHistory(`❌ Unknown type: ${type}. Use: money, tokens, miners, trinket, pcx`);
          return;
      }

      // Save to Supabase
      const { error: updateErr } = await supabase
        .from('user_game_data')
        .update(updateData)
        .eq('user_id', targetId);

      if (updateErr) {
        addToHistory(`❌ Update failed: ${updateErr.message}`);
        return;
      }

      addToHistory(successMsg);
      addToHistory(`📊 ${targetName}'s new balance:`);
      if (type.toLowerCase() === 'money') {
        addToHistory(`   💵 $${(updateData.yates_dollars as number).toLocaleString()}`);
      } else if (type.toLowerCase() === 'tokens') {
        addToHistory(`   ✨ ${updateData.prestige_tokens} tokens`);
      } else if (type.toLowerCase() === 'miners') {
        addToHistory(`   👷 ${updateData.miner_count} miners`);
      }
      addToHistory('');
      addToHistory(`⚠️ Tell ${targetName} to REFRESH their game to see it!`);
    } catch (err) {
      addToHistory(`❌ Error: ${err}`);
    }
  }, [isBanAdmin, guestAuthenticated, addToHistory]);

  const executeCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    addToHistory(`> ${trimmed}`);

    // S0 command - sign out of terminal (for guests)
    if (trimmed.toUpperCase() === 'S0') {
      if (!isEmployee && guestAuthenticated) {
        setGuestAuthenticated(false);
        setHistory([
          '🔒 ADMIN TERMINAL',
          '🚪 Signed out. Later!',
          '',
        ]);
        addToHistory('');
      } else if (isEmployee) {
        addToHistory('❌ Employees don\'t need to sign out, silly');
      } else {
        addToHistory('❌ You\'re not even signed in bro');
      }
      return;
    }

    // Check access - must be employee OR authenticated guest
    const hasAccess = isEmployee || guestAuthenticated;
    if (!hasAccess && trimmed !== 'clear' && trimmed !== 'clear()') {
      addToHistory('❌ ACCESS DENIED - Need password first');
      return;
    }

    // Parse command
    if (trimmed === 'help') {
      addToHistory('');
      addToHistory('⛏️ CHEAT CODES (shhh 🤫):');
      addToHistory('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addToHistory('reset          - Nuke your progress lmao');
      addToHistory('miners [amt]   - Hire some homies');
      addToHistory('trinket [id]   - Steal a trinket');
      addToHistory('trinkets       - List the goods');
      addToHistory('autoprestige   - AFK mode activated');
      addToHistory('cm             - Cheat Mode™ (auto-click + auto-buy)');
      addToHistory('unblock        - Get out of jail free card');
      addToHistory('ability        - Test ability pickaxes + $50M');
      addToHistory('clear          - Clean up your crimes');
      addToHistory('clearhistory   - Wipe command history (↑↓)');
      addToHistory('allachv        - Unlock ALL achievements');
      addToHistory('titles         - List all Pro Player titles');
      addToHistory('side [l/d]     - Switch to Light or Darkness');
      if (!isEmployee && guestAuthenticated) {
        addToHistory('');
        addToHistory('🚪 GUEST COMMANDS:');
        addToHistory('━━━━━━━━━━━━━━━━━━');
        addToHistory('S0             - Sign out of terminal');
      }
      if (isBanAdmin) {
        addToHistory('');
        addToHistory('🔨 ADMIN COMMANDS (Bernardo/Logan only):');
        addToHistory('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        addToHistory('maxall         - Max Progressive Upgrades ⬆️');
        addToHistory(`pcx [id]       - Yoink a pickaxe (1-${PICKAXES.length})`);
        addToHistory('allpcx         - Give me ALL the pickaxes 😈');
        addToHistory(`allrocks       - Unlock all ${ROCKS.length} rocks`);
        addToHistory('money [amt]    - Money printer go brrrr 💸');
        addToHistory('tokens [amt]   - Free prestige tokens!');
        addToHistory('prestige       - Skip the grind 😎');
        addToHistory('title [id]     - Give yourself a title');
        addToHistory('users          - List all clients');
        addToHistory('give [user] [type] [amt/id]');
        addToHistory('               - Types: money, tokens, miners, trinket, pcx');
        addToHistory('ban [id/email/name] [reason]');
        addToHistory('unban [id]     - Unban a user');
        addToHistory('banned         - List all banned');
        addToHistory('wt.spwn        - Spawn Wandering Trader 🧙');
        addToHistory('stks [amt]     - Give yourself Stokens 💎');
        addToHistory('alltrinkets    - All trinkets + relics + talismans 💍');
      } else if (isEmployee) {
        addToHistory('');
        addToHistory('🔒 BAN COMMANDS (Employees only - no guests):');
        addToHistory('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        addToHistory('ban [id/email/name] [reason]');
        addToHistory('unban [id]     - Unban a user');
        addToHistory('banned         - List all banned');
      }
      addToHistory('');
    } 
    else if (trimmed === 'reset') {
      resetGame();
      addToHistory('💀 RIP your progress. Gone. Reduced to atoms.');
      addToHistory('   Refresh to complete the ritual.');
    }
    // Give pickaxe (admin or authenticated guest)
    else if (trimmed.startsWith('pcx ')) {
      if (!isBanAdmin && !guestAuthenticated) {
        addToHistory(`❌ Pickaxe command requires terminal access.`);
      } else {
        const idStr = trimmed.slice(4).trim();
        const id = parseInt(idStr, 10);
        if (isNaN(id) || id < 1 || id > PICKAXES.length) {
          addToHistory(`❌ Invalid pickaxe ID. Use 1-${PICKAXES.length}`);
        } else {
          givePickaxe(id);
          equipPickaxe(id);
          const pcx = PICKAXES.find(p => p.id === id);
          addToHistory(`⛏️ Gave pickaxe: ${pcx?.name} (ID: ${id})`);
        }
      }
    }
    // Give all pickaxes (admin or authenticated guest)
    else if (trimmed === 'allpcx') {
      if (!isBanAdmin && !guestAuthenticated) {
        addToHistory(`❌ All pickaxes command requires terminal access.`);
      } else {
        PICKAXES.forEach(p => {
          givePickaxe(p.id);
        });
        equipPickaxe(PICKAXES[PICKAXES.length - 1].id);
        addToHistory(`⛏️ ALL ${PICKAXES.length} pickaxes acquired!`);
        addToHistory('   You absolute menace 😈');
      }
    }
    // MAX ALL UPGRADES (admin or authenticated guest)
    else if (trimmed === 'maxall') {
      if (!isBanAdmin && !guestAuthenticated) {
        addToHistory(`❌ maxall requires terminal access.`);
      } else {
        maxAll();
        addToHistory('');
        addToHistory('⬆️ PROGRESSIVE UPGRADES MAXED ⬆️');
        addToHistory('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        addToHistory('⛏️ Pickaxe Strength: 500/500');
        addToHistory('💰 Money Bonus: 500/500');
        addToHistory('⚡ General Speed: 300/300');
        addToHistory('👷 Miner Speed: 200/200');
        addToHistory('💪 Miner Damage: 500/500');
        addToHistory('');
        addToHistory('All upgrades maxed out! 🚀');
      }
    }
    // All rocks command (admin or authenticated guest)
    else if (trimmed === 'allrocks') {
      if (!isBanAdmin && !guestAuthenticated) {
        addToHistory(`❌ All rocks command requires terminal access.`);
      } else {
        const maxUnlock = ROCKS[ROCKS.length - 1].unlockAtClicks;
        setTotalClicks(maxUnlock + 1000);
        addToHistory(`🪨 Unlocked ALL rocks! (${ROCKS.length} total)`);
      }
    }
    // Auto-prestige toggle (separate from CM)
    else if (trimmed === 'autoprestige') {
      toggleAutoPrestige();
      addToHistory(`🤖 Auto-prestige ${gameState.autoPrestigeEnabled ? 'DISABLED' : 'ENABLED'}`);
    }
    // Money command (admin or authenticated guest)
    else if (trimmed.startsWith('money ')) {
      if (!isBanAdmin && !guestAuthenticated) {
        addToHistory(`❌ Money printer requires terminal access.`);
      } else {
        const amtStr = trimmed.slice(6).trim();
        const amt = parseInt(amtStr, 10);
        if (isNaN(amt)) {
          addToHistory('❌ Bro that\'s not a number');
        } else {
          addMoney(amt);
          addToHistory(`💸 MONEY PRINTER GO BRRRR`);
          addToHistory(`   +$${amt.toLocaleString()} deposited into your totally legit account`);
        }
      }
    }
    // CM toggle
    else if (trimmed === 'cm') {
      setCmActive(prev => !prev);
      // Clear block and click history when toggling CM
      clearClickHistory();
      if (gameState.isBlocked) {
        dismissWarning();
      }
      if (cmActive) {
        addToHistory('🛑 Cheat Mode™ DEACTIVATED');
        addToHistory('   Back to being a normie...');
      } else {
        addToHistory('🤫 Cheat Mode™ ACTIVATED');
        addToHistory('   7 clicks/sec + auto-buy pickaxes');
        addToHistory('   You didn\'t see anything 👀');
      }
    }
    // Unblock command
    else if (trimmed === 'unblock') {
      clearClickHistory();
      if (gameState.isBlocked) {
        dismissWarning();
        addToHistory('✅ Block cleared - you can click again');
      } else {
        addToHistory('✅ Click history cleared');
      }
    }
    // Ability test command - gives Heavens pickaxe (ID 17) + money
    else if (trimmed === 'ability') {
      // Give pickaxes 1-17 (Heavens has first ability)
      for (let i = 1; i <= 17; i++) {
        buyPickaxe(i);
      }
      equipPickaxe(17);
      addMoney(50000000); // $50M to use abilities
      addToHistory('✨ ABILITY TEST MODE:');
      addToHistory('   Got Heavens pickaxe (ID 17)');
      addToHistory('   +$50M for ability costs');
      addToHistory('');
      addToHistory('📋 Pickaxes with abilities:');
      addToHistory('   17: Heavens - Divine Speed (+50% miners)');
      addToHistory('   18: Demon - Demon Rage (3x damage)');
      addToHistory('   19: Nuclear - Instant break');
      addToHistory('   21: Nightmare - +15% everything');
      addToHistory('');
      addToHistory('Use "pcx 18/19/21" to switch pickaxes');
    }
    // Ban commands - EMPLOYEES ONLY (guests can't ban even with password)
    else if (trimmed.startsWith('ban ')) {
      if (!isEmployee) {
        addToHistory('❌ ACCESS DENIED - Employee only command');
        addToHistory('   Nice try tho 🖕');
        return;
      }
      const args = trimmed.slice(4).trim();
      const spaceIndex = args.indexOf(' ');
      const targetId = spaceIndex > 0 ? args.slice(0, spaceIndex) : args;
      const reason = spaceIndex > 0 ? args.slice(spaceIndex + 1) : undefined;
      banUser(targetId, reason);
    }
    else if (trimmed.startsWith('unban ')) {
      if (!isEmployee) {
        addToHistory('❌ ACCESS DENIED - Employee only command');
        addToHistory('   Nice try tho 🖕');
        return;
      }
      const targetId = trimmed.slice(6).trim();
      unbanUser(targetId);
    }
    else if (trimmed === 'banned') {
      listBanned();
    }
    else if (trimmed === 'users') {
      listUsers();
    }
    // Give command - give items to other players
    else if (trimmed.startsWith('give ')) {
      const parts = trimmed.slice(5).trim().split(' ');
      if (parts.length < 3) {
        addToHistory('❌ Usage: give [username] [type] [amount]');
        addToHistory('   Types: money, tokens, miners');
        addToHistory('   Example: give Logan money 1000000');
      } else {
        const [username, type, amtStr] = parts;
        const amount = parseInt(amtStr, 10);
        if (isNaN(amount) || amount <= 0) {
          addToHistory('❌ Invalid amount. Must be a positive number.');
        } else {
          giveToPlayer(username, type, amount);
        }
      }
    }
    else if (trimmed === 'clear' || trimmed === 'clear()') {
      setHistory(['🔒 ADMIN TERMINAL', '💀 Evidence destroyed. You\'re welcome.', '']);
    }
    // Clear command history from localStorage
    else if (trimmed === 'clearhistory') {
      setCommandHistory([]);
      localStorage.removeItem('yates-terminal-history');
      addToHistory('🧹 Command history wiped. No witnesses.');
    }
    // List all titles
    else if (trimmed === 'titles') {
      addToHistory('');
      addToHistory('👑 PRO PLAYER TITLES:');
      addToHistory('━━━━━━━━━━━━━━━━━━━━━━━');
      TITLES.forEach(t => {
        const owned = gameState.ownedTitleIds?.includes(t.id) ? '✅' : '❌';
        addToHistory(`${owned} ${t.id} - ${t.name} (${t.category})`);
      });
      addToHistory('');
      addToHistory('Use: title [id] to yoink one');
    }
    // Give a specific title (admin or authenticated guest)
    else if (trimmed.startsWith('title ')) {
      if (!isBanAdmin && !guestAuthenticated) {
        addToHistory(`❌ Title command requires terminal access.`);
      } else {
        const titleId = trimmed.slice(6).trim();
        const title = TITLES.find(t => t.id === titleId);
        if (!title) {
          addToHistory(`❌ Unknown title: ${titleId}`);
          addToHistory('Use "titles" to see available IDs');
        } else {
          giveTitle(titleId);
          equipTitle(titleId);
          addToHistory(`👑 You are now: ${title.name}`);
          addToHistory(`   ${title.icon} ${title.description}`);
          addToHistory('   Check Achievements panel to see it!');
        }
      }
    }
    // Change side/path (Light or Darkness) - force=true to allow switching
    else if (trimmed.startsWith('side ')) {
      const side = trimmed.slice(5).trim().toLowerCase();
      if (side === 'l' || side === 'light') {
        selectPath('light', true); // force=true for admin override
        addToHistory('☀️ Switched to the LIGHT path!');
        addToHistory('   +50% trinket effects, +30% money');
        addToHistory('   Unlocked: Sun pickaxe, Angel rock');
      } else if (side === 'd' || side === 'dark' || side === 'darkness') {
        selectPath('darkness', true); // force=true for admin override
        addToHistory('🌑 Switched to the DARKNESS path!');
        addToHistory('   Unlocked: Demon, Nightmare, Galaxy pickaxes');
        addToHistory('   Unlocked: Devil, Moon rocks');
        addToHistory('   Miner sacrifice & Golden Cookie available!');
      } else {
        addToHistory('❌ Invalid side. Use: side l (light) or side d (darkness)');
      }
    }
    // Give ALL achievements (NO titles - those are admin only)
    else if (trimmed === 'allachv') {
      // Give all achievements
      unlockAllAchievements();

      addToHistory('');
      addToHistory('🏆 ALL ACHIEVEMENTS UNLOCKED');
      addToHistory(`   ${ACHIEVEMENTS.length} achievements acquired`);
      addToHistory('   (Titles are admin-only now, nice try)');
      addToHistory('');
      addToHistory('👑 ALL TITLES UNLOCKED');
      addToHistory(`   ${TITLES.length} titles acquired`);
      addToHistory('   Equipped: Da Goat 🐐');
      addToHistory('');
      addToHistory('You absolute legend 😎');
    }
    // Miners command
    else if (trimmed.startsWith('miners ')) {
      const amtStr = trimmed.slice(7).trim();
      const amt = parseInt(amtStr, 10);
      if (isNaN(amt) || amt <= 0) {
        addToHistory('❌ Invalid amount. Usage: miners 10');
      } else {
        addMiners(amt);
        addToHistory(`👷 Added ${amt} miners!`);
      }
    }
    // Trinket list command
    else if (trimmed === 'trinkets') {
      addToHistory('');
      addToHistory('💍 AVAILABLE TRINKETS:');
      addToHistory('━━━━━━━━━━━━━━━━━━━━━━━');
      TRINKETS.forEach(t => {
        addToHistory(`${t.id} - ${t.name} (${t.rarity})`);
      });
      addToHistory('');
      addToHistory('Use: trinket [id]');
    }
    // Trinket give command
    else if (trimmed.startsWith('trinket ')) {
      const trinketId = trimmed.slice(8).trim();
      const trinket = TRINKETS.find(t => t.id === trinketId);
      if (!trinket) {
        addToHistory(`❌ Unknown trinket: ${trinketId}`);
        addToHistory('Use "trinkets" to see available IDs');
      } else {
        giveTrinket(trinketId);
        addToHistory(`💍 Gave trinket: ${trinket.name}`);
      }
    }
    else if (trimmed === 'alltrinkets') {
      if (!isBanAdmin) {
        addToHistory('❌ Admin only command.');
      } else {
        giveAllTrinkets();
        addToHistory('💍 Gave ALL trinkets, relics, and talismans.');
        addToHistory(`   ${TRINKETS.length} trinkets + ${TRINKETS.length} relics + ${TRINKETS.length} talismans = ${TRINKETS.length * 3} items`);
      }
    }
    // Prestige tokens command (admin or authenticated guest)
    else if (trimmed.startsWith('tokens ')) {
      if (!isBanAdmin && !guestAuthenticated) {
        addToHistory(`❌ Tokens command requires terminal access.`);
      } else {
        const amtStr = trimmed.slice(7).trim();
        const amt = parseInt(amtStr, 10);
        if (isNaN(amt) || amt <= 0) {
          addToHistory('❌ Invalid amount. Usage: tokens 10');
        } else {
          addPrestigeTokens(amt);
          addToHistory(`✨ Added ${amt} prestige tokens!`);
        }
      }
    }
    // Force prestige command (admin or authenticated guest)
    else if (trimmed === 'prestige') {
      if (!isBanAdmin && !guestAuthenticated) {
        addToHistory(`❌ Force prestige requires terminal access.`);
      } else {
        const result = prestige(true); // Force=true bypasses requirements
        if (result) {
          addToHistory(`⚡ Force prestige activated!`);
          addToHistory(`✨ New multiplier: ${result.newMultiplier.toFixed(1)}x`);
        } else {
          addToHistory(`❌ Prestige failed (unknown error)`);
        }
      }
    }
    // Spawn Wandering Trader (admin or authenticated guest)
    else if (trimmed === 'wt.spwn') {
      if (!isBanAdmin && !guestAuthenticated) {
        addToHistory(`❌ Wandering Trader spawn requires terminal access.`);
      } else if (gameState.chosenPath !== 'darkness') {
        addToHistory(`❌ Wandering Trader only appears on Darkness path!`);
        addToHistory('   Use: side d');
      } else {
        const success = spawnWanderingTrader();
        if (success) {
          addToHistory('🧙 A Wandering Trader approaches...');
          addToHistory('   Click on him to see his wares!');
        } else {
          addToHistory('❌ Failed to spawn trader');
        }
      }
    }
    // Give Stokens (admin or authenticated guest)
    else if (trimmed.startsWith('stks ')) {
      if (!isBanAdmin && !guestAuthenticated) {
        addToHistory(`❌ Stokens command requires terminal access.`);
      } else {
        const amtStr = trimmed.slice(5).trim();
        const amt = parseInt(amtStr, 10);
        if (isNaN(amt) || amt <= 0) {
          addToHistory('❌ Invalid amount. Use: stks [number]');
        } else {
          addStokens(amt);
          addToHistory(`💎 +${amt} Stokens added!`);
          addToHistory(`   Total: ${gameState.stokens + amt} Stokens`);
        }
      }
    }
    else {
      addToHistory(`❌ Unknown command: ${trimmed}`);
      addToHistory('Type help for available commands');
    }
  }, [addToHistory, resetGame, buyPickaxe, equipPickaxe, isEmployee, isBanAdmin, cmActive, banUser, unbanUser, listBanned, listUsers, giveToPlayer, addMoney, addMiners, addPrestigeTokens, giveTrinket, setTotalClicks, prestige, toggleAutoPrestige, gameState.autoPrestigeEnabled, gameState.isBlocked, gameState.chosenPath, gameState.stokens, dismissWarning, clearClickHistory, givePickaxe, selectPath, maxAll, spawnWanderingTrader, addStokens, guestAuthenticated]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      // Add to command history and save to localStorage
      const newHistory = [...commandHistory, input.trim()].slice(-50); // Keep last 50 commands
      setCommandHistory(newHistory);
      localStorage.setItem('yates-terminal-history', JSON.stringify(newHistory));
      setHistoryIndex(-1);
      executeCommand(input);
      setInput('');
    }
  };

  // Handle arrow key navigation through command history
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      
      const newIndex = historyIndex === -1 
        ? commandHistory.length - 1 
        : Math.max(0, historyIndex - 1);
      
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex]);
    } 
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      
      const newIndex = historyIndex + 1;
      
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    }
  };

  // Only hide if terminal is not open
  if (!isOpen) return null;

  // Show password screen for non-employees who haven't authenticated
  if (!isEmployee && !guestAuthenticated) {
    return (
      <div
        ref={terminalRef}
        className="fixed bottom-4 right-4 w-80 sm:w-96 bg-black/95 border border-red-500/50 rounded-lg shadow-2xl shadow-red-500/20 z-[200] font-mono text-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-red-500/30 bg-red-900/20">
          <div className="flex items-center gap-2">
            <span className="text-red-400">🔒</span>
            <span className="text-red-300 text-xs">ADMIN TERMINAL</span>
          </div>
          <button
            onClick={handleClose}
            className="text-red-500 hover:text-red-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Password Prompt */}
        <div className="p-4 space-y-4">
          <div className="text-center">
            <div className="text-red-400 text-2xl mb-2">🔐</div>
            <div className="text-red-300 text-sm">Access Restricted</div>
            <div className="text-red-500/70 text-xs mt-1">Enter the terminal password</div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              ref={passwordInputRef}
              type="text"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value.toUpperCase())}
              className="w-full bg-red-900/20 border border-red-500/30 rounded px-3 py-2 text-red-300 text-center tracking-widest text-lg font-bold outline-none focus:border-red-500/60 placeholder-red-700/50"
              placeholder="XXXXXX"
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
            />
            {passwordError && (
              <div className="text-red-500 text-xs text-center">{passwordError}</div>
            )}
            <button
              type="submit"
              className="w-full bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 rounded py-2 text-red-300 text-sm transition-colors"
            >
              Authenticate
            </button>
          </form>

          <div className="text-center text-red-600/50 text-xs">
            Ask an employee for the password
          </div>
        </div>
      </div>
    );
  }

  // Full terminal access (employee or authenticated guest)
  return (
    <div
      ref={terminalRef}
      className="fixed bottom-4 right-4 w-80 sm:w-96 bg-black/95 border border-red-500/50 rounded-lg shadow-2xl shadow-red-500/20 z-[200] font-mono text-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-red-500/30 bg-red-900/20">
        <div className="flex items-center gap-2">
          <span className="text-red-400">{isEmployee ? '🔒' : '🔓'}</span>
          <span className="text-red-300 text-xs">
            {isEmployee ? 'ADMIN TERMINAL' : 'GUEST ACCESS'}
          </span>
          {cmActive && (
            <span className="text-yellow-400 text-xs animate-pulse">[CM]</span>
          )}
          {!isEmployee && guestAuthenticated && (
            <span className="text-green-400 text-xs">[AUTH]</span>
          )}
        </div>
        <button
          onClick={handleClose}
          className="text-red-500 hover:text-red-300 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* History */}
      <div
        ref={historyRef}
        className="h-48 overflow-y-auto p-3 text-red-400 text-xs space-y-0.5"
      >
        {history.map((line, i) => (
          <div key={i} className={line.startsWith('>') ? 'text-red-200' : ''}>
            {line || '\u00A0'}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-red-500/30">
        <div className="flex items-center px-3 py-2">
          <span className="text-red-500 mr-2">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-red-300 outline-none placeholder-red-700"
            placeholder={isEmployee ? "admin command..." : "guest command..."}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </form>
    </div>
  );
}
