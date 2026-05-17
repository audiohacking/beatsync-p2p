import { IS_P2P_MODE } from "@/lib/p2p";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Queue } from "../Queue";

export const Main = () => {
  return (
    <motion.div
      className={cn(
        "w-full lg:flex-1 overflow-y-auto bg-gradient-to-b from-neutral-900/90 to-neutral-950 backdrop-blur-xl bg-neutral-950 h-full",
        "scrollbar-thin scrollbar-thumb-rounded-md scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/20"
      )}
    >
      <motion.div className="p-6 pt-4">
        <Queue className="mb-8" />
        {IS_P2P_MODE && (
          <p className="text-xs text-neutral-500 text-center">
            Upload MP3 (recommended) or other audio — files stay in your browser and sync peer-to-peer.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
};
