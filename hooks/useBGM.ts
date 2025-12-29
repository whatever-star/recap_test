
import { useState, useCallback, useRef, useEffect } from "react";

/**
 * 🎹 Yearly Recap BGM Hook
 * 
 * 이제 고정된 assets/bgm.mp3뿐만 아니라 
 * 사용자가 업로드한 커스텀 URL도 지원합니다.
 */

let audioInstance: HTMLAudioElement | null = null;

export const useBGM = (sourceUrl: string = "assets/bgm.mp3") => {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [wasPlayingBeforeVideo, setWasPlayingBeforeVideo] = useState(false);
  
  const fadeTimer = useRef<number | null>(null);
  const previewTimer = useRef<number | null>(null);

  // 소스 URL이 변경되면 오디오 인스턴스 초기화
  useEffect(() => {
    if (audioInstance) {
      audioInstance.pause();
      audioInstance.src = sourceUrl;
      audioInstance.load();
      if (!isMuted && isPlaying) {
        audioInstance.play().catch(() => {
          setIsMuted(true);
          setIsPlaying(false);
        });
      }
    }
  }, [sourceUrl]);

  /** 🎚️ 볼륨 페이드 */
  const fadeVolume = (to: number, duration = 1000) => {
    if (!audioInstance) return;

    if (fadeTimer.current) {
      window.clearInterval(fadeTimer.current);
      fadeTimer.current = null;
    }

    const steps = 25;
    const stepTime = duration / steps;
    const from = audioInstance.volume;
    const delta = (to - from) / steps;

    let step = 0;
    fadeTimer.current = window.setInterval(() => {
      if (!audioInstance) return;

      step++;
      const nextVolume = audioInstance.volume + delta;
      audioInstance.volume = Math.min(1, Math.max(0, nextVolume));

      if (step >= steps) {
        audioInstance.volume = to;
        if (fadeTimer.current) {
          window.clearInterval(fadeTimer.current);
          fadeTimer.current = null;
        }
      }
    }, stepTime);
  };

  /** ▶️ 재생 */
  const play = useCallback(async (isUserEnabling = true) => {
    if (typeof window === "undefined") return;

    if (previewTimer.current) {
      window.clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    
    if (isUserEnabling) {
      setIsPreviewing(false);
    }

    try {
      if (!audioInstance) {
        audioInstance = new Audio(sourceUrl);
        audioInstance.loop = true;
        audioInstance.volume = 0;
        audioInstance.preload = "auto";

        audioInstance.addEventListener("error", () => {
          console.error("[BGM] Audio Error:", audioInstance?.error);
        });
      }

      setIsLoading(true);
      await audioInstance.play();
      fadeVolume(0.35);
      
      if (isUserEnabling) {
        setIsMuted(false);
        setIsPlaying(true);
      }
    } catch (err: any) {
      console.error("[BGM] Playback failed:", err);
      setIsMuted(true);
      setIsPlaying(false);
      setIsPreviewing(false);
    } finally {
      setIsLoading(false);
    }
  }, [sourceUrl]);

  /** 🎧 프리뷰 */
  const preview = useCallback(async () => {
    if (isPlaying && !isMuted) return; 
    
    setIsPreviewing(true);
    await play(false); 

    previewTimer.current = window.setTimeout(() => {
      if (previewTimer.current) {
        fadeVolume(0, 1500);
        setTimeout(() => {
          if (isPreviewing) {
            audioInstance?.pause();
            setIsPreviewing(false);
          }
        }, 1600);
      }
    }, 6000);
  }, [isPlaying, isMuted, play, isPreviewing]);

  /** ⏸️ 일시정지 */
  const pause = useCallback((immediate = false) => {
    if (!audioInstance) return;

    if (previewTimer.current) {
      window.clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }

    if (immediate) {
      audioInstance.pause();
      audioInstance.volume = 0;
    } else {
      fadeVolume(0, 800);
      setTimeout(() => {
        audioInstance?.pause();
      }, 850);
    }

    setIsMuted(true);
    setIsPlaying(false);
    setIsPreviewing(false);
  }, []);

  const handleVideoStart = useCallback(() => {
    if (!isMuted && isPlaying) {
      setWasPlayingBeforeVideo(true);
      pause(true); 
    }
  }, [isMuted, isPlaying, pause]);

  const handleVideoEnd = useCallback(() => {
    if (wasPlayingBeforeVideo) {
      play().catch(() => {});
      setWasPlayingBeforeVideo(false);
    }
  }, [wasPlayingBeforeVideo, play]);

  return {
    isMuted,
    isPlaying,
    isLoading,
    isPreviewing,
    play,
    preview,
    pause,
    handleVideoStart,
    handleVideoEnd
  };
};
