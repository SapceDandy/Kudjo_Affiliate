'use client';

import Image from 'next/image';

export function FloatingMascot() {
  return (
    <div className="fixed bottom-8 right-8 animate-bounce-slow">
      <Image
        src="/mascot.png"
        alt="Kudjo Mascot"
        width={100}
        height={100}
        className="drop-shadow-lg"
        style={{ height: 'auto', width: '100%', maxWidth: 100 }}
      />
    </div>
  );
} 