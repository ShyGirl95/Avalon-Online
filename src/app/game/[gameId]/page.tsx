
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, FormEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, ShieldCheck, ShieldAlert, Users, MessageSquare, Crown, Swords, SendHorizontal, Check, X, Lock, Unlock, RefreshCcw, Play, Eye, ChevronUp, ChevronDown, UserPlus, UserX, ThumbsUp, ThumbsDown, CircleDot, Circle, Shield, UserCheck, ListChecks, Target } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

type GamePhase = 'loading' | 'lobby_setup' | 'role_reveal' | 'team_selection' | 'team_voting' | 'mission_play' | 'assassination' | 'game_over';
type AvalonRole = 'Merlin' | 'Percival' | 'Loyal Servant of Arthur' | 'Morgana' | 'Assassin' | 'Mordred' | 'Oberon' | 'Minion of Mordred' | 'Unknown';
type PlayerStatus = 'Ready' | 'Not Ready' | 'Offline';

interface RoleDetail {
  name: AvalonRole;
  alignment: 'Good' | 'Evil';
  isActiveRole: boolean;
  description: string;
  longDescription?: string;
}

const ROLES_DATA: Record<AvalonRole, RoleDetail> = {
  'Merlin': { name: 'Merlin', alignment: 'Good', isActiveRole: true, description: "Sees Evil (except Mordred)", longDescription: "You are Merlin! You know who is Evil, but they must not discover you. Mordred is hidden from your sight." },
  'Percival': { name: 'Percival', alignment: 'Good', isActiveRole: true, description: "Sees Merlin & Morgana", longDescription: "You are Percival! You see Merlin and Morgana, but do not know which is which." },
  'Loyal Servant of Arthur': { name: 'Loyal Servant of Arthur', alignment: 'Good', isActiveRole: false, description: "Servant of Good", longDescription: "You are a Loyal Servant of Arthur. Uphold the light and identify your allies!" },
  'Morgana': { name: 'Morgana', alignment: 'Evil', isActiveRole: true, description: "Appears as Merlin to Percival", longDescription: "You are Morgana! You appear as Merlin to Percival. Deceive him to protect your Evil comrades." },
  'Assassin': { name: 'Assassin', alignment: 'Evil', isActiveRole: true, description: "Can assassinate Merlin", longDescription: "You are the Assassin! If Good wins 3 quests, you have one chance to identify and assassinate Merlin to seize victory for Evil." },
  'Mordred': { name: 'Mordred', alignment: 'Evil', isActiveRole: true, description: "Unknown to Merlin", longDescription: "You are Mordred! Merlin does not know your identity. Lead the forces of Evil from the shadows." },
  'Oberon': { name: 'Oberon', alignment: 'Evil', isActiveRole: true, description: "Unknown to other Evil", longDescription: "You are Oberon! You are Evil, but do not know your fellow Minions of Mordred, and they do not know you." },
  'Minion of Mordred': { name: 'Minion of Mordred', alignment: 'Evil', isActiveRole: false, description: "Servant of Evil", longDescription: "You are a Minion of Mordred. Work with your allies to sabotage quests and ensure Evil prevails!" },
  'Unknown': { name: 'Unknown', alignment: 'Good', isActiveRole: false, description: "Role not yet assigned", longDescription: "Your destiny will soon be revealed." }
};


interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: AvalonRole;
  isMuted?: boolean;
  isCurrentLeader?: boolean;
  isOnline?: boolean;
  status: PlayerStatus;
  isBot?: boolean;
  "data-ai-hint"?: string;
}

const initialPlayersSetup = (playerId: string, playerName: string): { players: Player[], spectators: Player[] } => {
  const humanPlayer: Player = { id: playerId, name: playerName, avatarUrl: `https://placehold.co/40x40.png`, isOnline: true, status: 'Ready', role: 'Unknown', isBot: false };
  const botSpectators: Player[] = [
    { id: 'bot-guinevere', name: 'Guinevere', avatarUrl: `https://placehold.co/40x40.png`, isOnline: true, status: 'Ready', role: 'Unknown', isBot: true, "data-ai-hint": "female queen" },
    { id: 'bot-lancelot', name: 'Lancelot', avatarUrl: `https://placehold.co/40x40.png`, isOnline: true, status: 'Ready', role: 'Unknown', isBot: true, "data-ai-hint": "male knight" },
    { id: 'bot-uther', name: 'Uther', avatarUrl: `https://placehold.co/40x40.png`, isOnline: true, status: 'Ready', role: 'Unknown', isBot: true, "data-ai-hint": "male king" },
    { id: 'bot-galahad', name: 'Galahad', avatarUrl: `https://placehold.co/40x40.png`, isOnline: true, status: 'Ready', role: 'Unknown', isBot: true, "data-ai-hint": "male knight" },
  ];
  return { players: [humanPlayer], spectators: botSpectators };
};


interface Mission {
  id: number;
  status: 'pending' | 'team_selection' | 'voting' | 'in_progress' | 'success' | 'fail';
  requiredPlayers: number;
  failsRequired: number;
  team?: string[];
  votes?: Record<string, 'approve' | 'reject'>;
  results?: Record<string, 'success' | 'fail'>;
}

const initialMissions: Mission[] = [
    { id: 1, status: 'pending', requiredPlayers: 2, failsRequired: 1, votes: {}, results: {} },
    { id: 2, status: 'pending', requiredPlayers: 3, failsRequired: 1, votes: {}, results: {} },
    { id: 3, status: 'pending', requiredPlayers: 2, failsRequired: 1, votes: {}, results: {} },
    { id: 4, status: 'pending', requiredPlayers: 3, failsRequired: 1, votes: {}, results: {} },
    { id: 5, status: 'pending', requiredPlayers: 3, failsRequired: 1, votes: {}, results: {} },
];


interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const gameId = params.gameId as string;

  const [isMounted, setIsMounted] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [lobbyAdminId, setLobbyAdminId] = useState<string | null>(null);


  const [gameTitle, setGameTitle] = useState<string>('Loading game...');
  const [players, setPlayers] = useState<Player[]>([]);
  const [spectators, setSpectators] = useState<Player[]>([]);
  const [missions, setMissions] = useState<Mission[]>(initialMissions);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);

  const [goodScore, setGoodScore] = useState(0);
  const [evilScore, setEvilScore] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('loading');
  const gamePhaseRef = useRef(gamePhase);


  const [playerRoleDisplay, setPlayerRoleDisplay] = useState<string>('Unknown');
  const [isRoleRevealModalOpen, setIsRoleRevealModalOpen] = useState(false);
  const [revealedRoleDetails, setRevealedRoleDetails] = useState<RoleDetail | null>(null);
  const [seenPlayerIds, setSeenPlayerIds] = useState<Record<string, 'evil' | 'merlin_morgana_ambiguous'>>({});

  const [isLobbyLocked, setIsLobbyLocked] = useState<boolean>(true);
  const [isSpectatorsPanelOpen, setIsSpectatorsPanelOpen] = useState<boolean>(true);
  const [currentLeaderId, setCurrentLeaderId] = useState<string | null>(null);
  const currentLeaderIdRef = useRef(currentLeaderId);


  const [isProposingTeam, setIsProposingTeam] = useState<boolean>(false);
  const [selectedTeam, setSelectedTeam] = useState<Player[]>([]);
  const [wasTeamProposedByBot, setWasTeamProposedByBot] = useState(false);


  const [playerVotes, setPlayerVotes] = useState<Record<string, 'approve' | 'reject'>>({});
  const [playerHasVotedOnTeam, setPlayerHasVotedOnTeam] = useState<Record<string, boolean>>({});
  const [consecutiveRejections, setConsecutiveRejections] = useState(0);
  
  const [missionPlays, setMissionPlays] = useState<Record<string, 'success' | 'fail'>>({});
  const [playerHasPlayedMissionCard, setPlayerHasPlayedMissionCard] = useState<Record<string,boolean>>({});
  const [selectedMissionCardForPlay, setSelectedMissionCardForPlay] = useState<'success' | 'fail' | null>(null);
  
  const botVoteTimerRefs = useRef<NodeJS.Timeout[]>([]);
  const botLeaderActionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedAssassinTarget, setSelectedAssassinTarget] = useState<Player | null>(null);
  const [isAssassinSelecting, setIsAssassinSelecting] = useState<boolean>(false);
  const [assassinationDetails, setAssassinationDetails] = useState<{ targetName: string | null, reasoning: string | null }>({ targetName: null, reasoning: null });


  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  useEffect(() => {
    currentLeaderIdRef.current = currentLeaderId;
  }, [currentLeaderId]);

  useEffect(() => {
    return () => { 
      botVoteTimerRefs.current.forEach(clearTimeout);
      if (botLeaderActionTimeoutRef.current) {
        clearTimeout(botLeaderActionTimeoutRef.current);
      }
    };
  }, []);


  useEffect(() => {
    setIsMounted(true);
    const name = localStorage.getItem('playerName');
    if (!name) {
      router.push('/');
    } else {
      setPlayerName(name);
      const id = name.toLowerCase().replace(/\s+/g, '-');
      setPlayerId(id);
      setLobbyAdminId(id); 
      setGameTitle(`Avalon Game (ID: ${gameId.substring(0,6)})`);

      const existingPlayers = localStorage.getItem(`game-${gameId}-players`);
      const existingSpectators = localStorage.getItem(`game-${gameId}-spectators`);

      if (existingPlayers && existingSpectators) {
          const parsedPlayers = JSON.parse(existingPlayers);
          const parsedSpectators = JSON.parse(existingSpectators);
          setPlayers(parsedPlayers);
          setSpectators(parsedSpectators);
          resetGameProgress(id, parsedPlayers, parsedSpectators, false); 
      } else {
          const { players: initialP, spectators: initialS } = initialPlayersSetup(id, name);
          setPlayers(initialP); 
          setSpectators(initialS); 
          resetGameProgress(id, initialP, initialS, true); 
      }
      setGamePhase('lobby_setup'); 

      if (!localStorage.getItem(`game-${gameId}-toastShown`)) {
        toast({
          title: "Welcome to the Lobby!",
          description: `You are ${name}. Manage the lobby and start the game when ready. Add bots from spectators to start.`,
        });
        localStorage.setItem(`game-${gameId}-toastShown`, 'true');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, gameId]); 

  useEffect(() => {
    if (chatScrollAreaRef.current) {
      chatScrollAreaRef.current.scrollTo({ top: chatScrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (gamePhase === 'team_voting' && currentLeaderId) {
      const leaderIsVoter = false; 
      const voters = players.filter(p => leaderIsVoter ? true : p.id !== currentLeaderId);
      const votesCastCount = Object.keys(playerVotes).length;
  
      if (votesCastCount > 0 && votesCastCount >= voters.length) {
          const allVoted = voters.every(voter => playerVotes.hasOwnProperty(voter.id));
          if (allVoted) {
               const currentMissionIdx = missions.findIndex(m => m.status === 'team_voting');
               if (currentMissionIdx !== -1 && gamePhaseRef.current === 'team_voting') { 
                  processVoteResults(playerVotes, currentMissionIdx);
               }
          }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerVotes, gamePhase, players, currentLeaderId, missions]);

  useEffect(() => {
    if (gamePhase === 'team_selection' && currentLeaderId) {
        const leader = players.find(p => p.id === currentLeaderId);
        if (leader && leader.isBot) {
            if (botLeaderActionTimeoutRef.current) {
                clearTimeout(botLeaderActionTimeoutRef.current);
            }
            botLeaderActionTimeoutRef.current = setTimeout(() => {
                if (gamePhaseRef.current === 'team_selection' && currentLeaderIdRef.current === leader.id) {
                    proposeTeamByBot(leader);
                }
            }, 2000 + Math.random() * 1500); 
        }
    }
    return () => {
        if (botLeaderActionTimeoutRef.current) {
            clearTimeout(botLeaderActionTimeoutRef.current);
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase, currentLeaderId, players]);

 useEffect(() => {
    if (gamePhase === 'assassination') {
        const assassin = players.find(p => p.role === 'Assassin');
        if (assassin && assassin.isBot) {
            console.log("Bot Assassin detected, initiating random target selection...");
            const goodPlayers = players.filter(p => p.role && ROLES_DATA[p.role]?.alignment === 'Good' && p.id !== assassin.id);
            
            if (goodPlayers.length > 0) {
                const randomTarget = goodPlayers[Math.floor(Math.random() * goodPlayers.length)];
                toast({ title: `Bot Assassin targets ${randomTarget.name}`, description: `Reasoning: Random selection.` });
                setAssassinationDetails({ targetName: randomTarget.name, reasoning: "Random selection." });
                setTimeout(() => {
                    if (gamePhaseRef.current === 'assassination') {
                        handleConfirmAssassination(randomTarget);
                    }
                }, 2000 + Math.random() * 1000);
            } else {
                 toast({ title: "Bot Assassin Error", description: "No valid (Good) targets for assassination.", variant: "destructive" });
                 setGoodScore(3); 
                 setGamePhase('game_over');
            }
        } else if (assassin && playerId === assassin.id && !assassin.isBot) {
            setIsAssassinSelecting(true);
        } else {
            setIsAssassinSelecting(false); 
        }
    } else {
        setIsAssassinSelecting(false);
        setSelectedAssassinTarget(null);
        setAssassinationDetails({ targetName: null, reasoning: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase, players, playerId]);


  const resetGameProgress = (newLeaderId: string | null, currentPlayersArg: Player[], currentSpectatorsArg: Player[], isInitialSetup: boolean) => {
    setGoodScore(0);
    setEvilScore(0);
    const resetMissionsList = initialMissions.map(m => ({ ...m, status: 'pending' as Mission['status'], team: [], votes: {}, results: {} }));
    setMissions(resetMissionsList);
    setGamePhase('lobby_setup');
    
    let playersToReset = currentPlayersArg.map(p => ({
        ...p,
        role: 'Unknown' as AvalonRole,
        isCurrentLeader: p.id === newLeaderId,
        status: p.isOnline ? 'Ready' as PlayerStatus : 'Offline' as PlayerStatus
    }));
    setPlayers(playersToReset);
    
    setSpectators(currentSpectatorsArg.map(s => ({ 
        ...s, 
        role: 'Unknown' as AvalonRole, 
        status: s.isOnline ? 'Ready' as PlayerStatus : 'Offline' as PlayerStatus 
    })));


    if (newLeaderId) {
        const leaderExistsInPlayers = playersToReset.some(p => p.id === newLeaderId);
        if (leaderExistsInPlayers) {
            setCurrentLeaderId(newLeaderId);
        } else if (playersToReset.length > 0) {
            setCurrentLeaderId(playersToReset[0].id);
             setPlayers(prev => prev.map((p, idx) => idx === 0 ? {...p, isCurrentLeader: true} : {...p, isCurrentLeader: false}));
        } else {
            setCurrentLeaderId(null);
        }
    } else if (playersToReset.length > 0) {
        setCurrentLeaderId(playersToReset[0].id);
        setPlayers(prev => prev.map((p, idx) => idx === 0 ? {...p, isCurrentLeader: true} : {...p, isCurrentLeader: false}));
    } else {
        setCurrentLeaderId(null);
    }
    
    setPlayerRoleDisplay('Unknown');
    setRevealedRoleDetails(null);
    setSeenPlayerIds({});
    setIsProposingTeam(false);
    setSelectedTeam([]);
    setPlayerVotes({});
    setPlayerHasVotedOnTeam({});
    setConsecutiveRejections(0);
    setMissionPlays({});
    setPlayerHasPlayedMissionCard({});
    setSelectedMissionCardForPlay(null);
    setIsAssassinSelecting(false);
    setSelectedAssassinTarget(null);
    setAssassinationDetails({ targetName: null, reasoning: null });
    setIsLobbyLocked(true); 
    setWasTeamProposedByBot(false);
  };

  const handleTogglePlayerStatus = () => {
    if (!playerId || gamePhase !== 'lobby_setup') return;
    setPlayers(prevPlayers => 
        prevPlayers.map(p => 
            p.id === playerId 
                ? { ...p, status: p.status === 'Ready' ? 'Not Ready' : 'Ready' } 
                : p
        )
    );
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && playerName && playerId) {
      const newMessage: ChatMessage = {
        id: String(Date.now()),
        senderId: playerId,
        senderName: playerName,
        text: chatInput.trim(),
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, newMessage]);
      setChatInput('');
    }
  };

  const handleProposeTeamClick = () => {
    const currentQuestLeaderPlayer = players.find(p => p.id === currentLeaderId);
    const currentMissionDetails = missions.find(m => m.status === 'team_selection');

    if (!currentQuestLeaderPlayer || !currentMissionDetails) return;

    if (currentQuestLeaderPlayer?.id === playerId && gamePhase === 'team_selection') {
      setIsProposingTeam(true);
      setSelectedTeam([currentQuestLeaderPlayer]); 
      const playersToSelect = currentMissionDetails.requiredPlayers -1;
      toast({
        title: "Team Selection Started",
        description: `You are leading and automatically on the team. Select ${playersToSelect} more player(s).`,
      });
    } else if (currentQuestLeaderPlayer?.id !== playerId) {
         toast({
            title: "Not Your Turn",
            description: "Only the current quest leader can propose a team.",
            variant: "destructive"
        });
    }
  };

  const handlePlayerClickForTeamSelection = (player: Player) => {
    if (!isProposingTeam || playerId !== currentLeaderId || player.id === currentLeaderId) return;

    const currentMissionDetails = missions.find(m => m.status === 'team_selection');
    if (!currentMissionDetails) return;

    const isPlayerSelected = selectedTeam.find(p => p.id === player.id);

    if (isPlayerSelected) {
      setSelectedTeam(prevTeam => prevTeam.filter(p => p.id !== player.id));
    } else {
      if (selectedTeam.length < currentMissionDetails.requiredPlayers) {
        setSelectedTeam(prevTeam => [...prevTeam, player]);
      } else {
        toast({
          title: "Team Full",
          description: `You can only select ${currentMissionDetails.requiredPlayers} players for this quest (including yourself).`,
          variant: "destructive",
        });
      }
    }
  };

  const handleConfirmTeamProposal = (teamFromBot?: Player[]) => {
    const teamToConsider = teamFromBot || selectedTeam;
    const currentMissionDetails = missions.find(m => m.status === 'team_selection');

    if (!currentMissionDetails || teamToConsider.length !== currentMissionDetails.requiredPlayers) {
      toast({
        title: "Team Incomplete",
        description: `Please select exactly ${currentMissionDetails.requiredPlayers} players for the quest.`,
        variant: "destructive",
      });
      return;
    }

    const updatedMissions = missions.map(m =>
      m.id === currentMissionDetails.id
        ? { ...m, team: teamToConsider.map(p => p.id), status: 'team_voting' as const, votes: {} }
        : m
    );
    setWasTeamProposedByBot(!!teamFromBot);
    setMissions(updatedMissions);
    setGamePhase('team_voting');
    setIsProposingTeam(false); 
    if (!teamFromBot) setSelectedTeam([]); 
    setPlayerVotes({}); 
    setPlayerHasVotedOnTeam({});

    botVoteTimerRefs.current.forEach(clearTimeout);
    botVoteTimerRefs.current = [];

    const teamPlayerIds = teamToConsider.map(p => p.id);
    const allPlayersWithRoles = players; 
    const teamPlayersDetails = allPlayersWithRoles.filter(p => teamPlayerIds.includes(p.id));
    const botsToVote = allPlayersWithRoles.filter(p => p.isBot && p.id !== currentLeaderId);

    botsToVote.forEach((bot) => {
        let voteDecision: 'approve' | 'reject' = 'approve'; 
        const botRole = bot.role;
        const botRoleDetails = botRole ? ROLES_DATA[botRole] : null;

        if (!botRoleDetails) { 
            voteDecision = Math.random() > 0.5 ? 'approve' : 'reject'; 
        } else if (botRoleDetails.alignment === 'Evil') {
            const evilPlayersOnTeam = teamPlayersDetails.filter(member => {
                const memberRoleDetails = member.role ? ROLES_DATA[member.role] : null;
                return memberRoleDetails && memberRoleDetails.alignment === 'Evil';
            });
            voteDecision = evilPlayersOnTeam.length > 0 ? 'approve' : 'reject';
        } else if (botRoleDetails.alignment === 'Good') {
            if (botRole === 'Merlin') {
                const evilNonMordredOnTeam = teamPlayersDetails.some(member => {
                    const memberRoleDetails = member.role ? ROLES_DATA[member.role] : null;
                    return memberRoleDetails && memberRoleDetails.alignment === 'Evil' && member.role !== 'Mordred';
                });
                voteDecision = evilNonMordredOnTeam ? 'reject' : 'approve';
            } else if (botRole === 'Percival') {
                const merlinOnTeam = teamPlayersDetails.some(member => member.role === 'Merlin');
                const morganaOnTeam = teamPlayersDetails.some(member => member.role === 'Morgana');
                if (merlinOnTeam && morganaOnTeam) { 
                    voteDecision = 'reject';
                } else { 
                    voteDecision = 'approve';
                }
            } else { 
                voteDecision = 'approve';
            }
        }

        let delay = 2500; 
        if (bot.name === 'Lancelot') { delay = 1000; }
        else if (bot.name === 'Guinevere') { delay = 2000; }
        else if (bot.name === 'Uther') { delay = 3000; }
        else if (bot.name === 'Galahad') { delay = 4000; }
        
        const timerId = setTimeout(() => {
            if (gamePhaseRef.current === 'team_voting') { 
                setPlayerVotes(prev => ({ ...prev, [bot.id]: voteDecision }));
                setPlayerHasVotedOnTeam(prev => ({ ...prev, [bot.id]: true }));
            }
        }, delay);
        botVoteTimerRefs.current.push(timerId);
    });

    toast({
      title: "Team Proposed!",
      description: "The proposed team will now be put to a vote.",
    });
  };

  const proposeTeamByBot = (botLeader: Player) => {
    const currentMissionDetails = missions.find(m => m.status === 'team_selection');
    if (!currentMissionDetails || !botLeader.role) {
        toast({ title: "Bot Error", description: `Bot ${botLeader.name} cannot determine mission or own role.`, variant: "destructive" });
        return;
    }

    const leaderRoleDetails = ROLES_DATA[botLeader.role];
    let proposedTeam: Player[] = [botLeader];
    const otherPlayers = players.filter(p => p.id !== botLeader.id);
    const shuffledOtherPlayers = [...otherPlayers].sort(() => 0.5 - Math.random());

    const numPlayersToSelect = currentMissionDetails.requiredPlayers - 1;

    if (leaderRoleDetails.alignment === 'Evil') {
        const goodPlayersToSelect = shuffledOtherPlayers.filter(p => p.role && ROLES_DATA[p.role]?.alignment === 'Good');
        const goodPlayersForTeam = goodPlayersToSelect.slice(0, numPlayersToSelect);
        proposedTeam = [...proposedTeam, ...goodPlayersForTeam];
        
        if (proposedTeam.length < currentMissionDetails.requiredPlayers) {
            const evilTeammates = shuffledOtherPlayers.filter(p => p.role && ROLES_DATA[p.role]?.alignment === 'Evil' && !proposedTeam.find(tp => tp.id === p.id));
            const remainingNeeded = currentMissionDetails.requiredPlayers - proposedTeam.length;
            proposedTeam.push(...evilTeammates.slice(0, remainingNeeded));
        }

    } else if (botLeader.role === 'Merlin') {
        const goodTeammates = shuffledOtherPlayers.filter(p => {
            if (!p.role) return true; 
            const roleDetails = ROLES_DATA[p.role];
            return roleDetails.alignment === 'Good' || (roleDetails.alignment === 'Evil' && p.role === 'Mordred');
        });
        proposedTeam = [...proposedTeam, ...goodTeammates.slice(0, numPlayersToSelect)];
    } else if (botLeader.role === 'Percival') {
        const ambiguousPlayers = shuffledOtherPlayers.filter(p => p.role === 'Merlin' || p.role === 'Morgana');
        const goodNonAmbiguousPlayers = shuffledOtherPlayers.filter(p => p.role && ROLES_DATA[p.role]?.alignment === 'Good' && p.role !== 'Merlin' && p.role !== 'Morgana');

        if (ambiguousPlayers.length > 0 && proposedTeam.length < currentMissionDetails.requiredPlayers) {
            proposedTeam.push(ambiguousPlayers[0]); 
        }
        const remainingGoodToSelect = numPlayersToSelect - (proposedTeam.length -1);
         proposedTeam = [...proposedTeam, ...goodNonAmbiguousPlayers.slice(0, remainingGoodToSelect )];
    }
    
    const remainingSlots = currentMissionDetails.requiredPlayers - proposedTeam.length;
    if (remainingSlots > 0) {
        let availableToFill = shuffledOtherPlayers.filter(p => !proposedTeam.find(tp => tp.id === p.id));
        if (leaderRoleDetails.alignment === 'Good') {
            availableToFill = availableToFill.sort((a,b) => (ROLES_DATA[a.role!]?.alignment === 'Good' ? -1 : 1));
        }
        proposedTeam = [...proposedTeam, ...availableToFill.slice(0, remainingSlots)];
    }
    
    if (proposedTeam.length > currentMissionDetails.requiredPlayers) {
        proposedTeam = proposedTeam.slice(0, currentMissionDetails.requiredPlayers);
    }
    
    if (proposedTeam.length < currentMissionDetails.requiredPlayers) {
        const stillNeeded = currentMissionDetails.requiredPlayers - proposedTeam.length;
        const fallbackPlayers = shuffledOtherPlayers.filter(p => !proposedTeam.find(tp => tp.id === p.id));
        proposedTeam.push(...fallbackPlayers.slice(0, stillNeeded));
    }


    if (proposedTeam.length === currentMissionDetails.requiredPlayers) {
        toast({ title: `Bot ${botLeader.name} Proposes Team`, description: `Team: ${proposedTeam.map(p=>p.name).join(', ')}`});
        handleConfirmTeamProposal(proposedTeam);
    } else {
        toast({ title: "Bot Team Selection Error", description: `Bot ${botLeader.name} failed to form a valid team. Required: ${currentMissionDetails.requiredPlayers}, Selected: ${proposedTeam.length}. Passing leadership.`, variant: "destructive" });
        passLeadership();
        const nextMissionIdx = missions.findIndex(m => m.status === 'pending' || m.id === currentMissionDetails.id); 
        if (nextMissionIdx !== -1) {
            const newMissionsForNextRound = missions.map((m, idx) =>
                idx === nextMissionIdx ? { ...m, status: 'team_selection' as const, team:[], votes: {}, results: {} } : m
            );
            setMissions(newMissionsForNextRound);
        }
        setGamePhase('team_selection');
    }
  };

  const handleVote = (vote: 'approve' | 'reject') => {
    if (!playerId || playerHasVotedOnTeam[playerId] || playerId === currentLeaderId) {
        toast({ title: "Cannot Vote", description: playerId === currentLeaderId ? "Quest Leader does not vote on teams." : "You have already voted.", variant: "destructive" });
        return;
    }
    setPlayerVotes(prev => ({ ...prev, [playerId]: vote }));
    setPlayerHasVotedOnTeam(prev => ({ ...prev, [playerId]: true }));
  };

  const processVoteResults = (votes: Record<string, 'approve' | 'reject'>, missionIdx: number) => {
    if (gamePhaseRef.current !== 'team_voting') return; 

    let approveVotes = 0;
    let rejectVotes = 0;
    const votingPlayers = players.filter(p => p.id !== currentLeaderId); 

    votingPlayers.forEach(player => {
        if (votes[player.id] === 'approve') approveVotes++;
        else if (votes[player.id] === 'reject') rejectVotes++;
    });


    const updatedMissions = [...missions];
    updatedMissions[missionIdx].votes = votes;
    const isTeamApproved = rejectVotes < 3;


    if (isTeamApproved) {
        toast({ title: "Team Approved!", description: `The quest will now begin. (${approveVotes} For, ${rejectVotes} Against)` });
        updatedMissions[missionIdx].status = 'in_progress';
        setMissions(updatedMissions);
        setGamePhase('mission_play');
        setConsecutiveRejections(0); 
        setPlayerHasPlayedMissionCard({});
        setMissionPlays({});
        setSelectedMissionCardForPlay(null);

        const approvedTeamMembers = players.filter(p => updatedMissions[missionIdx].team?.includes(p.id));
        const isAllBotTeam = approvedTeamMembers.length > 0 && approvedTeamMembers.every(p => p.isBot);

        if (isAllBotTeam) {
            let botPlays: Record<string, 'success' | 'fail'> = {};
            let botPlayedFlags: Record<string, boolean> = {};
            approvedTeamMembers.forEach(bot => {
                const botRoleDetails = bot.role ? ROLES_DATA[bot.role] : null;
                botPlays[bot.id] = (botRoleDetails?.alignment === 'Good') ? 'success' : 'fail';
                botPlayedFlags[bot.id] = true;
            });
            setMissionPlays(botPlays);
            setPlayerHasPlayedMissionCard(botPlayedFlags);
            processMissionResults(botPlays, updatedMissions[missionIdx].id);
        }

    } else { 
        const newConsecutiveRejections = consecutiveRejections + 1;
        setConsecutiveRejections(newConsecutiveRejections);
        
        const rejectionMessage = `Team rejected: ${rejectVotes} 'Reject' votes (min. 3 needed for ${players.length} players). Majority of players rejected the team. Leadership passes. (${approveVotes} For, ${rejectVotes} Against). Rejection ${newConsecutiveRejections} of 4.`;
        toast({ title: "Team Rejected!", description: rejectionMessage, variant: "destructive" });

        if (newConsecutiveRejections >= 4) { 
            toast({ title: "Evil Wins!", description: "Four consecutive teams were rejected. The kingdom has fallen to darkness.", variant: "destructive" });
            setEvilScore(prev => Math.min(3, prev + 3)); 
            setGamePhase('game_over');
        } else {
            updatedMissions[missionIdx].status = 'team_selection';
            updatedMissions[missionIdx].team = []; 
            setMissions(updatedMissions);
            setGamePhase('team_selection');
            passLeadership();
        }
    }
    if (!isTeamApproved || wasTeamProposedByBot) {
        setSelectedTeam([]); 
    }
    setWasTeamProposedByBot(false); 
  };

  const handlePlayMissionCard = (card: 'success' | 'fail') => {
    if (!playerId || playerHasPlayedMissionCard[playerId]) {
        toast({ title: "Cannot Play Card", description: "You have already played a card for this mission.", variant: "destructive" });
        return;
    }

    const currentMissionDetails = missions.find(m => m.status === 'in_progress');
    if (!currentMissionDetails || !currentMissionDetails.team?.includes(playerId)) {
        toast({ title: "Not on Mission", description: "You are not part of the current quest team.", variant: "destructive" });
        return;
    }

    const player = players.find(p => p.id === playerId);
    if (player?.role && ROLES_DATA[player.role].alignment === 'Good' && card === 'fail') {
        toast({ title: "Invalid Play", description: "As a Good player, you must play 'Success'.", variant: "destructive" });
        return;
    }

    
    let newPlayerHasPlayedCard: Record<string, boolean> = { ...playerHasPlayedMissionCard, [playerId]: true };
    let newMissionPlays: Record<string, 'success' | 'fail'> = { ...missionPlays, [playerId]: card };
    setSelectedMissionCardForPlay(null); 

    
    if (currentMissionDetails.team) {
        const botsOnTeam = players.filter(p => p.isBot && currentMissionDetails.team!.includes(p.id));
        botsOnTeam.forEach(bot => {
            if (!newMissionPlays[bot.id]) { 
                const botRoleDetails = bot.role ? ROLES_DATA[bot.role] : null;
                newMissionPlays[bot.id] = (botRoleDetails?.alignment === 'Good') ? 'success' : 'fail';
                newPlayerHasPlayedCard[bot.id] = true;
            }
        });
    }
    
    setMissionPlays(newMissionPlays);
    setPlayerHasPlayedMissionCard(newPlayerHasPlayedCard);

    
    const teamMembers = currentMissionDetails.team;
    if (teamMembers && teamMembers.every(memberId => newPlayerHasPlayedCard[memberId])) {
        processMissionResults(newMissionPlays, currentMissionDetails.id);
    }
  };

  const processMissionResults = (plays: Record<string, 'success' | 'fail'>, missionId: number) => {
    const currentMissionForCheck = missions.find(m => m.id === missionId);
    if (currentMissionForCheck && (currentMissionForCheck.status === 'success' || currentMissionForCheck.status === 'fail')) {
      return; 
    }

    const currentMissionIdx = missions.findIndex(m => m.id === missionId);
    if (currentMissionIdx === -1) return;

    const missionDetails = missions[currentMissionIdx];
    const failCount = Object.values(plays).filter(p => p === 'fail').length;

    const updatedMissions = [...missions];
    updatedMissions[currentMissionIdx].results = plays;

    let newGoodScore = goodScore;
    let newEvilScore = evilScore;

    if (failCount >= missionDetails.failsRequired) {
        updatedMissions[currentMissionIdx].status = 'fail';
        newEvilScore = Math.min(3, evilScore + 1);
        setEvilScore(newEvilScore);
        toast({ title: `Mission ${missionDetails.id} Failed!`, description: `${failCount} fail card(s) played.` });
    } else {
        updatedMissions[currentMissionIdx].status = 'success';
        newGoodScore = Math.min(3, goodScore + 1);
        setGoodScore(newGoodScore);
        toast({ title: `Mission ${missionDetails.id} Succeeded!`, description: `${failCount} fail card(s) played.` });
    }
    setMissions(updatedMissions);

    if (newGoodScore >= 3 && newEvilScore < 3 && consecutiveRejections < 4) {
        toast({ title: "Good Wins 3 Quests!", description: "The Assassin now has a chance to strike!" });
        setGamePhase('assassination');
        setSelectedTeam([]);
        setPlayerVotes({});
        setPlayerHasVotedOnTeam({});
        setMissionPlays({});
        setPlayerHasPlayedMissionCard({});
        setSelectedMissionCardForPlay(null);
        setIsProposingTeam(false);
    } else if (newEvilScore >= 3 || consecutiveRejections >=4) {
        toast({ title: "Evil Wins!", description: consecutiveRejections >=4 ? "Four consecutive teams were rejected." : "The forces of Mordred are victorious!", variant: "destructive" });
        setGamePhase('game_over');
    } else {
        passLeadership();
        const missionsAfterCurrentComplete = updatedMissions.map(m => m.id === missionId ? updatedMissions[currentMissionIdx] : m);
        const nextMissionIdx = missionsAfterCurrentComplete.findIndex(m => m.status === 'pending');

        if (nextMissionIdx !== -1) {
             const newMissionsForNextRound = missionsAfterCurrentComplete.map((m, idx) =>
                idx === nextMissionIdx ? { ...m, status: 'team_selection' as const, team:[], votes: {}, results: {} } : m
            );
            setMissions(newMissionsForNextRound);
            setGamePhase('team_selection');
            setSelectedTeam([]);
            setPlayerVotes({});
            setPlayerHasVotedOnTeam({});
            setMissionPlays({});
            setPlayerHasPlayedMissionCard({});
            setSelectedMissionCardForPlay(null);
        } else {
             if (newGoodScore >=3 || newEvilScore >=3) {
                // Game should have ended
             } else {
                toast({title: "Game State Error", description: "No pending missions, but game not decided. Consider refreshing.", variant:"destructive"});
             }
        }
    }
  };

  const passLeadership = () => {
    if (players.length === 0) return;
    const currentQuestLeaderIndex = players.findIndex(p => p.id === currentLeaderId);
    const nextQuestLeaderIndex = (currentQuestLeaderIndex + 1) % players.length;
    const nextQuestLeader = players[nextQuestLeaderIndex];
    setCurrentLeaderId(nextQuestLeader.id);
    setPlayers(prevPlayers => prevPlayers.map((p, idx) => ({
        ...p,
        isCurrentLeader: idx === nextQuestLeaderIndex
    })));
  };


  const handleToggleLobbyLock = () => {
    if (playerId === lobbyAdminId && gamePhase === 'lobby_setup') {
        setIsLobbyLocked(!isLobbyLocked);
        toast({
            title: `Lobby ${!isLobbyLocked ? 'Unlocked' : 'Locked'}`,
            description: `Players can ${!isLobbyLocked ? 'now join from spectators' : 'no longer join from spectators'}.`,
        });
    }
  };

  const handleRefreshLobby = () => {
    if (playerName && playerId && playerId === lobbyAdminId) {
        const currentPlayersForReset = players.map(p => ({
            ...p,
            role: 'Unknown' as AvalonRole,
            isCurrentLeader: p.id === playerId, 
            status: p.isOnline ? 'Ready' as PlayerStatus : 'Offline' as PlayerStatus,
        }));

        const activePlayerIds = new Set(currentPlayersForReset.map(p => p.id));
        const { spectators: initialSpectatorArray } = initialPlayersSetup(playerId, playerName); 
        
        const actualSpectatorsForReset = initialSpectatorArray
            .filter(spec => !activePlayerIds.has(spec.id))
            .map(s => ({ 
                ...s, 
                role: 'Unknown' as AvalonRole, 
                status: s.isOnline ? 'Ready' as PlayerStatus : 'Offline' as PlayerStatus 
            }));
        
        resetGameProgress(playerId, currentPlayersForReset, actualSpectatorsForReset, false); 
        
        setGamePhase('lobby_setup');
        setIsLobbyLocked(true); 

        toast({
            title: "Game Progress Refreshed",
            description: "Game scores, missions, and roles reset. Active players remain with reset statuses. Spectators reset to initial configuration (if not active). You are now the quest leader.",
        });
    }
  };

const assignRoles = (currentPlayers: Player[]): Player[] => {
    const numPlayers = currentPlayers.length;
    let rolesToAssign: AvalonRole[];

    if (numPlayers === 5) {
        rolesToAssign = ['Merlin', 'Percival', 'Loyal Servant of Arthur', 'Morgana', 'Assassin'];
    } else {
        toast({
            title: "Role Assignment Error",
            description: `Cannot assign roles for ${numPlayers} players. Standard setup is for 5.`,
            variant: "destructive"
        });
        return currentPlayers.map(p => ({...p, role: 'Unknown'}));
    }

    const shuffledRoles = [...rolesToAssign].sort(() => Math.random() - 0.5);

    return currentPlayers.map((player, index) => ({
        ...player,
        role: shuffledRoles[index % shuffledRoles.length] || 'Unknown',
    }));
};


  const handleStartGame = () => {
    if (playerId !== lobbyAdminId) return;

    if (players.length !== 5) {
        toast({
            title: "Incorrect Number of Players",
            description: `You need exactly 5 players to start. Currently: ${players.length}.`,
            variant: "destructive",
        });
        return;
    }

    const offlineOrNotReadyPlayers = players.filter(p => !p.isOnline || p.status !== 'Ready');
    if (offlineOrNotReadyPlayers.length > 0) {
        const playerNames = offlineOrNotReadyPlayers.map(p => p.name).join(', ');
        toast({
            title: "Cannot Start Game",
            description: `All players must be online and 'Ready'. Problem players: ${playerNames}.`,
            variant: "destructive",
        });
        return;
    }


    const playersWithRoles = assignRoles(players);
    setPlayers(playersWithRoles);

    const currentPlayerAssigned = playersWithRoles.find(p => p.id === playerId);
    if (currentPlayerAssigned && currentPlayerAssigned.role && currentPlayerAssigned.role !== 'Unknown') {
        setRevealedRoleDetails(ROLES_DATA[currentPlayerAssigned.role]);
    } else {
        setRevealedRoleDetails(ROLES_DATA['Unknown']); 
    }

    setGamePhase('role_reveal');
    setIsRoleRevealModalOpen(true);
    setIsLobbyLocked(true); 
    setIsProposingTeam(false);
    setSelectedTeam([]);
    setConsecutiveRejections(0); 

    toast({
        title: "Game Starting!",
        description: "Roles are being assigned. Check your role!",
    });
  };

  const handleConfirmRole = () => {
    setIsRoleRevealModalOpen(false);
    const currentRoleDetails = revealedRoleDetails;
    if (currentRoleDetails) {
        const display = currentRoleDetails.isActiveRole ? currentRoleDetails.name : currentRoleDetails.alignment;
        setPlayerRoleDisplay(display);

        const newSeenPlayerIds: Record<string, 'evil' | 'merlin_morgana_ambiguous'> = {};
        const myRoleName = currentRoleDetails.name;
        const myAlignment = currentRoleDetails.alignment;

        const allPlayersWithRoles = players; 

        if (myRoleName === 'Merlin') {
            allPlayersWithRoles.forEach(p => {
                if (p.id !== playerId && p.role && ROLES_DATA[p.role]) { 
                    const targetRoleDetails = ROLES_DATA[p.role];
                    if (targetRoleDetails.alignment === 'Evil' && p.role !== 'Mordred') { 
                        newSeenPlayerIds[p.id] = 'evil';
                    }
                }
            });
        } else if (myRoleName === 'Percival') {
            allPlayersWithRoles.forEach(p => {
                if (p.id !== playerId && (p.role === 'Merlin' || p.role === 'Morgana')) {
                    newSeenPlayerIds[p.id] = 'merlin_morgana_ambiguous';
                }
            });
        } else if (myAlignment === 'Evil' && myRoleName !== 'Oberon') { 
            allPlayersWithRoles.forEach(p => {
                if (p.id !== playerId && p.role && ROLES_DATA[p.role]) {
                     const targetRoleDetails = ROLES_DATA[p.role];
                    if (targetRoleDetails.alignment === 'Evil' && p.role !== 'Oberon') { 
                        newSeenPlayerIds[p.id] = 'evil';
                    }
                }
            });
        }
        setSeenPlayerIds(newSeenPlayerIds);

        setTimeout(() => {
            setSeenPlayerIds({});
        }, 10000); 
    }

    setGamePhase('team_selection');
    const newMissions = missions.map((m, index) => ({
        ...m,
        status: index === 0 ? ('team_selection' as const) : ('pending' as const), 
        team: [], votes: {}, results: {} 
    }));
    setMissions(newMissions);
     toast({
        title: "Roles Confirmed!",
        description: "Your vision (if any) is active for 10 seconds. Proceed to team selection.",
    });
  };

  const handleSelectAssassinTarget = (player: Player) => {
    if (gamePhase !== 'assassination' || !isAssassinSelecting) return;
    const assassinPlayer = players.find(p => p.role === 'Assassin');
    if (!assassinPlayer || playerId !== assassinPlayer.id) return; 
    if (player.role && ROLES_DATA[player.role].alignment !== 'Good') {
        toast({title: "Invalid Target", description: "Assassin can only target Good players.", variant: "destructive"});
        return;
    }
    setSelectedAssassinTarget(player);
  };

  const handleConfirmAssassination = (target?: Player) => {
      const actualTarget = target || selectedAssassinTarget;
      const assassin = players.find(p => p.role === 'Assassin');

      if (gamePhase !== 'assassination' || !assassin) {
          toast({title: "Error", description: "Not in assassination phase or assassin not found.", variant: "destructive"});
          return;
      }

      if (!actualTarget) {
          toast({ title: "No Target Selected", description: "Please select a player to assassinate.", variant: "destructive" });
          return;
      }
      
      if (!target && playerId !== assassin.id && !assassin.isBot) { 
           toast({ title: "Not the Assassin", description: "Only the Assassin can perform this action.", variant: "destructive"});
           return;
      }

      const targetPlayerRole = actualTarget.role;
      let newGoodScore = goodScore;
      let newEvilScore = evilScore;

      if (targetPlayerRole === 'Merlin') {
          toast({ title: "Merlin Assassinated!", description: `${assassin.name} successfully assassinated Merlin (${actualTarget.name}). Evil wins!`, duration: 5000 });
          newEvilScore = 3; 
          newGoodScore = Math.min(newGoodScore, 2); 
      } else {
          toast({ title: "Assassination Failed!", description: `${assassin.name} targeted ${actualTarget.name}, but they were not Merlin. Goodness prevails!`, duration: 5000 });
          newGoodScore = 3; 
          newEvilScore = Math.min(newEvilScore, 2); 
      }

      setGoodScore(newGoodScore);
      setEvilScore(newEvilScore);
      setGamePhase('game_over');
      setIsAssassinSelecting(false);
      setSelectedAssassinTarget(null);
      setAssassinationDetails({ targetName: null, reasoning: null });
  };


  const handleJoinAsPlayer = (spectatorId: string) => {
    if (gamePhase !== 'lobby_setup') {
        toast({ title: "Game in Progress", description: "Cannot join as player once the game has started.", variant: "destructive"});
        return;
    }
    if (isLobbyLocked && playerId !== lobbyAdminId) { 
         toast({
            title: "Lobby Locked",
            description: "The Lobby Admin needs to unlock the lobby to allow spectators to join as players.",
            variant: "destructive",
        });
        return;
    }
    const spectatorToMove = spectators.find(s => s.id === spectatorId);
    if (spectatorToMove) {
        if (players.length >= 10) { 
            toast({ title: "Lobby Full", description: "Maximum number of players reached.", variant: "destructive"});
            return;
        }
        setPlayers(prev => [...prev, { ...spectatorToMove, role: 'Unknown', status: spectatorToMove.isOnline ? 'Ready' : 'Offline' }]);
        setSpectators(prev => prev.filter(s => s.id !== spectatorId));
        toast({
            title: `${spectatorToMove.name} Joined Game`,
            description: "They are now an active player.",
        });
    }
  };

  const currentMission = missions.find(m => m.status === 'team_selection' || m.status === 'team_voting' || m.status === 'in_progress');
  const currentQuestLeader = players.find(p => p.id === currentLeaderId);
  const currentPlayer = players.find(p => p.id === playerId);
  const lobbyAdmin = players.find(p => p.id === lobbyAdminId) || (playerId === lobbyAdminId ? currentPlayer : null) ;


  if (!isMounted || !playerName || !playerId || !lobbyAdminId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <Swords className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-xl text-muted-foreground">Loading game session...</p>
      </div>
    );
  }

  const getPlayerInitials = (name: string): string => {
    if (!name || name.trim() === "") {
      return "??";
    }
    const parts = name.trim().split(/\s+/).filter(part => part.length > 0); 
    
    if (parts.length === 0) return "??"; 

    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    
    if (parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <TooltipProvider delayDuration={100}>
    <div className="flex h-screen max-h-screen flex-col bg-background text-foreground selection:bg-primary/40 selection:text-primary-foreground">
      <header className="flex items-center justify-between p-3 border-b border-border/60 bg-card shadow-sm h-16 shrink-0">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => router.push('/lobby')} className="hover:bg-accent/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl md:text-2xl font-bold text-primary flex items-center">
               <Shield className="mr-2 h-6 w-6" /> {gameTitle}
            </h1>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Role: <strong className={`font-semibold ${revealedRoleDetails?.alignment === 'Good' ? 'text-blue-400' : revealedRoleDetails?.alignment === 'Evil' ? 'text-red-400' : 'text-accent'}`}>{playerRoleDisplay}</strong></span>
            
            {gamePhase === 'lobby_setup' && currentPlayer && currentPlayer.isOnline && (
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={handleTogglePlayerStatus} variant="outline" size="sm" className="ml-2">
                             <Check className="mr-1.5 h-4 w-4" /> 
                            {currentPlayer.status === 'Ready' ? 'Set Not Ready' : 'Set Ready'}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Toggle your readiness status for the game.</p></TooltipContent>
                 </Tooltip>
            )}

            {playerId === lobbyAdminId && gamePhase === 'lobby_setup' && (
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={handleToggleLobbyLock} variant="outline" size="sm" className="ml-2">
                            {isLobbyLocked ? <Unlock className="mr-1.5 h-4 w-4" /> : <Lock className="mr-1.5 h-4 w-4" />}
                            {isLobbyLocked ? 'Unlock' : 'Lock'}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isLobbyLocked ? 'Unlock lobby for spectators' : 'Lock lobby to prevent joining'}</p></TooltipContent>
                 </Tooltip>
            )}
            {playerId === lobbyAdminId && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={handleRefreshLobby} variant="outline" size="sm" className="ml-2">
                            <RefreshCcw className="mr-1.5 h-4 w-4" /> Refresh
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Reset game progress (scores, missions, roles). Players and spectators configuration reset.</p></TooltipContent>
                </Tooltip>
            )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[280px] lg:w-[320px] border-r border-border/60 p-4 overflow-y-auto bg-card flex flex-col space-y-5 shrink-0">
           <div className="shrink-0">
                <h2 className="text-lg font-semibold mb-2.5 text-accent flex items-center"><Shield className="mr-2 h-5 w-5" />Game Progress</h2>
                <div className="flex justify-around items-center mb-3 p-3 bg-background/50 rounded-lg shadow-inner">
                    <div className="text-center">
                        <ShieldCheck className="h-8 w-8 text-blue-400 mx-auto mb-1" />
                        <span className="text-2xl font-bold text-blue-400">{goodScore}</span>
                        <p className="text-xs text-muted-foreground">Good Quests</p>
                    </div>
                    <div className="text-center">
                        <ShieldAlert className="h-8 w-8 text-red-400 mx-auto mb-1" />
                        <span className="text-2xl font-bold text-red-400">{evilScore}</span>
                         <p className="text-xs text-muted-foreground">Evil Quests</p>
                    </div>
                </div>
                <div className="space-y-1.5 mb-3">
                    {missions.map(mission => (
                        <div key={mission.id} className={`flex items-center justify-between p-2.5 rounded-md text-sm shadow-sm ${mission.status === 'success' ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50' : mission.status === 'fail' ? 'bg-red-600/30 text-red-200 border border-red-500/50' : 'bg-muted/40 border border-transparent'}`}>
                           <span className="font-medium">Quest {mission.id} ({mission.requiredPlayers}P, {mission.failsRequired}F)</span>
                           {mission.status === 'success' && <ShieldCheck className="h-5 w-5 text-blue-300"/>}
                           {mission.status === 'fail' && <ShieldAlert className="h-5 w-5 text-red-300"/>}
                           {mission.status !== 'success' && mission.status !== 'fail' && <span className="text-xs capitalize px-2 py-0.5 bg-foreground/10 rounded-full">{mission.status.replace('_', ' ')}</span>}
                        </div>
                    ))}
                </div>
                <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1 text-center">Consecutive Team Rejections:</p>
                    <div className="flex justify-center space-x-2">
                        {Array(4).fill(0).map((_, index) => (
                            index < consecutiveRejections
                            ? <CircleDot key={index} className="h-4 w-4 text-destructive" />
                            : <Circle key={index} className="h-4 w-4 text-muted-foreground/50" />
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-grow flex flex-col min-h-0">
                <h2 className="text-lg font-semibold mb-2.5 text-accent flex items-center"><Users className="mr-2 h-5 w-5" /> Players ({players.length})</h2>
                <ScrollArea className="h-full pr-2">
                <ul className="space-y-2.5">
                {players.map(player => {
                  let voteForPlayer = playerVotes[player.id];
                  let highlightClasses = '';
                  
                  if (seenPlayerIds[player.id] === 'evil') {
                    highlightClasses = 'shadow-[0_0_10px_3px_hsl(var(--destructive))] border-destructive transition-all duration-300';
                  } else if (seenPlayerIds[player.id] === 'merlin_morgana_ambiguous') {
                     highlightClasses = 'shadow-[0_0_10px_3px_hsl(var(--foreground))] border-foreground/70 transition-all duration-300';
                  }

                  if (gamePhase === 'team_voting' && playerId === currentLeaderId && voteForPlayer && player.id !== playerId) {
                      if (voteForPlayer === 'approve') {
                          highlightClasses = 'shadow-[0_0_8px_2px_hsl(120,70%,60%)] border-green-500 transition-all duration-300';
                      } else if (voteForPlayer === 'reject') {
                          highlightClasses = 'shadow-[0_0_8px_2px_hsl(0,70%,60%)] border-red-500 transition-all duration-300';
                      }
                  }

                  let playerCardOpacityClass = 'opacity-100';
                  if (isProposingTeam && player.id === currentLeaderId) {
                      playerCardOpacityClass = 'opacity-60 cursor-not-allowed'; 
                  }
                  
                  let playerStatusText: string | null = null;
                  let statusColorClass = '';

                  if (player.isOnline === false) {
                        playerStatusText = 'Offline';
                        statusColorClass = 'text-muted-foreground/70';
                  } else if (gamePhase === 'lobby_setup') { 
                        if (player.status === 'Ready') {
                            playerStatusText = 'Ready';
                            statusColorClass = 'text-green-400';
                        } else if (player.status === 'Not Ready') {
                            playerStatusText = 'Not Ready';
                            statusColorClass = 'text-orange-400';
                        }
                   }


                  const assassinPlayer = players.find(p => p.role === 'Assassin');
                  const isAssassinTargetMode = gamePhase === 'assassination' && isAssassinSelecting && playerId === assassinPlayer?.id;
                  const isSelectedByAssassin = selectedAssassinTarget?.id === player.id;


                  return (
                    <li
                      key={player.id}
                      onClick={() => {
                          if (isProposingTeam && playerId === currentLeaderId && player.id !== currentLeaderId) {
                              handlePlayerClickForTeamSelection(player);
                          } else if (isAssassinTargetMode && player.id !== playerId && player.role && ROLES_DATA[player.role].alignment === 'Good') { 
                              handleSelectAssassinTarget(player);
                          }
                      }}
                      className={`
                        flex items-center justify-between p-2.5 rounded-lg shadow-sm transition-all duration-150 group
                        ${player.id === playerId ? 'bg-primary/25 border-primary/50' : 'bg-background/60 border'}
                        ${highlightClasses || 'border-transparent'}
                        ${isProposingTeam && playerId === currentLeaderId && player.id !== currentLeaderId ? 'cursor-pointer hover:bg-accent/30' : ''}
                        ${isProposingTeam && selectedTeam.find(p => p.id === player.id) && player.id !== currentLeaderId ? 'bg-accent/20 border-accent/40' : ''}
                        ${isAssassinTargetMode && player.id !== playerId && player.role && ROLES_DATA[player.role].alignment === 'Good' ? 'cursor-pointer hover:bg-destructive/20' : ''}
                        ${isAssassinTargetMode && (player.id === playerId || (player.role && ROLES_DATA[player.role].alignment === 'Evil')) ? 'opacity-70 cursor-not-allowed' : ''}
                        ${isSelectedByAssassin && isAssassinTargetMode ? 'ring-2 ring-destructive shadow-[0_0_10px_2px_hsl(var(--destructive))]' : ''}
                        ${playerCardOpacityClass}
                      `}
                    >
                      <div className="flex items-center">
                          <Avatar className="h-9 w-9 mr-3 border-2 border-border">
                          <AvatarImage data-ai-hint={player["data-ai-hint"] || "knight medieval"} src={undefined} alt={player.name} />
                          <AvatarFallback className="bg-muted-foreground/20 text-muted-foreground font-semibold">{getPlayerInitials(player.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                              <span className={`font-semibold text-sm ${player.id === currentQuestLeader?.id ? 'text-amber-400' : 'text-foreground/90'}`}>
                              {player.name}
                              {player.id === lobbyAdminId &&
                                  <Tooltip>
                                      <TooltipTrigger asChild><Swords className="inline ml-1.5 h-4 w-4 text-sky-400" /></TooltipTrigger>
                                      <TooltipContent><p>Lobby Admin</p></TooltipContent>
                                  </Tooltip>
                              }
                              {player.id === currentQuestLeader?.id &&
                                  <Tooltip>
                                      <TooltipTrigger asChild><Crown className="inline ml-1.5 h-4 w-4 text-amber-400" /></TooltipTrigger>
                                      <TooltipContent><p>Current Quest Leader</p></TooltipContent>
                                  </Tooltip>
                              }
                              </span>
                              {playerStatusText && (
                                <span className={`text-xs font-medium ${statusColorClass}`}>{playerStatusText}</span>
                              )}
                          </div>
                      </div>
                       {(isProposingTeam && playerId === currentLeaderId && player.id !== currentLeaderId) && (
                        <div className={`transition-opacity ${selectedTeam.find(p=>p.id === player.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {selectedTeam.find(p=>p.id === player.id) ? <UserX className="h-5 w-5 text-destructive" /> : <UserPlus className="h-5 w-5 text-green-400" /> }
                        </div>
                      )}
                      {isAssassinTargetMode && player.id !== playerId && player.role && ROLES_DATA[player.role].alignment === 'Good' && (
                        <div className={`transition-opacity ${isSelectedByAssassin ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {isSelectedByAssassin ? <Check className="h-5 w-5 text-green-400" /> : <Target className="h-5 w-5 text-yellow-400" />}
                        </div>
                      )}
                      {gamePhase === 'team_voting' && player.id !== currentLeaderId && playerVotes[player.id] && (
                        <div className="ml-auto pl-2">
                            {playerVotes[player.id] === 'approve' ? <Check className="h-5 w-5 text-green-400" /> : <X className="h-5 w-5 text-destructive" />}
                        </div>
                      )}
                      {gamePhase === 'mission_play' && currentMission?.team?.includes(player.id) && playerHasPlayedMissionCard[player.id] && (
                        <div className="ml-auto pl-2">
                           <Check className="h-5 w-5 text-green-400" />
                        </div>
                      )}
                    </li>
                  );
                })}
                </ul>
                </ScrollArea>
            </div>

            <div className="shrink-0">
                <div
                  className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity mb-2.5"
                  onClick={() => setIsSpectatorsPanelOpen(!isSpectatorsPanelOpen)}
                >
                  <div className="flex items-center">
                    <Eye className="mr-2 h-5 w-5 text-accent" />
                    <h2 className="text-lg font-semibold text-accent">Spectators ({spectators.length})</h2>
                  </div>
                  {isSpectatorsPanelOpen ? <ChevronDown className="h-5 w-5 text-accent" /> : <ChevronUp className="h-5 w-5 text-accent" />}
                </div>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isSpectatorsPanelOpen ? 'max-h-[30vh] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <ScrollArea className="h-full pr-2">
                    <ul className="space-y-2.5">
                        {spectators.map(spectator => {
                            let spectatorStatusText = 'Offline';
                            let spectatorStatusColorClass = 'text-muted-foreground/70';

                            if (spectator.isOnline) {
                                if (spectator.status === 'Ready') {
                                    spectatorStatusText = 'Ready';
                                    spectatorStatusColorClass = 'text-green-400';
                                } else if (spectator.status === 'Not Ready') { 
                                    spectatorStatusText = 'Not Ready';
                                    spectatorStatusColorClass = 'text-orange-400';
                                } else { 
                                     spectatorStatusText = 'Online'; 
                                     spectatorStatusColorClass = 'text-green-400';
                                }
                            } else { 
                                spectatorStatusText = 'Offline';
                                spectatorStatusColorClass = 'text-muted-foreground/70';
                            }
                            

                            return (
                                <li key={spectator.id} className={`flex items-center justify-between p-2.5 rounded-lg shadow-sm hover:bg-muted/60 transition-colors duration-150 group bg-background/60 border border-transparent`}>
                                    <div className="flex items-center">
                                        <Avatar className="h-9 w-9 mr-3 border-2 border-border">
                                            <AvatarImage data-ai-hint={spectator["data-ai-hint"] || (spectator.id.startsWith('bot-') ? "robot character" : "person silhouette")} src={undefined} alt={spectator.name} />
                                            <AvatarFallback className="bg-muted-foreground/20 text-muted-foreground font-semibold">{getPlayerInitials(spectator.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                        <span className="font-semibold text-sm text-foreground/90">{spectator.name}</span>
                                        <span className={`text-xs font-medium ${spectatorStatusColorClass}`}>{spectatorStatusText}</span>
                                        </div>
                                    </div>
                                    {gamePhase === 'lobby_setup' && (playerId === lobbyAdminId || !isLobbyLocked) && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button onClick={() => handleJoinAsPlayer(spectator.id)} size="sm" variant="outline" disabled={(isLobbyLocked && playerId !== lobbyAdminId) || players.length >=10}>
                                                    Join Game
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{(isLobbyLocked && playerId !== lobbyAdminId) ? "Lobby is locked by Admin" : players.length >= 10 ? "Lobby is full" : `Move ${spectator.name} to active players`}</p></TooltipContent>
                                        </Tooltip>
                                    )}
                                </li>
                            );
                        })}
                        {spectators.length === 0 && isSpectatorsPanelOpen && <p className="text-sm text-muted-foreground text-center py-2">No spectators.</p>}
                    </ul>
                    </ScrollArea>
                </div>
            </div>
        </aside>

        <main className="flex-1 p-4 md:p-6 flex flex-col items-center justify-center overflow-y-auto bg-background/70">
          <Card className="w-full max-w-3xl text-center shadow-xl border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl lg:text-4xl font-bold text-primary">
                {gamePhase === 'lobby_setup' && "Waiting for Players..."}
                {gamePhase === 'role_reveal' && "Your Destiny is Revealed!"}
                {gamePhase === 'team_selection' && !isProposingTeam && "Assemble Your Knights!"}
                {gamePhase === 'team_selection' && isProposingTeam && "The Team is Gathering..."}
                {gamePhase === 'team_voting' && "Approve the Quest Team?"}
                {gamePhase === 'mission_play' && "The Quest is Underway!"}
                {gamePhase === 'assassination' && "The Assassin Strikes!"}
                {gamePhase === 'game_over' && "The Battle Concludes!"}
                {gamePhase === 'loading' && "Awaiting Orders..."}
              </CardTitle>
              {currentMission && gamePhase !== 'role_reveal' && gamePhase !== 'game_over' && gamePhase !== 'lobby_setup' && gamePhase !== 'assassination' && (
                <CardDescription className="text-lg text-muted-foreground mt-1">
                    Currently on <span className="font-semibold text-accent">Quest {currentMission.id}</span>.
                    Quest Leader: <span className="font-bold text-amber-400">{currentQuestLeader?.name || 'N/A'}</span>.
                    {!isProposingTeam && gamePhase === 'team_selection' && ` Requires ${currentMission.requiredPlayers} players.`}
                    {gamePhase === 'team_voting' && currentMission.team && currentMission.team.length > 0 && (
                        <>
                         Proposed team: {players.filter(p => currentMission.team?.includes(p.id)).map(p=>p.name).join(', ')}.
                        </>
                    )}
                     {gamePhase === 'mission_play' && currentMission.team && currentMission.team.length > 0 && (
                        <>
                         Team on quest: {players.filter(p => currentMission.team?.includes(p.id)).map(p=>p.name).join(', ')}.
                        </>
                    )}
                </CardDescription>
              )}
               {gamePhase === 'lobby_setup' && (
                 <CardDescription className="text-lg text-muted-foreground mt-1">
                    Lobby Admin: <span className="font-bold text-sky-400">{lobbyAdmin?.name || 'N/A'}</span>.
                    Lobby is <span className={`font-semibold ${isLobbyLocked ? 'text-red-400' : 'text-green-400'}`}>{isLobbyLocked ? 'Locked' : 'Unlocked'}</span>.
                    Players: <span className="font-semibold text-accent">{players.length}</span> (Need 5 to start).
                </CardDescription>
               )}
               {gamePhase === 'assassination' && (
                 <CardDescription className="text-lg text-muted-foreground mt-1">
                    Good has won 3 quests. The Assassin (<span className="font-bold text-red-400">{players.find(p=>p.role === 'Assassin')?.name || 'Unknown'}</span>) must now choose a player to assassinate.
                 </CardDescription>
               )}
            </CardHeader>
            <CardContent className="space-y-6 min-h-[200px] flex flex-col items-center justify-center">
                {gamePhase === 'lobby_setup' && playerId === lobbyAdminId && (
                    <>
                        <p className="text-md text-foreground/90">
                            As the Lobby Admin, manage the lobby using the controls above. Add {Math.max(0, 5 - players.length)} more bot players from spectators.
                            When 5 players are online and 'Ready', start the game.
                        </p>
                        <Button
                            variant="default"
                            size="lg"
                            className="mt-6 px-10 py-3 text-lg bg-green-600 hover:bg-green-700 text-white disabled:bg-muted disabled:text-muted-foreground"
                            onClick={handleStartGame}
                            disabled={players.length !== 5 || players.some(p => !p.isOnline || p.status !== 'Ready')}
                        >
                            <Play className="mr-2 h-6 w-6" /> Start Game ({players.length}/5 needed)
                        </Button>
                         {players.length !== 5 && <p className="text-xs text-destructive mt-1">Exactly 5 players required to start.</p>}
                         {players.length === 5 && players.some(p => !p.isOnline || p.status !== 'Ready') && <p className="text-xs text-destructive mt-1">All players must be online and 'Ready' to start.</p>}
                    </>
                )}
                 {gamePhase === 'lobby_setup' && playerId !== lobbyAdminId && (
                    <p className="text-md text-foreground/90">
                        Waiting for the Lobby Admin (<span className="font-bold text-sky-400">{lobbyAdmin?.name || 'N/A'}</span>) to start the game.
                        {isLobbyLocked ? " The lobby is currently locked." : " The lobby is open for new players to be added by the Admin."}
                    </p>
                 )}

                {gamePhase === 'role_reveal' && !isRoleRevealModalOpen && (
                     <p className="text-md text-foreground/90">
                        All players are viewing their roles. Waiting to proceed...
                    </p>
                )}


                {gamePhase === 'team_selection' && currentMission && !isProposingTeam && currentQuestLeader && (
                    <>
                        <p className="text-md text-foreground/90">
                            {currentQuestLeader?.id === playerId ? "You are the Quest Leader. " : `${currentQuestLeader?.name} is leading. `}
                            Select <span className="font-semibold text-accent">{currentMission.requiredPlayers}</span> players for Quest {currentMission.id}.
                        </p>
                        {currentQuestLeader?.id === playerId && (
                            <div className="flex justify-center space-x-4 mt-4">
                                <Button
                                    variant="default"
                                    size="lg"
                                    className="px-8 py-3 text-base"
                                    onClick={handleProposeTeamClick}
                                >
                                    Propose Team
                                </Button>
                            </div>
                        )}
                         {currentQuestLeader?.isBot && (
                             <p className="text-sm text-muted-foreground mt-2 animate-pulse"> {currentQuestLeader.name} is thinking about the team...</p>
                         )}
                    </>
                )}
                {gamePhase === 'team_selection' && currentMission && isProposingTeam && currentQuestLeader && (
                    <>
                        <p className="text-md text-foreground/90 mb-3">
                            Quest Leader: <span className="font-bold text-amber-400">{currentQuestLeader.name}</span> is on the team.
                            Select <span className="font-semibold text-accent">{currentMission.requiredPlayers - 1}</span> more player(s) for Quest {currentMission.id}.
                        </p>
                        <div className="w-full max-w-md space-y-2 mb-4">
                            <div className="flex items-center p-2.5 rounded-lg bg-primary/20 border border-dashed border-primary/40 h-[60px] min-h-[60px] w-full justify-center shadow-inner">
                                <Avatar className="h-8 w-8 mr-2 border border-border">
                                    <AvatarImage data-ai-hint={currentQuestLeader["data-ai-hint"] || "leader knight"} src={undefined} alt={currentQuestLeader.name} />
                                    <AvatarFallback className="bg-muted-foreground/20 text-muted-foreground font-semibold">{getPlayerInitials(currentQuestLeader.name)}</AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-sm">{currentQuestLeader.name} (Quest Leader)</span>
                            </div>

                            {Array.from({ length: currentMission.requiredPlayers - 1 }).map((_, index) => {
                                const otherSelectedPlayers = selectedTeam.filter(p => p.id !== currentLeaderId);
                                const playerInSlot = otherSelectedPlayers[index];
                                return (
                                <div key={`other-slot-${index}`} className="flex items-center p-2.5 rounded-lg bg-muted/60 border border-dashed border-border h-[60px] min-h-[60px] w-full justify-center shadow-inner">
                                    {playerInSlot ? (
                                    <div className="flex items-center">
                                        <Avatar className="h-8 w-8 mr-2 border border-border">
                                        <AvatarImage data-ai-hint="knight medieval" src={undefined} alt={playerInSlot.name} />
                                        <AvatarFallback className="bg-muted-foreground/20 text-muted-foreground font-semibold">{getPlayerInitials(playerInSlot.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-semibold text-sm">{playerInSlot.name}</span>
                                    </div>
                                    ) : (
                                    <span className="text-xs text-muted-foreground italic">Empty Slot for Teammate</span>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-center space-x-4 mt-4">
                            <Button variant="outline" onClick={() => { setIsProposingTeam(false); setSelectedTeam([]); }}>Cancel</Button>
                            <Button
                                onClick={() => handleConfirmTeamProposal()}
                                disabled={selectedTeam.length !== currentMission.requiredPlayers}
                            >
                                Confirm Team ({selectedTeam.length}/{currentMission.requiredPlayers})
                            </Button>
                        </div>
                    </>
                )}

                {gamePhase === 'team_voting' && playerId && currentMission && (
                    <>
                        <p className="text-md text-foreground/90 mb-2">A team has been proposed for Quest {currentMission.id}. Cast your vote!</p>
                        <div className="mb-4 p-3 bg-muted/30 rounded-lg shadow-inner max-w-md mx-auto">
                            <p className="text-sm font-semibold mb-1 text-accent">Proposed Team:</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {players.filter(p => currentMission.team?.includes(p.id)).map(member => (
                                    <div key={member.id} className="flex items-center gap-1.5 p-1.5 bg-background/50 rounded text-xs">
                                        <Avatar className="h-5 w-5 border">
                                            <AvatarImage data-ai-hint="knight player" src={undefined} />
                                            <AvatarFallback className="bg-muted-foreground/20 text-muted-foreground font-semibold">{getPlayerInitials(member.name)}</AvatarFallback>
                                        </Avatar>
                                        {member.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-center space-x-6 mt-4">
                            <Button
                                variant="outline"
                                size="lg"
                                className="px-10 py-3 text-lg border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleVote('approve')}
                                disabled={playerHasVotedOnTeam[playerId] || playerId === currentLeaderId}
                            >
                                <ThumbsUp className="mr-2 h-6 w-6"/> Approve
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="px-10 py-3 text-lg border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleVote('reject')}
                                disabled={playerHasVotedOnTeam[playerId] || playerId === currentLeaderId}
                            >
                                <ThumbsDown className="mr-2 h-6 w-6"/> Reject
                            </Button>
                        </div>
                        {playerId === currentLeaderId && <p className="text-xs text-muted-foreground mt-3">As Quest Leader, you oversee the vote but do not participate.</p>}
                        {playerHasVotedOnTeam[playerId] && <p className="text-sm text-accent mt-3">You have voted. Waiting for others.</p>}
                        {!playerHasVotedOnTeam[playerId] && playerId !== currentLeaderId && <p className="text-sm text-muted-foreground mt-3">Waiting for your vote and other players...</p>}
                    </>
                )}

                {gamePhase === 'mission_play' && playerId && currentMission && (
                    <>
                        {currentMission.team?.includes(playerId) ? (
                            playerHasPlayedMissionCard[playerId] ? (
                                <p className="text-md text-accent">Card played. Waiting for other team members...</p>
                            ) : (
                                <>
                                    <p className="text-xl font-semibold mb-4 text-accent">Select a card for Quest {currentMission.id}</p>
                                    <div className="flex justify-center space-x-6 mb-6">
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            onClick={() => setSelectedMissionCardForPlay('success')}
                                            className={`px-10 py-8 text-lg w-40 h-24 flex flex-col items-center justify-center transition-all duration-200
                                                        ${selectedMissionCardForPlay === 'success' ? 'shadow-[0_0_15px_5px_hsl(var(--accent))] border-accent scale-105' : 'border-blue-500 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400'}`}
                                        >
                                            <ShieldCheck className="h-8 w-8 mb-1"/>
                                            Success
                                        </Button>
                                        {revealedRoleDetails?.alignment === 'Evil' && (
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                onClick={() => setSelectedMissionCardForPlay('fail')}
                                                className={`px-10 py-8 text-lg w-40 h-24 flex flex-col items-center justify-center transition-all duration-200
                                                            ${selectedMissionCardForPlay === 'fail' ? 'shadow-[0_0_15px_5px_hsl(var(--destructive))] border-destructive scale-105' : 'border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-400'}`}
                                            >
                                                <ShieldAlert className="h-8 w-8 mb-1"/>
                                                Fail
                                            </Button>
                                        )}
                                    </div>
                                    <Button
                                        size="lg"
                                        onClick={() => selectedMissionCardForPlay && handlePlayMissionCard(selectedMissionCardForPlay)}
                                        disabled={!selectedMissionCardForPlay}
                                        className="px-12 py-3 text-lg"
                                    >
                                        Play Card
                                    </Button>
                                </>
                            )
                        ) : (
                            <p className="text-md text-muted-foreground">Quest {currentMission.id} is in progress. Waiting for the team to complete their mission.</p>
                        )}
                    </>
                 )}

                 {gamePhase === 'loading' && <p className="text-lg text-muted-foreground">Loading game state...</p>}
                 
                 {gamePhase === 'assassination' && (() => {
                    const assassin = players.find(p => p.role === 'Assassin');
                    if (!assassin) return <p className="text-lg text-muted-foreground">Error: Assassin not found.</p>;

                    if (playerId === assassin.id && !assassin.isBot) { 
                        return (
                            <>
                                <p className="text-xl font-semibold mb-1 text-destructive">Assassinate Merlin!</p>
                                <p className="text-md text-foreground/90 mb-4">
                                    Choose a Good player you believe is Merlin. If you are correct, Evil wins.
                                </p>
                                <div className="w-full max-w-xs space-y-2 mb-6">
                                    <div className="flex items-center p-3 rounded-lg bg-muted/60 border border-dashed border-border h-[60px] min-h-[60px] w-full justify-center shadow-inner">
                                        {selectedAssassinTarget ? (
                                            <div className="flex items-center">
                                                <Avatar className="h-8 w-8 mr-2 border border-border">
                                                    <AvatarImage data-ai-hint={selectedAssassinTarget["data-ai-hint"] || "player character"} src={undefined} alt={selectedAssassinTarget.name} />
                                                    <AvatarFallback className="bg-muted-foreground/20 text-muted-foreground font-semibold">{getPlayerInitials(selectedAssassinTarget.name)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-semibold text-lg">{selectedAssassinTarget.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground italic">Select a Target</span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="lg"
                                    className="px-10 py-3 text-lg"
                                    onClick={() => handleConfirmAssassination()}
                                    disabled={!selectedAssassinTarget}
                                >
                                    <Target className="mr-2 h-6 w-6" /> Assassinate
                                </Button>
                            </>
                        );
                    } else if (assassin.isBot && assassinationDetails.targetName) {
                         return (
                            <>
                                <p className="text-xl font-semibold mb-1 text-destructive">Assassin's Choice</p>
                                <p className="text-md text-foreground/90 mb-2">
                                    The Assassin ({assassin.name}) has targeted: <strong className="text-yellow-400">{assassinationDetails.targetName}</strong>.
                                </p>
                                {assassinationDetails.reasoning && <p className="text-sm text-muted-foreground italic">Reasoning: {assassinationDetails.reasoning}</p>}
                                <p className="text-md text-muted-foreground mt-4 animate-pulse">Processing outcome...</p>
                            </>
                        );
                    } else if (assassin.isBot) {
                        return <p className="text-lg text-muted-foreground animate-pulse">The Assassin ({assassin.name}) is choosing their target...</p>;
                    }
                     else { 
                        return <p className="text-lg text-muted-foreground">Waiting for the Assassin ({assassin.name}) to choose their target...</p>;
                    }
                })()}

                 {gamePhase === 'game_over' && (
                    <div className="text-2xl font-bold">
                        <p className="mb-2">GAME OVER!</p>
                        {goodScore >=3 && evilScore < 3 && consecutiveRejections < 4 ? <p className="text-blue-400">GOOD PREVAILS!</p> : <p className="text-red-400">EVIL TRIUMPHS!</p>}
                        {consecutiveRejections >= 4 && <p className="text-red-400 text-sm mt-1">(Due to 4 rejected teams)</p>}
                         <Button onClick={() => {
                            if (playerId === lobbyAdminId) handleRefreshLobby();
                            else toast({title: "Only Lobby Admin can refresh", variant: "destructive"});
                         }} className="mt-6" variant="outline">
                            {playerId === lobbyAdminId ? "Play Again (Refresh Lobby)" : "Waiting for Admin to Restart"}
                         </Button>
                    </div>
                 )}
            </CardContent>
            <CardFooter className="pt-4">
                <p className="text-xs text-muted-foreground w-full">"The only thing necessary for the triumph of evil is for good men to do nothing."</p>
            </CardFooter>
          </Card>
        </main>

        <aside className="w-[280px] lg:w-[320px] border-l border-border/60 flex flex-col bg-card shrink-0">
          <div className="p-4 border-b border-border/60 h-16 flex items-center">
            <h2 className="text-lg font-semibold text-accent flex items-center"><MessageSquare className="mr-2 h-5 w-5" /> Game Chat</h2>
          </div>
          <ScrollArea className="flex-1 p-4" ref={chatScrollAreaRef}>
            <div className="space-y-3.5">
            {chatMessages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Break the silence!</p>}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.senderId === playerId ? 'items-end' : 'items-start'}`}>
                <div className={`p-2.5 rounded-lg max-w-[90%] shadow-sm ${msg.senderId === playerId ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-foreground rounded-bl-none'}`}>
                  {msg.senderId !== playerId && <p className="text-xs font-semibold mb-0.5 text-accent/80">{msg.senderName}</p> }
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
                <p className="text-xs text-muted-foreground/80 mt-1 px-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
            </div>
          </ScrollArea>
          <form onSubmit={handleSendMessage} className="p-3 border-t border-border/60 bg-card">
            <div className="flex space-x-2 items-center">
              <Input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send a message..."
                className="flex-1 h-11 text-sm bg-background/80 focus:ring-primary/50 border-border/70"
                autoComplete="off"
              />
              <Button type="submit" size="icon" aria-label="Send message" className="h-11 w-11 shrink-0">
                <SendHorizontal className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </aside>
      </div>

      {revealedRoleDetails && (
        <Dialog open={isRoleRevealModalOpen} onOpenChange={(isOpen) => { if (!isOpen && gamePhase === 'role_reveal') {} else { setIsRoleRevealModalOpen(isOpen) }}}>
            <DialogContent className="sm:max-w-md text-center" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className={`text-3xl font-bold ${revealedRoleDetails.alignment === 'Good' ? 'text-blue-400' : 'text-red-400'}`}>
                        {revealedRoleDetails.isActiveRole ? `You are ${revealedRoleDetails.name}!` : `You are on the side of ${revealedRoleDetails.alignment}!`}
                    </DialogTitle>
                     <DialogDescription className="text-md text-muted-foreground pt-2">
                        {revealedRoleDetails.longDescription}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-4 sm:justify-center">
                    <Button onClick={handleConfirmRole} size="lg">Understood</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

    </div>
    </TooltipProvider>
  );
}
