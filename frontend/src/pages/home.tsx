import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Users, User, PartyPopper, ArrowRight, X } from "lucide-react";
import { usePhotoStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const MODES = [
  { id: "Duo", label: "Duo", count: 2, icon: User },
  { id: "Trio", label: "Trio", count: 3, icon: Users },
  { id: "Quadro", label: "Quadro", count: 4, icon: Users },
  { id: "Cinco", label: "Cinco", count: 5, icon: PartyPopper },
  { id: "Six", label: "Six", count: 6, icon: PartyPopper },
];

type ModeOption = (typeof MODES)[number];

export default function Home() {
  const [, setLocation] = useLocation();
  const { setRoomInfo, clear } = usePhotoStore();
  const { toast } = useToast();

  const [selectedMode, setSelectedMode] = useState<ModeOption | null>(null);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectMode = (mode: ModeOption) => {
    setSelectedMode(mode);
  };

  const handleCreateRoom = async () => {
    if (!name.trim() || !selectedMode) return;
    
    setIsCreating(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupSize: selectedMode.count })
      });
      
      if (!res.ok) throw new Error("Failed to create room");
      const data = await res.json();
      
      const myParticipantId = crypto.randomUUID();
      
      clear();
      setRoomInfo({
        roomId: data.roomId,
        hostId: data.hostId,
        myParticipantId,
        myName: name.trim(),
        isHost: true,
        groupSize: selectedMode.count,
        mode: selectedMode.id,
      });
      
      setLocation(`/room/${data.roomId}`);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Could not create the room. Please try again.",
        variant: "destructive"
      });
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
      <div className="film-grain" />
      
      {/* Decorative curtain elements */}
      <div className="absolute top-0 left-0 w-32 md:w-64 h-full bg-secondary/20 blur-[100px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 md:w-64 h-full bg-secondary/20 blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full flex flex-col items-center z-10"
      >
        <div className="text-center mb-16 space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/20 text-primary font-bold tracking-widest text-sm mb-4 uppercase">
            Online Photo Booth
          </div>
          <h1 className="font-serif text-6xl md:text-8xl text-secondary tracking-tight">
            SnapBooth
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-md mx-auto">
            Grab your friends, strike a pose, and make some memories.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
          {MODES.map((mode, i) => (
            <motion.button
              key={mode.id}
              onClick={() => handleSelectMode(mode)}
              data-testid={`button-mode-${mode.id.toLowerCase()}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-col items-center justify-center p-8 bg-card border-2 border-border rounded-3xl hover:border-primary hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <mode.icon size={32} className="text-secondary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-serif text-3xl text-foreground mb-2">{mode.label}</h3>
              <p className="text-muted-foreground font-medium">{mode.count} people</p>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Name Entry Overlay */}
      <AnimatePresence>
        {selectedMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card border-2 border-border rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedMode(null)}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <h2 className="font-serif text-3xl text-secondary mb-2">What's your name?</h2>
              <p className="text-muted-foreground mb-6">Enter your name to host the {selectedMode.label} session.</p>
              
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-lg mb-6 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                data-testid="input-host-name"
              />
              
              <button
                onClick={handleCreateRoom}
                disabled={!name.trim() || isCreating}
                data-testid="button-create-room"
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? "Creating Room..." : "Create Room"}
                {!isCreating && <ArrowRight size={20} />}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
