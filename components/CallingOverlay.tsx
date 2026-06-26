import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types.ts';
import { useLanguage } from '../LanguageContext.tsx';

export interface ActiveCall {
  id: string;
  type: 'private' | 'collective';
  mediaType: 'audio' | 'video';
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId?: string;
  groupId?: string;
  groupName?: string;
  status: 'calling' | 'ringing' | 'connected' | 'ended';
  timestamp: number;
  activeParticipants?: Record<string, boolean>;
}

interface CallingOverlayProps {
  activeCall: ActiveCall;
  currentUser: User;
  users: User[];
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
}

const CallingOverlay: React.FC<CallingOverlayProps> = ({
  activeCall,
  currentUser,
  users,
  onAccept,
  onDecline,
  onEnd
}) => {
  const { t } = useLanguage();
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  const isCaller = activeCall.callerId === currentUser.id;
  const isJoined = activeCall.activeParticipants?.[currentUser.id] === true;

  // Duration timer when connected
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeCall.status === 'connected') {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(timer);
  }, [activeCall.status]);

  // Request Camera & Audio if Video Call and Joined/Connected
  useEffect(() => {
    if (activeCall.mediaType === 'video' && (activeCall.status === 'connected' || (isCaller && activeCall.status !== 'ended'))) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn("Could not access camera/microphone:", err);
        });
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeCall.mediaType, activeCall.status, isCaller]);

  // Format calling duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle audio track
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    }
    setIsMuted(!isMuted);
  };

  // Toggle video track
  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    }
    setIsCameraOff(!isCameraOff);
  };

  // Find target participant info (for private call)
  const targetUser = users.find(u => 
    activeCall.type === 'private' && (isCaller ? u.id === activeCall.receiverId : u.id === activeCall.callerId)
  );

  const callTitle = activeCall.type === 'private' 
    ? (targetUser?.name || activeCall.callerName)
    : (activeCall.groupName || t('collective_call'));

  const callPhoto = activeCall.type === 'private'
    ? (targetUser?.photoURL || activeCall.callerPhoto)
    : undefined;

  // Handle incoming screen vs outgoing vs connected screen
  const showIncoming = !isCaller && !isJoined && activeCall.status !== 'connected';
  const showOutgoing = isCaller && activeCall.status !== 'connected';
  const showConnected = activeCall.status === 'connected' || isJoined;

  return (
    <div className="fixed inset-0 z-[999] bg-zinc-950 text-white flex flex-col justify-between p-6 animate-fade-in select-none">
      
      {/* Top Bar Status / Header */}
      <div className="flex flex-col items-center mt-12 space-y-2 z-10">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
          {activeCall.mediaType === 'video' ? t('video_call') : t('audio_call')}
        </span>
        
        {showConnected ? (
          <span className="text-sm font-semibold tracking-wider font-mono text-emerald-400">
            {formatDuration(duration)}
          </span>
        ) : (
          <span className="text-sm font-semibold tracking-widest animate-pulse text-zinc-400 uppercase">
            {showIncoming ? t('incoming_call') : t('ringing')}
          </span>
        )}
      </div>

      {/* Main visual display area */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-6">
        {activeCall.mediaType === 'video' && showConnected ? (
          // Video call main interface
          <div className="w-full max-w-sm aspect-[3/4] bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl flex items-center justify-center">
            
            {/* Main Video (Local webcam stream) */}
            {!isCameraOff ? (
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" 
              />
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-24 h-24 rounded-full border-2 border-white/20 p-1 bg-zinc-850">
                  <img 
                    src={currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`} 
                    className="w-full h-full rounded-full object-cover" 
                    alt={currentUser.name} 
                  />
                </div>
                <p className="text-xs font-semibold text-zinc-400">Camera Off</p>
              </div>
            )}

            {/* Floating remote picture or details inside video box */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl flex items-center space-x-2 border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-black uppercase tracking-wider">{currentUser.name.split(' ')[0]} (You)</span>
            </div>

            {/* Remote Info in Video mode */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-2 rounded-2xl flex items-center space-x-3 border border-white/5">
              {callPhoto && (
                <img src={callPhoto} className="w-6 h-6 rounded-full border border-white/20" alt="Remote" />
              )}
              <span className="text-xs font-bold">{callTitle.split(' ')[0]}</span>
            </div>

          </div>
        ) : (
          // Voice call or ringing interface
          <div className="flex flex-col items-center space-y-6 z-10">
            
            {/* Pulse rings background */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-blue-500/10 animate-ping" style={{ animationDuration: '3s' }}></div>
              <div className="absolute -inset-8 rounded-full bg-blue-500/5 animate-ping" style={{ animationDuration: '4s' }}></div>
              
              <div className="w-32 h-32 rounded-full border-4 border-white/10 p-1 bg-zinc-900 relative z-10 shadow-2xl overflow-hidden">
                {callPhoto ? (
                  <img src={callPhoto} className="w-full h-full rounded-full object-cover" alt={callTitle} />
                ) : (
                  <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-4xl font-black">
                    {callTitle.substring(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Target caller/receiver text info */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight">{callTitle}</h2>
              {activeCall.type === 'collective' && (
                <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase">
                  {t('collective_call')} • {Object.keys(activeCall.activeParticipants || {}).length} Active
                </p>
              )}
            </div>

            {/* Bouncing audio wave simulation (for active audio calls) */}
            {showConnected && (
              <div className="flex items-center justify-center space-x-1.5 h-8 pt-4">
                {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                  <div 
                    key={bar} 
                    className="w-1 bg-emerald-400 rounded-full animate-bounce"
                    style={{ 
                      height: '100%', 
                      animationDelay: `${bar * 0.15}s`,
                      animationDuration: '0.8s'
                    }}
                  />
                ))}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Action controls button deck */}
      <div className="mb-12 flex justify-center items-center space-x-6 z-10">
        
        {showIncoming ? (
          // INCOMING CALL BUTTONS
          <>
            <button 
              onClick={onDecline}
              className="w-16 h-16 bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
            >
              <i className="fas fa-phone-slash text-xl"></i>
            </button>
            <button 
              onClick={onAccept}
              className="w-16 h-16 bg-emerald-500 hover:bg-emerald-400 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
            >
              <i className="fas fa-phone text-xl"></i>
            </button>
          </>
        ) : (
          // OUTGOING OR CONNECTED BUTTONS
          <>
            {showConnected && (
              <button 
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${
                  isMuted 
                    ? 'bg-red-500/20 border-red-500 text-red-500' 
                    : 'bg-zinc-900 border-white/10 text-white hover:bg-zinc-800'
                }`}
              >
                <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
              </button>
            )}

            <button 
              onClick={onEnd}
              className="w-16 h-16 bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
              title={t('end_call')}
            >
              <i className="fas fa-phone-slash text-xl"></i>
            </button>

            {showConnected && activeCall.mediaType === 'video' && (
              <button 
                onClick={toggleCamera}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${
                  isCameraOff 
                    ? 'bg-red-500/20 border-red-500 text-red-500' 
                    : 'bg-zinc-900 border-white/10 text-white hover:bg-zinc-800'
                }`}
              >
                <i className={`fas ${isCameraOff ? 'fa-video-slash' : 'fa-video'}`}></i>
              </button>
            )}
          </>
        )}

      </div>

    </div>
  );
};

export default CallingOverlay;
