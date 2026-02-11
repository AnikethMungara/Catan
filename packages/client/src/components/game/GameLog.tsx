/**
 * Scrollable game event log.
 */

import { useEffect, useRef } from "react";
import type { GameEvent } from "@catan/shared";

type Props = {
  log: readonly GameEvent[];
};

export default function GameLog({ log }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log.length]);

  return (
    <div className="game-log">
      <h3>Game Log</h3>
      <div className="log-entries">
        {log.map((entry, i) => (
          <div key={i} className={`log-entry log-${entry.type.toLowerCase()}`}>
            <span className="log-message">{entry.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
