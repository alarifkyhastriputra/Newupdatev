
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, User, Post, Comment, Notification, Announcement } from './types.ts';
import Header from './components/Header.tsx';
import Navbar from './components/Navbar.tsx';
import Feed from './components/Feed.tsx';
import PostCreator from './components/PostCreator.tsx';
import Leaderboard from './components/Leaderboard.tsx';
import Chat from './components/Chat.tsx';
import Profile from './components/Profile.tsx';
import Notifications from './components/Notifications.tsx';
import Reels from './components/Reels.tsx';
import AuthScreen from './components/AuthScreen.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { auth, db } from './firebase.ts';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, set, update, push, remove, Unsubscribe as DBUnsubscribe } from 'firebase/database';
import { useLanguage } from './LanguageContext.tsx';
import CallingOverlay, { ActiveCall } from './components/CallingOverlay.tsx';

// List Admin King
const ADMIN_EMAILS = ['nwaystore68@gmail.com', 'nwaystore78@gmail.com', 'nocteos609@gmail.com'];

export default function App() {
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<View>(View.FEED);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [currentCall, setCurrentCall] = useState<ActiveCall | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [bannedMessage, setBannedMessage] = useState<string | null>(null);

  const userUnsubscribeRef = useRef<DBUnsubscribe | null>(null);

  const isEmailAdmin = (email?: string | null) => {
    if (!email) return false;
    return ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (userUnsubscribeRef.current) {
        userUnsubscribeRef.current();
        userUnsubscribeRef.current = null;
      }

      if (user) {
        const isAdmin = isEmailAdmin(user.email);
        
        // Optimistically set currentUser to avoid loading screen
        setCurrentUser(prev => prev || {
          id: user.uid,
          name: user.displayName || 'Anonymous Shadow',
          email: user.email || '',
          bio: 'A wandering soul in Vimos.',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.uid}&backgroundColor=000000`,
          followers: [],
          following: [],
          recentCaptures: [],
          totalLikes: 0,
          isAdmin: isAdmin
        });
        setAuthLoading(false);

        const userRef = ref(db, `users/${user.uid}`);
        
        userUnsubscribeRef.current = onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.isBanned) {
              setBannedMessage(t('banned_msg'));
              signOut(auth);
              return;
            }
            if (data.isAdmin !== isAdmin) {
              update(userRef, { isAdmin: isAdmin });
            }
            setCurrentUser({ 
              id: user.uid, 
              ...data,
              isAdmin: isAdmin,
              followers: data.followers ? Object.keys(data.followers) : [],
              following: data.following ? Object.keys(data.following) : [],
              recentCaptures: data.recentCaptures ? Object.values(data.recentCaptures) : []
            });
          } else {
            const newUser = {
              name: user.displayName || 'Anonymous Shadow',
              email: user.email || '',
              bio: 'A wandering soul in Vimos.',
              photoURL: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.uid}&backgroundColor=000000`,
              followers: {},
              following: {},
              recentCaptures: {},
              totalLikes: 0,
              isAdmin: isAdmin
            };
            set(userRef, newUser);
            setCurrentUser({
              id: user.uid,
              ...newUser,
              followers: [],
              following: [],
              recentCaptures: []
            });
          }
        });
      } else {
        setCurrentUser(null);
        setCurrentView(View.FEED);
        setSelectedProfileId(null);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (userUnsubscribeRef.current) userUnsubscribeRef.current();
    };
  }, []);

  useEffect(() => {
    const postsRef = ref(db, 'posts');
    const storiesRef = ref(db, 'stories');
    const usersRef = ref(db, 'users');
    const annRef = ref(db, 'announcements');

    const unsubscribePosts = onValue(postsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const postList = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
          likes: val.likes ? Object.keys(val.likes) : [],
          dislikes: val.dislikes ? Object.keys(val.dislikes) : [],
          comments: val.comments ? Object.entries(val.comments).map(([cid, cval]: [string, any]) => ({ id: cid, ...cval })) : []
        }));
        setPosts(postList.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setPosts([]);
      }
      setLoadingPosts(false);
    });

    const unsubscribeStories = onValue(storiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const validStories: Story[] = [];
        
        Object.entries(data).forEach(([id, val]: [string, any]) => {
          if (now - val.createdAt < twentyFourHours) {
            validStories.push({ id, ...val });
          } else {
            remove(ref(db, `stories/${id}`));
          }
        });
        setStories(validStories.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setStories([]);
      }
    });

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
          followers: val.followers ? Object.keys(val.followers) : [],
          following: val.following ? Object.keys(val.following) : [],
          recentCaptures: val.recentCaptures ? Object.values(val.recentCaptures) : [],
          isAdmin: isEmailAdmin(val.email)
        }));
        setUsers(userList);
      }
    });

    const unsubscribeAnn = onValue(annRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const annList = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        }));
        setAnnouncements(annList.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setAnnouncements([]);
      }
    });

    return () => {
      unsubscribePosts();
      unsubscribeStories();
      unsubscribeUsers();
      unsubscribeAnn();
    };
  }, []);

  useEffect(() => {
    const callsRef = ref(db, 'calls');
    const unsubscribeCalls = onValue(callsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
          activeParticipants: val.activeParticipants || {}
        })) as ActiveCall[];
        setActiveCalls(list);

        if (currentUser) {
          const incomingPrivateCall = list.find(c => 
            c.type === 'private' && 
            c.receiverId === currentUser.id && 
            c.status !== 'ended'
          );

          const outgoingCall = list.find(c => 
            c.callerId === currentUser.id && 
            c.status !== 'ended'
          );

          const manuallyJoinedCall = list.find(c => 
            c.status !== 'ended' && 
            c.activeParticipants?.[currentUser.id] === true
          );

          if (incomingPrivateCall) {
            setCurrentCall(incomingPrivateCall);
          } else if (outgoingCall) {
            setCurrentCall(outgoingCall);
          } else if (manuallyJoinedCall) {
            setCurrentCall(manuallyJoinedCall);
          } else {
            setCurrentCall(null);
          }
        } else {
          setCurrentCall(null);
        }
      } else {
        setActiveCalls([]);
        setCurrentCall(null);
      }
    });

    return () => unsubscribeCalls();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const notifRef = ref(db, `notifications/${currentUser.id}`);
    const unsubscribeNotifs = onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })).sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(list);
      } else {
        setNotifications([]);
      }
    });
    return () => unsubscribeNotifs();
  }, [currentUser?.id]);

  const toggleFollow = (targetId: string) => {
    if (!currentUser || currentUser.id === targetId) return;
    const isFollowing = (currentUser.following || []).includes(targetId);
    const myFollowingRef = ref(db, `users/${currentUser.id}/following/${targetId}`);
    const theirFollowersRef = ref(db, `users/${targetId}/followers/${currentUser.id}`);
    if (isFollowing) {
      set(myFollowingRef, null);
      set(theirFollowersRef, null);
    } else {
      set(myFollowingRef, true);
      set(theirFollowersRef, true);
      push(ref(db, `notifications/${targetId}`), {
        senderId: currentUser.id,
        senderName: currentUser.name || 'Shadow',
        senderPhoto: currentUser.photoURL,
        type: 'follow',
        timestamp: Date.now(),
        read: false
      });
    }
  };

  const toggleLike = (postId: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const hasLiked = (post.likes || []).includes(currentUser.id);
    const likeRef = ref(db, `posts/${postId}/likes/${currentUser.id}`);
    set(likeRef, hasLiked ? null : true);
    if (!hasLiked && post.userId !== currentUser.id) {
      push(ref(db, `notifications/${post.userId}`), {
        senderId: currentUser.id,
        senderName: currentUser.name || 'Shadow',
        senderPhoto: currentUser.photoURL,
        type: 'like',
        timestamp: Date.now(),
        read: false
      });
    }
  };

  const toggleDislike = (postId: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const hasDisliked = (post.dislikes || []).includes(currentUser.id);
    const dislikeRef = ref(db, `posts/${postId}/dislikes/${currentUser.id}`);
    set(dislikeRef, hasDisliked ? null : true);
    if (!hasDisliked) {
      set(ref(db, `posts/${postId}/likes/${currentUser.id}`), null);
    }
  };

  const addComment = (postId: string, text: string) => {
    if (!currentUser || !text.trim()) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const commentsRef = ref(db, `posts/${postId}/comments`);
    push(commentsRef, {
      userId: currentUser.id,
      userName: currentUser.name || 'Shadow',
      text: text.trim(),
      timestamp: Date.now()
    });
    if (post.userId !== currentUser.id) {
      push(ref(db, `notifications/${post.userId}`), {
        senderId: currentUser.id,
        senderName: currentUser.name || 'Shadow',
        senderPhoto: currentUser.photoURL,
        type: 'comment',
        timestamp: Date.now(),
        read: false
      });
    }
  };

  const addStory = (text: string, photoURL: string) => {
    if (!currentUser) return;
    push(ref(db, 'stories'), {
      userId: currentUser.id,
      userName: currentUser.name || 'Anonymous Shadow',
      userPhoto: currentUser.photoURL || '',
      createdAt: Date.now(),
      text,
      photoURL: photoURL || null
    });
  };

  const startCall = (type: 'private' | 'collective', mediaType: 'audio' | 'video', targetId: string, name?: string) => {
    if (!currentUser) return;
    const callId = type === 'private' ? `private_${[currentUser.id, targetId].sort().join('_')}` : `group_${targetId}`;
    const callRef = ref(db, `calls/${callId}`);
    const newCall: any = {
      type,
      mediaType,
      callerId: currentUser.id,
      callerName: currentUser.name || 'Anonymous Shadow',
      callerPhoto: currentUser.photoURL || '',
      status: 'calling',
      timestamp: Date.now(),
      activeParticipants: { [currentUser.id]: true }
    };
    if (type === 'private') {
      newCall.receiverId = targetId;
    } else {
      newCall.groupId = targetId;
      newCall.groupName = name || 'Collective';
    }
    set(callRef, newCall);
  };

  const acceptCall = () => {
    if (!currentCall || !currentUser) return;
    const callRef = ref(db, `calls/${currentCall.id}`);
    update(callRef, {
      status: 'connected',
      [`activeParticipants/${currentUser.id}`]: true
    });
  };

  const declineCall = () => {
    if (!currentCall) return;
    const callRef = ref(db, `calls/${currentCall.id}`);
    update(callRef, { status: 'ended' });
  };

  const endCall = () => {
    if (!currentCall || !currentUser) return;
    const callRef = ref(db, `calls/${currentCall.id}`);
    
    if (currentCall.type === 'private') {
      update(callRef, { status: 'ended' });
    } else {
      const participants = { ...currentCall.activeParticipants };
      delete participants[currentUser.id];
      
      if (Object.keys(participants).length === 0) {
        update(callRef, { status: 'ended' });
      } else {
        set(ref(db, `calls/${currentCall.id}/activeParticipants/${currentUser.id}`), null);
      }
    }
  };

  const joinCall = (callId: string) => {
    if (!currentUser) return;
    set(ref(db, `calls/${callId}/activeParticipants/${currentUser.id}`), true);
  };

  const createPost = (data: { text: string; photoURL?: string; videoURL?: string; musicURL?: string }) => {
    if (!currentUser) return;
    push(ref(db, 'posts'), {
      userId: currentUser.id,
      userName: currentUser.name || 'Anonymous Shadow',
      userPhoto: currentUser.photoURL || '',
      timestamp: Date.now(),
      text: data.text,
      photoURL: data.photoURL || null,
      videoURL: data.videoURL || null,
      musicURL: data.musicURL || null,
      likes: {},
      dislikes: {},
      comments: {}
    });
    setCurrentView(View.FEED);
  };

  const addAnnouncement = (text: string) => {
    if (!currentUser?.isAdmin) return;
    push(ref(db, 'announcements'), {
      text,
      timestamp: Date.now(),
      authorId: currentUser.id
    });
  };

  const updateAnnouncement = (id: string, text: string) => {
    if (!currentUser?.isAdmin) return;
    update(ref(db, `announcements/${id}`), { text });
  };

  const deleteAnnouncement = (id: string) => {
    if (!currentUser?.isAdmin) return;
    remove(ref(db, `announcements/${id}`));
  };

  const deletePost = (id: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === id);
    if (!post) return;
    if (post.userId === currentUser.id || currentUser.isAdmin) {
      remove(ref(db, `posts/${id}`));
    }
  };

  const handleLogout = () => signOut(auth);

  const filteredPosts = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    return posts
      .filter(p => !p.isTakenDown || currentUser?.isAdmin)
      .filter(p => 
        (p.text || '').toLowerCase().includes(term) ||
        (p.userName || '').toLowerCase().includes(term)
      );
  }, [posts, searchTerm, currentUser]);

  const profileToDisplay = useMemo(() => {
    if (selectedProfileId) return users.find(u => u.id === selectedProfileId) || null;
    return currentUser;
  }, [selectedProfileId, users, currentUser]);

  if (authLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white animate-fade-in">
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-black/5 animate-ping" style={{ animationDuration: '2s' }}></div>
        <div className="w-16 h-16 rounded-3xl bg-black flex items-center justify-center relative z-10 shadow-lg">
          <i className="fas fa-circle-notch text-white text-2xl animate-spin"></i>
        </div>
      </div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 animate-pulse">
        CONNECTING...
      </p>
    </div>
  );

  if (!currentUser) return <AuthScreen bannedMessage={bannedMessage} />;

  return (
    <div className="flex flex-col min-h-screen bg-white max-w-xl mx-auto border-x border-gray-100 shadow-sm relative overflow-hidden">
      <Header 
        onSearch={setSearchTerm} 
        users={users} 
        onUserClick={(id) => { setSelectedProfileId(id); setCurrentView(View.PROFILE); }} 
        onLeaderboardClick={() => setCurrentView(View.LEADERBOARD)}
        isAdmin={currentUser.isAdmin}
        onAdminClick={() => setCurrentView(View.ADMIN)}
      />

      <main className="flex-1 pb-20 overflow-y-auto scroll-smooth">
        {currentView === View.FEED && (
          <Feed 
            posts={filteredPosts} 
            stories={stories}
            onAddStory={addStory}
            announcements={announcements}
            onLike={toggleLike} 
            onDislike={toggleDislike}
            onComment={addComment}
            onUserClick={(id) => { setSelectedProfileId(id); setCurrentView(View.PROFILE); }}
            currentUser={currentUser}
            onFollow={toggleFollow}
            onTakeDownPost={(id) => {
              const post = posts.find(p => p.id === id);
              update(ref(db, `posts/${id}`), { isTakenDown: !post?.isTakenDown });
            }}
            onDeletePost={deletePost}
            users={users}
            isLoading={loadingPosts}
          />
        )}
        {currentView === View.REELS && (
          <Reels 
            posts={posts.filter(p => p.videoURL && (!p.isTakenDown || currentUser?.isAdmin))} 
            onLike={toggleLike} 
            onComment={addComment} 
            onUserClick={(id) => { setSelectedProfileId(id); setCurrentView(View.PROFILE); }} 
            currentUser={currentUser}
            onTakeDownPost={(id) => {
              const post = posts.find(p => p.id === id);
              update(ref(db, `posts/${id}`), { isTakenDown: !post?.isTakenDown });
            }}
            onDeletePost={deletePost}
            users={users}
          />
        )}
        {currentView === View.POST && <PostCreator onPost={createPost} />}
        {currentView === View.LEADERBOARD && <Leaderboard users={users} posts={posts} onUserClick={(id) => { setSelectedProfileId(id); setCurrentView(View.PROFILE); }} />}
        {currentView === View.NOTIFICATIONS && (
          <Notifications 
            notifications={notifications} 
            currentUser={currentUser} 
            onFollow={toggleFollow}
            onUserClick={(id) => { setSelectedProfileId(id); setCurrentView(View.PROFILE); }}
            onClearAll={() => {
              const updates: any = {};
              notifications.forEach(n => updates[`notifications/${currentUser.id}/${n.id}/read`] = true);
              update(ref(db), updates);
            }}
            users={users}
          />
        )}
        {currentView === View.CHAT && (
          <Chat 
            users={users} 
            currentUser={currentUser} 
            activeCalls={activeCalls}
            onStartCall={startCall}
            onJoinCall={joinCall}
            onUserClick={(id) => { setSelectedProfileId(id); setCurrentView(View.PROFILE); }} 
          />
        )}
        {currentView === View.PROFILE && profileToDisplay && (
          <Profile 
            user={profileToDisplay} 
            users={users}
            posts={posts}
            currentUser={currentUser}
            onToggleFollow={toggleFollow}
            onLike={toggleLike}
            onDislike={toggleDislike}
            onComment={addComment}
            onTakeDownPost={(id) => {
              const post = posts.find(p => p.id === id);
              update(ref(db, `posts/${id}`), { isTakenDown: !post?.isTakenDown });
            }}
            onDeletePost={deletePost}
            onUpdateProfile={(data) => update(ref(db, `users/${currentUser.id}`), data)}
            onAddCapture={(url) => push(ref(db, `users/${currentUser.id}/recentCaptures`), url)}
            onUserClick={(id) => { setSelectedProfileId(id); setCurrentView(View.PROFILE); }}
            onLogout={handleLogout}
            onBanUser={(id) => {
              const user = users.find(u => u.id === id);
              update(ref(db, `users/${id}`), { isBanned: !user?.isBanned });
            }}
            onSetRole={(id, role, color) => update(ref(db, `users/${id}`), { role, roleColor: color })}
          />
        )}
        {currentView === View.ADMIN && currentUser.isAdmin && (
          <AdminPanel 
            users={users} 
            announcements={announcements}
            onAddAnnouncement={addAnnouncement}
            onUpdateAnnouncement={updateAnnouncement}
            onDeleteAnnouncement={deleteAnnouncement}
            onSetRole={(id, role, color) => update(ref(db, `users/${id}`), { role, roleColor: color })} 
            onBanUser={(id) => {
              const user = users.find(u => u.id === id);
              update(ref(db, `users/${id}`), { isBanned: !user?.isBanned });
            }}
            onUserClick={(id) => { setSelectedProfileId(id); setCurrentView(View.PROFILE); }}
          />
        )}
      </main>

      <Navbar 
        activeView={currentView} 
        onViewChange={(view) => {
          if (view === View.PROFILE) setSelectedProfileId(currentUser.id);
          setCurrentView(view);
          setSearchTerm('');
        }} 
        unreadCount={notifications.filter(n => !n.read).length}
      />

      {currentCall && currentUser && (
        <CallingOverlay
          activeCall={currentCall}
          currentUser={currentUser}
          users={users}
          onAccept={acceptCall}
          onDecline={declineCall}
          onEnd={endCall}
        />
      )}
    </div>
  );
}
