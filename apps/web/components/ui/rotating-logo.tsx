'use client';

import Image from 'next/image';

export function RotatingLogo() {
  return (
    <div>
      <Image
        src="/mascot.png"
        alt="Kudjo Mascot"
        width={400}
        height={400}
        className="object-contain"
        priority
      />
    </div>
  );
} 