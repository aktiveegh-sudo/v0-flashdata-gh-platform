'use client'

import { useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'

type HeroVideoBackgroundProps = {
  src: string
}

export function HeroVideoBackground({ src }: HeroVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    const nextMuted = !muted
    video.muted = nextMuted
    setMuted(nextMuted)
  }

  return (
    <>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/60" />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={toggleMute}
        className="absolute bottom-4 right-4 z-20 rounded-full border-white/20 bg-black/50 text-white hover:bg-black/70 hover:text-white"
        aria-label={muted ? 'Unmute video' : 'Mute video'}
        aria-pressed={!muted}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
    </>
  )
}
