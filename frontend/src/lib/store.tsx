import { createContext, useContext, useState, ReactNode } from "react";

export type Participant = { id: string; name: string; isHost: boolean };
export type ShotPhoto = { participantId: string; name: string; data: string };
export type Shot = { shotIndex: number; photos: ShotPhoto[] };
export type FilterType = "none" | "grayscale" | "sepia" | "fade" | "vivid";

export type RoomStoreContextType = {
  roomId: string;
  hostId: string;
  myParticipantId: string;
  myName: string;
  isHost: boolean;
  groupSize: number;
  mode: string;

  participants: Participant[];
  status: "waiting" | "countdown" | "capturing" | "done";
  shots: Shot[];
  currentShotIndex: number;

  filter: FilterType;

  setRoomInfo: (info: { roomId: string, hostId: string, myParticipantId: string, myName: string, isHost: boolean, groupSize: number, mode: string }) => void;
  updateRoomState: (state: { participants: Participant[], status: "waiting" | "countdown" | "capturing" | "done", shots: Shot[], currentShotIndex: number }) => void;
  addShot: (shot: Shot) => void;
  setAllShots: (shots: Shot[]) => void;
  setFilter: (f: FilterType) => void;
  clear: () => void;
};

const RoomStoreContext = createContext<RoomStoreContextType | undefined>(undefined);

export function PhotoStoreProvider({ children }: { children: ReactNode }) {
  const [roomId, setRoomId] = useState("");
  const [hostId, setHostId] = useState("");
  const [myParticipantId, setMyParticipantId] = useState("");
  const [myName, setMyName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [groupSize, setGroupSize] = useState(0);
  const [mode, setMode] = useState("");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [status, setStatus] = useState<"waiting" | "countdown" | "capturing" | "done">("waiting");
  const [shots, setShots] = useState<Shot[]>([]);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  
  const [filter, setFilterState] = useState<FilterType>("none");

  const setRoomInfo = (info: { roomId: string, hostId: string, myParticipantId: string, myName: string, isHost: boolean, groupSize: number, mode: string }) => {
    setRoomId(info.roomId);
    setHostId(info.hostId);
    setMyParticipantId(info.myParticipantId);
    setMyName(info.myName);
    setIsHost(info.isHost);
    setGroupSize(info.groupSize);
    setMode(info.mode);
  };

  const updateRoomState = (state: { participants: Participant[], status: "waiting" | "countdown" | "capturing" | "done", shots: Shot[], currentShotIndex: number }) => {
    setParticipants(state.participants);
    setStatus(state.status);
    setShots(state.shots);
    setCurrentShotIndex(state.currentShotIndex);
  };

  const addShot = (shot: Shot) => {
    setShots(prev => {
      const existing = prev.findIndex(s => s.shotIndex === shot.shotIndex);
      if (existing >= 0) {
        const newShots = [...prev];
        newShots[existing] = shot;
        return newShots;
      }
      return [...prev, shot];
    });
  };

  const setAllShots = (newShots: Shot[]) => setShots(newShots);
  const setFilter = (f: FilterType) => setFilterState(f);

  const clear = () => {
    setRoomId("");
    setHostId("");
    setMyParticipantId("");
    setMyName("");
    setIsHost(false);
    setGroupSize(0);
    setMode("");
    setParticipants([]);
    setStatus("waiting");
    setShots([]);
    setCurrentShotIndex(0);
    setFilterState("none");
  };

  return (
    <RoomStoreContext.Provider value={{
      roomId, hostId, myParticipantId, myName, isHost, groupSize, mode,
      participants, status, shots, currentShotIndex, filter,
      setRoomInfo, updateRoomState, addShot, setAllShots, setFilter, clear
    }}>
      {children}
    </RoomStoreContext.Provider>
  );
}

export function usePhotoStore() {
  const context = useContext(RoomStoreContext);
  if (context === undefined) {
    throw new Error("usePhotoStore must be used within a PhotoStoreProvider");
  }
  return context;
}
