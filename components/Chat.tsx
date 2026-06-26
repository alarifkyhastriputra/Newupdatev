
import React, { useState, useEffect } from 'react';
import { User, ChatMessage, Group } from '../types.ts';
import { db } from '../firebase.ts';
import { ref, onValue, push, serverTimestamp, set, update } from 'firebase/database';
import { ActiveCall } from './CallingOverlay.tsx';
import { useLanguage } from '../LanguageContext.tsx';

interface ChatProps {
  users: User[];
  currentUser: User | null;
  onUserClick: (userId: string) => void;
  activeCalls?: ActiveCall[];
  onStartCall?: (type: 'private' | 'collective', mediaType: 'audio' | 'video', targetId: string, name?: string) => void;
  onJoinCall?: (callId: string) => void;
}

const Chat: React.FC<ChatProps> = ({ 
  users, 
  currentUser, 
  onUserClick, 
  activeCalls = [], 
  onStartCall, 
  onJoinCall 
}) => {
  const { t } = useLanguage();
  const [selectedRecipient, setSelectedRecipient] = useState<{ type: 'user' | 'group', data: User | Group } | null>(null);
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isViewingGroupSettings, setIsViewingGroupSettings] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');

  const getChatId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  // Logic to identify MUTUAL FOLLOWERS (Saling Follow Balik)
  const isMutual = (uid: string) => {
    if (!currentUser) return false;
    const following = currentUser.following || [];
    const followers = currentUser.followers || [];
    return following.includes(uid) && followers.includes(uid);
  };

  const mutualFollowers = users.filter(u => u.id !== currentUser?.id && isMutual(u.id));

  // Sync groups user is part of
  useEffect(() => {
    if (!currentUser) return;
    const groupsRef = ref(db, 'groups');
    const unsubscribe = onValue(groupsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userGroups = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ 
            id, 
            ...val, 
            participants: val.participants ? Object.keys(val.participants) : [],
            admins: val.admins ? Object.keys(val.admins) : []
          }))
          .filter((g: Group) => g.participants.includes(currentUser.id));
        setGroups(userGroups);
        
        if (selectedRecipient?.type === 'group') {
          const updated = userGroups.find(g => g.id === (selectedRecipient.data as Group).id);
          if (updated) setSelectedRecipient({ type: 'group', data: updated });
          else setSelectedRecipient(null);
        }
      } else {
        setGroups([]);
      }
    });
    return () => unsubscribe();
  }, [currentUser, selectedRecipient?.type]);

  // Sync messages
  useEffect(() => {
    if (!currentUser || !selectedRecipient) return;
    
    let chatPath = '';
    if (selectedRecipient.type === 'user') {
      const chatId = getChatId(currentUser.id, (selectedRecipient.data as User).id);
      chatPath = `chats/${chatId}/messages`;
    } else {
      chatPath = `groups/${(selectedRecipient.data as Group).id}/messages`;
    }

    const chatRef = ref(db, chatPath);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMessages(Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })));
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [selectedRecipient, currentUser]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim() || !currentUser || !selectedRecipient) return;

    let chatPath = '';
    if (selectedRecipient.type === 'user') {
      const chatId = getChatId(currentUser.id, (selectedRecipient.data as User).id);
      chatPath = `chats/${chatId}/messages`;
    } else {
      chatPath = `groups/${(selectedRecipient.data as Group).id}/messages`;
    }

    const chatRef = ref(db, chatPath);
    push(chatRef, {
      senderId: currentUser.id,
      text: msg,
      timestamp: serverTimestamp()
    });
    
    setMsg('');
  };

  const handleCreateGroup = () => {
    if (!currentUser || !groupName.trim() || selectedForGroup.length === 0) return;
    
    const groupsRef = ref(db, 'groups');
    const newGroupRef = push(groupsRef);
    
    const participants: Record<string, boolean> = { [currentUser.id]: true };
    const admins: Record<string, boolean> = { [currentUser.id]: true };
    selectedForGroup.forEach(id => participants[id] = true);

    set(newGroupRef, {
      name: groupName,
      bio: 'New collective space.',
      creatorId: currentUser.id,
      participants,
      admins,
      timestamp: serverTimestamp()
    });

    setGroupName('');
    setSelectedForGroup([]);
    setIsCreatingGroup(false);
  };

  const updateGroupInfo = (groupId: string, data: any) => {
    update(ref(db, `groups/${groupId}`), data);
  };

  const handleAddMember = (groupId: string, userId: string) => {
    // Only add if mutual
    if (!isMutual(userId)) return;
    set(ref(db, `groups/${groupId}/participants/${userId}`), true);
  };

  const handleRemoveMember = (groupId: string, userId: string) => {
    if (!confirm('Kick this member from the collective?')) return;
    set(ref(db, `groups/${groupId}/participants/${userId}`), null);
    set(ref(db, `groups/${groupId}/admins/${userId}`), null);
  };

  const handlePromoteAdmin = (groupId: string, userId: string) => {
    set(ref(db, `groups/${groupId}/admins/${userId}`), true);
  };

  const handleLeaveGroup = (groupId: string) => {
    if (!confirm('Leave this collective?')) return;
    if (!currentUser) return;
    set(ref(db, `groups/${groupId}/participants/${currentUser.id}`), null);
    set(ref(db, `groups/${groupId}/admins/${currentUser.id}`), null);
    setSelectedRecipient(null);
    setIsViewingGroupSettings(false);
  };

  const handleGroupPhotoChange = (groupId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateGroupInfo(groupId, { photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleParticipantSelection = (uid: string) => {
    setSelectedForGroup(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  if (isCreatingGroup) {
    return (
      <div className="p-4 flex flex-col h-full bg-white animate-fade-in">
        <div className="flex items-center mb-6">
          <button onClick={() => setIsCreatingGroup(false)} className="mr-4 text-black w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 className="text-xl font-black uppercase tracking-tighter">New Collective</h2>
        </div>

        <div className="space-y-4 mb-6">
          <label className="text-[10px] font-black uppercase tracking-widest ml-2 opacity-50">Collective Name</label>
          <input 
            type="text" 
            placeholder="Name your Collective..." 
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            className="w-full p-4 border-2 border-black rounded-2xl font-bold focus:outline-none focus:ring-1 focus:ring-black transition-all"
          />
        </div>

        <p className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-40">Add Mutual Shadows ({mutualFollowers.length})</p>
        
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
          {mutualFollowers.length === 0 ? (
            <div className="text-center py-10 text-gray-400 italic text-sm px-6">
              You can only create groups with people who follow you back.
            </div>
          ) : (
            mutualFollowers.map(u => (
              <div 
                key={u.id} 
                onClick={() => toggleParticipantSelection(u.id)}
                className={`flex items-center p-3 rounded-2xl border transition-all cursor-pointer ${
                  selectedForGroup.includes(u.id) ? 'border-black bg-black text-white shadow-md' : 'border-black/5 bg-gray-50'
                }`}
              >
                <img src={u.photoURL} className="w-10 h-10 rounded-full mr-3 border border-black/10" alt={u.name} />
                <div className="flex-1">
                  <p className="font-bold text-sm uppercase">{u.name}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  selectedForGroup.includes(u.id) ? 'border-white bg-white' : 'border-black/20'
                }`}>
                  {selectedForGroup.includes(u.id) && <i className="fas fa-check text-[10px] text-black"></i>}
                </div>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={handleCreateGroup}
          disabled={!groupName.trim() || selectedForGroup.length === 0}
          className="w-full bg-black text-white p-4 rounded-2xl font-black uppercase tracking-widest disabled:opacity-20 transition-all shadow-lg active:scale-95"
        >
          Assemble
        </button>
      </div>
    );
  }

  if (isViewingGroupSettings && selectedRecipient?.type === 'group') {
    const group = selectedRecipient.data as Group;
    const isAdmin = currentUser && group.admins.includes(currentUser.id);
    const mutualNonMembers = mutualFollowers.filter(u => !group.participants.includes(u.id));

    return (
      <div className="p-4 flex flex-col h-full bg-white overflow-y-auto pb-20 animate-fade-in">
        <div className="flex items-center mb-8">
          <button onClick={() => setIsViewingGroupSettings(false)} className="mr-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 className="text-xl font-black uppercase tracking-tighter">Collective Management</h2>
        </div>

        <div className="flex flex-col items-center mb-10">
          <div className="relative group mb-6">
            {group.photoURL ? (
              <img src={group.photoURL} className="w-32 h-32 rounded-full border-4 border-black object-cover shadow-xl" alt={group.name} />
            ) : (
              <div className="w-32 h-32 rounded-full bg-black text-white flex items-center justify-center text-4xl font-black border-4 border-black shadow-xl">
                {group.name.substring(0, 1).toUpperCase()}
              </div>
            )}
            {isAdmin && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                <i className="fas fa-camera text-white text-2xl"></i>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleGroupPhotoChange(group.id, e)} />
              </label>
            )}
          </div>

          {isAdmin ? (
            <div className="w-full space-y-6 px-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Group Name</label>
                <input 
                  type="text" 
                  defaultValue={group.name} 
                  onBlur={(e) => updateGroupInfo(group.id, { name: e.target.value })}
                  className="w-full text-center text-2xl font-black uppercase tracking-tighter border-b-2 border-black focus:outline-none focus:border-gray-400 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Collective Bio</label>
                <textarea 
                  defaultValue={group.bio} 
                  onBlur={(e) => updateGroupInfo(group.id, { bio: e.target.value })}
                  className="w-full text-center text-sm text-gray-500 border-b border-black/10 focus:outline-none focus:border-black transition-colors resize-none py-2"
                  placeholder="Set the vibe for this collective..."
                />
              </div>
            </div>
          ) : (
            <div className="text-center px-6">
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">{group.name}</h3>
              <p className="text-sm text-gray-500 leading-relaxed italic">{group.bio || 'A silent collective.'}</p>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4 px-2">Shadows ({group.participants.length})</h4>
          <div className="space-y-2">
            {group.participants.map(pid => {
              const u = users.find(user => user.id === pid);
              if (!u) return null;
              const isParticipantAdmin = group.admins.includes(pid);
              const isSelf = pid === currentUser?.id;

              return (
                <div key={pid} className="flex items-center p-3 border border-black/5 rounded-2xl bg-white shadow-sm hover:border-black transition-all">
                  <img src={u.photoURL} className="w-10 h-10 rounded-full mr-4 border border-black/10 object-cover" alt={u.name} />
                  <div className="flex-1">
                    <p className="text-sm font-bold uppercase">{u.name} {isSelf && <span className="text-[8px] text-gray-400 font-normal ml-1">(You)</span>}</p>
                    {isParticipantAdmin && <span className="text-[8px] font-black uppercase bg-black text-white px-1.5 py-0.5 rounded tracking-tighter">Admin</span>}
                  </div>
                  {isAdmin && !isSelf && (
                    <div className="flex items-center space-x-2">
                      {!isParticipantAdmin && (
                        <button 
                          onClick={() => handlePromoteAdmin(group.id, pid)} 
                          className="text-[10px] font-black uppercase underline hover:text-gray-500"
                        >
                          Promote
                        </button>
                      )}
                      <button 
                        onClick={() => handleRemoveMember(group.id, pid)} 
                        className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 bg-white border border-red-500/20 rounded-full transition-all"
                        title="Kick Member"
                      >
                        <i className="fas fa-user-xmark text-xs"></i>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isAdmin && (
          <div className="mb-10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4 px-2">Add Mutual Shadows</h4>
            {mutualNonMembers.length === 0 ? (
              <p className="text-center text-[10px] text-gray-400 uppercase font-bold py-4">No more mutual shadows to add.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {mutualNonMembers.map(u => (
                  <div key={u.id} className="flex items-center p-3 bg-gray-50 rounded-2xl border border-transparent hover:border-black transition-all">
                    <img src={u.photoURL} className="w-9 h-9 rounded-full mr-3 border border-black/10" alt={u.name} />
                    <p className="flex-1 text-xs font-bold uppercase">{u.name}</p>
                    <button 
                      onClick={() => handleAddMember(group.id, u.id)} 
                      className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-full hover:bg-black hover:text-white transition-all active:scale-90"
                    >
                      <i className="fas fa-plus text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button 
          onClick={() => handleLeaveGroup(group.id)}
          className="w-full py-4 border-2 border-red-500 text-red-500 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-95 mb-10"
        >
          Leave Collective
        </button>
      </div>
    );
  }

  if (!selectedRecipient) {
    return (
      <div className="p-4 h-full flex flex-col animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black uppercase tracking-tighter">Echoes</h2>
          <button 
            onClick={() => setIsCreatingGroup(true)}
            className="w-12 h-12 flex items-center justify-center border-2 border-black rounded-full hover:bg-black hover:text-white transition-all shadow-lg active:scale-90"
            title="Create Collective"
          >
            <i className="fas fa-users-viewfinder text-lg"></i>
          </button>
        </div>

        <div className="flex border-b-2 border-black/5 mb-8">
          <button 
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
              activeTab === 'direct' ? 'border-black text-black' : 'border-transparent text-gray-300'
            }`}
          >
            Direct
          </button>
          <button 
            onClick={() => setActiveTab('groups')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
              activeTab === 'groups' ? 'border-black text-black' : 'border-transparent text-gray-300'
            }`}
          >
            Collectives
          </button>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          {activeTab === 'direct' ? (
            mutualFollowers.length === 0 ? (
              <div className="text-center py-20 text-gray-300 italic text-sm px-6">
                Direct whispers are only for mutual shadows (who follow each other).
              </div>
            ) : (
              mutualFollowers.map(u => (
                <div key={u.id} className="flex items-center border border-black/5 rounded-2xl hover:border-black transition-all group p-4 bg-white shadow-sm">
                  <img 
                    src={u.photoURL} 
                    className="w-12 h-12 rounded-full mr-4 border border-black/10 bg-gray-100 cursor-pointer object-cover shadow-sm" 
                    alt={u.name} 
                    onClick={() => onUserClick(u.id)}
                  />
                  <button 
                    onClick={() => setSelectedRecipient({ type: 'user', data: u })}
                    className="flex-1 text-left"
                  >
                    <p className="font-bold text-sm uppercase">{u.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Mutual Connection</p>
                  </button>
                  <i className="fas fa-chevron-right text-gray-200 group-hover:text-black transition-colors"></i>
                </div>
              ))
            )
          ) : (
            groups.length === 0 ? (
              <div className="text-center py-20 text-gray-300 italic text-sm">You haven't joined any collectives yet.</div>
            ) : (
              groups.map(g => (
                <div key={g.id} className="flex items-center border border-black/5 rounded-2xl hover:border-black transition-all group p-4 bg-white shadow-sm">
                  {g.photoURL ? (
                    <img src={g.photoURL} className="w-12 h-12 rounded-full mr-4 border border-black/10 object-cover shadow-sm" alt={g.name} />
                  ) : (
                    <div className="w-12 h-12 rounded-full mr-4 bg-black text-white flex items-center justify-center text-lg font-black border border-black/10">
                      {g.name.substring(0, 1).toUpperCase()}
                    </div>
                  )}
                  <button 
                    onClick={() => setSelectedRecipient({ type: 'group', data: g })}
                    className="flex-1 text-left"
                  >
                    <p className="font-bold text-sm uppercase">{g.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{g.participants.length} Shadows</p>
                  </button>
                  <i className="fas fa-chevron-right text-gray-200 group-hover:text-black transition-colors"></i>
                </div>
              ))
            )
          )}
        </div>
      </div>
    );
  }

  const headerTitle = selectedRecipient.type === 'user' 
    ? (selectedRecipient.data as User).name 
    : (selectedRecipient.data as Group).name;

  const headerPhoto = selectedRecipient.type === 'user' 
    ? (selectedRecipient.data as User).photoURL 
    : (selectedRecipient.data as Group).photoURL;

  const activeGroupCall = selectedRecipient.type === 'group'
    ? activeCalls.find(c => 
        c.type === 'collective' && 
        c.status !== 'ended' && 
        c.groupId === selectedRecipient.data.id
      )
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-fade-in">
      <div className="p-4 border-b border-black/5 flex items-center space-x-3 bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <button onClick={() => setSelectedRecipient(null)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
          <i className="fas fa-arrow-left"></i>
        </button>
        {headerPhoto ? (
          <img 
            src={headerPhoto} 
            className="w-10 h-10 rounded-full bg-gray-100 cursor-pointer object-cover border border-black/10 shadow-sm" 
            alt={headerTitle} 
            onClick={() => selectedRecipient.type === 'user' ? onUserClick((selectedRecipient.data as User).id) : setIsViewingGroupSettings(true)}
          />
        ) : (
          <div 
            className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-black cursor-pointer shadow-sm"
            onClick={() => setIsViewingGroupSettings(true)}
          >
            {headerTitle.substring(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 
            className="font-black text-sm uppercase tracking-tighter truncate cursor-pointer hover:underline"
            onClick={() => selectedRecipient.type === 'user' ? onUserClick((selectedRecipient.data as User).id) : setIsViewingGroupSettings(true)}
          >
            {headerTitle}
          </h3>
          {selectedRecipient.type === 'group' && (
            <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Collective Frequency</p>
          )}
        </div>
        {selectedRecipient.type === 'user' ? (
          onStartCall && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onStartCall('private', 'audio', (selectedRecipient.data as User).id)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-zinc-600 hover:text-black transition-colors"
                title={t('start_voice_call')}
              >
                <i className="fas fa-phone"></i>
              </button>
              <button
                onClick={() => onStartCall('private', 'video', (selectedRecipient.data as User).id)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-zinc-600 hover:text-black transition-colors"
                title={t('start_video_call')}
              >
                <i className="fas fa-video"></i>
              </button>
            </div>
          )
        ) : (
          <div className="flex items-center space-x-2">
            {activeGroupCall ? (
              <button 
                onClick={() => onJoinCall && onJoinCall(activeGroupCall.id)}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 animate-pulse shadow-md"
              >
                <i className="fas fa-phone"></i>
                <span>{t('join_call')}</span>
              </button>
            ) : (
              onStartCall && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onStartCall('collective', 'audio', (selectedRecipient.data as Group).id, (selectedRecipient.data as Group).name)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-zinc-600 hover:text-black transition-colors"
                    title={t('start_voice_call')}
                  >
                    <i className="fas fa-phone"></i>
                  </button>
                  <button
                    onClick={() => onStartCall('collective', 'video', (selectedRecipient.data as Group).id, (selectedRecipient.data as Group).name)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-zinc-600 hover:text-black transition-colors"
                    title={t('start_video_call')}
                  >
                    <i className="fas fa-video"></i>
                  </button>
                </div>
              )
            )}
            <button 
              onClick={() => setIsViewingGroupSettings(true)} 
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <i className="fas fa-ellipsis-vertical"></i>
            </button>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 scroll-smooth">
        {messages.map((m) => {
          const isMe = m.senderId === currentUser?.id;
          const sender = users.find(u => u.id === m.senderId);
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start animate-fade-in'}`}>
              {!isMe && selectedRecipient.type === 'group' && (
                <span className="text-[8px] font-black uppercase tracking-widest mb-1 ml-1 opacity-40">{sender?.name || 'Shadow'}</span>
              )}
              <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium shadow-sm transition-all hover:scale-[1.01] ${
                isMe ? 'bg-black text-white rounded-br-none' : 'bg-white border border-black/5 text-black rounded-bl-none'
              }`}>
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-black/5 bg-white flex space-x-2">
        <input 
          type="text" 
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Type a whisper..."
          className="flex-1 bg-gray-50 border-2 border-black rounded-full px-6 py-3 text-sm focus:outline-none focus:bg-white transition-all shadow-inner"
        />
        <button 
          type="submit" 
          disabled={!msg.trim()}
          className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg disabled:opacity-20"
        >
          <i className="fas fa-paper-plane text-sm"></i>
        </button>
      </form>
    </div>
  );
};

export default Chat;
