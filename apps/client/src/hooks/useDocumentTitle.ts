import { getAudioSourceDisplayName } from "@/lib/audioDisplay";
import { useGlobalStore } from "@/store/global";
import { useEffect } from "react";

export const useDocumentTitle = () => {
  const isPlaying = useGlobalStore((state) => state.isPlaying);
  const selectedAudioUrl = useGlobalStore((state) => state.selectedAudioUrl);
  const getSelectedTrack = useGlobalStore((state) => state.getSelectedTrack);

  useEffect(() => {
    const track = getSelectedTrack();
    if (isPlaying && track) {
      const songName = getAudioSourceDisplayName(track.source);
      document.title = `${songName}`;
    } else {
      document.title = "Beatsync";
    }
  }, [isPlaying, selectedAudioUrl, getSelectedTrack]);
};
