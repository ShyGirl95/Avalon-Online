
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, LogOut, Swords, Settings, MessageSquare, Users, Info, ListChecks } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";

// Интерфейс для объекта лобби (даже если он не указан, используется для создания)
interface Lobby {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'in-progress'; 
  admin: string;
}

export default function LobbyPage() {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [isCreateLobbyDialogOpen, setIsCreateLobbyDialogOpen] = useState(false);
  const [newLobbyName, setNewLobbyName] = useState('');
  const [newLobbyMaxPlayers, setNewLobbyMaxPlayers] = useState<number>(7); // по дефолту
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);

  const [joinLobbyIdInput, setJoinLobbyIdInput] = useState('');
  const [isJoiningLobby, setIsJoiningLobby] = useState(false);

  const [isRulesDialogOpen, setIsRulesDialogOpen] = useState(false);
  const [isRolesDialogOpen, setIsRolesDialogOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    const name = localStorage.getItem('playerName');
    if (!name) {
      router.push('/');
    } else {
      setPlayerName(name);
    }
  }, [router]);

  const handleCreateLobby = async () => {
    if (!playerName) return;
    if (!newLobbyName.trim()) {
      toast({ title: "Lobby Name Required", description: "Please give your new lobby a name.", variant: "destructive" });
      return;
    }
    if (newLobbyMaxPlayers < 5 || newLobbyMaxPlayers > 10) {
      toast({ title: "Invalid Player Count", description: "Max players must be between 5 and 10.", variant: "destructive" });
      return;
    }

    setIsCreatingLobby(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // задержка для иммитации реального игрока

    const newLobby: Lobby = {
      id: String(Date.now()), 
      name: newLobbyName.trim(),
      playerCount: 1,
      maxPlayers: newLobbyMaxPlayers,
      status: 'waiting',
      admin: playerName,
    };

    setNewLobbyName('');
    setNewLobbyMaxPlayers(7); // сбросить дл дефолта
    setIsCreateLobbyDialogOpen(false);
    setIsCreatingLobby(false);
    toast({ title: "Lobby Created!", description: `"${newLobby.name}" is ready with ID ${newLobby.id}. Redirecting...`});
    router.push(`/game/${newLobby.id}`);
  };

  const handleJoinLobbyById = () => {
    if (!joinLobbyIdInput.trim()) {
      toast({ title: "Lobby ID Required", description: "Please enter the ID of the lobby you want to join.", variant: "destructive" });
      return;
    }
    setIsJoiningLobby(true);
    toast({ title: `Attempting to join lobby ${joinLobbyIdInput}`, description: "Preparing your seat at the Round Table..."});
    // иммитация входа
    setTimeout(() => {
      router.push(`/game/${joinLobbyIdInput.trim()}`);
      setJoinLobbyIdInput('');
      setIsJoiningLobby(false);
    }, 1000);
  };

  const handleLogout = () => {
    if (!isMounted) return;
    localStorage.removeItem('playerName');
    toast({ title: "Logged Out", description: "Farewell, brave knight!" });
    router.push('/');
  };

  if (!isMounted || !playerName) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <Swords className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-xl text-muted-foreground">Loading player information...</p>
      </div>
    );
  }

  const gameRulesText = (
    <>
      Это игра с тайными предателями. Участники выступают в роли либо <span className="text-blue-400">верных служителей Артура</span>, сражающихся во имя добра и чести, либо <span className="text-red-400">приспешников Мордреда</span>, идущих дорогой зла. <span className="text-blue-400">Добро</span> победит, если отряд успешно завершит три похода. <span className="text-red-400">Зло</span> победит, если три похода закончатся провалом, или если в конце игры <span className="text-blue-400">Мерлин</span> будет <span className="text-red-400">убит</span>, или если в любом походе не удастся собрать отряд. В ходе партии игроки могут высказывать любые предположения о приверженности друг друга. Открытое обсуждение, введение в заблуждение, обвинения и логические умозаключения одинаково важны для торжества <span className="text-blue-400">добра</span> или воцарения <span className="text-red-400">зла</span>.
    </>
  );

  const rolesGuideText = (
    <>
      Среди верных служителей Артура и приспешников Мордреда есть два персонажа с особыми способностями.
      <br /><br />
      <strong><span className="text-blue-400">Мерлин</span></strong>: видит всех <span className="text-red-400">красных</span> в начале игры, но он не должен выдать себя, иначе дело добра окажется под угрозой. Если <span className="text-red-400">Ассасин</span> раскроет личность <span className="text-blue-400">Мерлина</span>, зло одержит победу.
      <br /><br />
      <strong><span className="text-red-400">Ассассин</span></strong>: зло восторжествует, если он раскроет <span className="text-blue-400">Мерлина</span>. Если 3 похода увенчаются успехом, <span className="text-red-400">убийца</span> может перейти к этапу убийства и один раз попытаться определить, кто из игроков является <span className="text-blue-400">Мерлином</span>.
      <br /><br />
      <strong><span className="text-red-400">Моргана</span></strong>: королева фей, приспешница Мордреда. Она притворяется Мерлином, чтобы запутать <span className="text-blue-400">Персиваля</span>.
      <br /><br />
      <strong><span className="text-blue-400">Персиваль</span></strong>: верный рыцарь круглого стола. Будучи слугой Короля Артура, <span className="text-blue-400">Персиваль</span> обязан сражаться бок о бок с <span className="text-blue-400">Мерлином</span>, но он не знает напрямую, кто из двух игроков является <span className="text-muted-foreground">Мерлином</span>, а кто <span className="text-muted-foreground">Морганой</span>.
    </>
  );


  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/40 selection:text-primary-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="container flex h-20 max-w-screen-xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center space-x-3">
            <Swords className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold text-primary tracking-tight">Avalon Online</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="hidden md:inline text-md text-muted-foreground">Welcome, <strong className="text-accent">{playerName}</strong>!</span>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out" className="hover:bg-accent/10 rounded-full">
              <LogOut className="h-6 w-6 text-muted-foreground hover:text-accent transition-colors" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Create Lobby Section */}
          <Card className="bg-card/80 shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl text-primary/90">Create New Lobby</CardTitle>
              <CardDescription>Start a new quest and invite your fellow knights.</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isCreateLobbyDialogOpen} onOpenChange={setIsCreateLobbyDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full shadow-md hover:shadow-accent/30 transition-all duration-300 ease-out text-lg py-3 px-6">
                    <PlusCircle className="mr-2 h-6 w-6" /> Configure Your Lobby
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Create New Lobby</DialogTitle>
                    <DialogDescription>
                      Set up your game and invite others to join the quest.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="newLobbyName" className="text-base">
                        Lobby Name
                      </Label>
                      <Input
                        id="newLobbyName"
                        value={newLobbyName}
                        onChange={(e) => setNewLobbyName(e.target.value)}
                        placeholder="e.g., Quest for the Grail"
                        className="h-11 text-base"
                        maxLength={30}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newLobbyMaxPlayers" className="text-base">
                        Max Players (5-10)
                      </Label>
                      <Input
                        id="newLobbyMaxPlayers"
                        type="number"
                        value={newLobbyMaxPlayers}
                        onChange={(e) => setNewLobbyMaxPlayers(parseInt(e.target.value, 10))}
                        min="5"
                        max="10"
                        className="h-11 text-base"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateLobbyDialogOpen(false)} disabled={isCreatingLobby}>Cancel</Button>
                    <Button onClick={handleCreateLobby} disabled={!newLobbyName.trim() || isCreatingLobby || newLobbyMaxPlayers < 5 || newLobbyMaxPlayers > 10}>
                      {isCreatingLobby ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : "Create Lobby"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Join Lobby by ID Section */}
          <Card className="bg-card/80 shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl text-primary/90">Join Existing Lobby</CardTitle>
              <CardDescription>Enter the ID of the lobby you wish to join.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="joinLobbyIdInput" className="text-base">
                  Lobby ID
                </Label>
                <Input
                  id="joinLobbyIdInput"
                  value={joinLobbyIdInput}
                  onChange={(e) => setJoinLobbyIdInput(e.target.value)}
                  placeholder="Enter Lobby ID"
                  className="h-11 text-base mt-1"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleJoinLobbyById} disabled={!joinLobbyIdInput.trim() || isJoiningLobby} className="w-full text-lg py-3 px-6">
                {isJoiningLobby ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Joining...
                  </>
                ) : "Join Lobby"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-16 pt-8 border-t border-border/40">
            <h3 className="text-2xl font-semibold mb-6 text-center text-muted-foreground">Game Information & Help</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                <Dialog open={isRulesDialogOpen} onOpenChange={setIsRulesDialogOpen}>
                    <DialogTrigger asChild>
                        <Card className="p-6 bg-card/60 border-border/50 hover:shadow-md transition-shadow cursor-pointer">
                            <Info className="mx-auto h-12 w-12 text-primary/80 mb-3" />
                            <h4 className="text-xl font-semibold mb-1 text-foreground/90">How to Play</h4>
                            <p className="text-muted-foreground text-sm">Learn the rules of Avalon and strategies for victory.</p>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-2xl">How to Play Avalon</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-3 text-sm text-foreground/90 leading-relaxed">
                            <p>{gameRulesText}</p>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setIsRulesDialogOpen(false)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                 <Dialog open={isRolesDialogOpen} onOpenChange={setIsRolesDialogOpen}>
                    <DialogTrigger asChild>
                        <Card className="p-6 bg-card/60 border-border/50 hover:shadow-md transition-shadow cursor-pointer">
                            <ListChecks className="mx-auto h-12 w-12 text-primary/80 mb-3" />
                            <h4 className="text-xl font-semibold mb-1 text-foreground/90">Roles Guide</h4>
                            <p className="text-muted-foreground text-sm">Understand the abilities of Merlin, Percival, Mordred & more.</p>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-2xl">Avalon Roles Guide</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-3 text-sm text-foreground/90 leading-relaxed">
                           <p>{rolesGuideText}</p>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setIsRolesDialogOpen(false)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

      </main>

       <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border/60 mt-12">
        <p>Created by Adam Asuev</p>
      </footer>
    </div>
  );
}



