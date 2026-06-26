
import React from 'react';
import { User, Post } from '../types';

interface LeaderboardProps {
  users: User[];
  posts: Post[];
  onUserClick: (uid: string) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ users, posts, onUserClick }) => {
  const rankedUsers = users
    .filter(u => !u.isBanned)
    .map(u => {
      const userLikes = posts
        .filter(p => p.userId === u.id)
        .reduce((acc, p) => acc + (p.likes?.length || 0), 0);
      return { ...u, score: userLikes };
    }).sort((a, b) => b.score - a.score);

  return (
    <div className="p-6">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">VIMOS ELITE</h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em]">The Most Liked Shadows</p>
      </div>

      <div className="space-y-3">
        {rankedUsers.map((user, index) => {
          const fallbackPhoto = `https://api.dicebear.com/7.x/initials/svg?seed=${user.name || 'Unknown'}&backgroundColor=000000&fontFamily=Inter&fontWeight=700`;
          
          return (
            <div 
              key={user.id} 
              className="flex items-center p-4 border border-black/10 rounded-2xl bg-white hover:bg-black hover:text-white transition-all group cursor-pointer"
              onClick={() => onUserClick(user.id)}
            >
              <span className="w-8 font-black italic text-lg opacity-20 group-hover:opacity-50">{index + 1}</span>
              <img src={user.photoURL || fallbackPhoto} className="w-10 h-10 rounded-full mr-4 border border-black/10 bg-gray-100 object-cover" alt={user.name} />
              <div className="flex-1">
                <h4 className="font-bold text-sm uppercase">{user.name || 'Anonymous'}</h4>
                <p className="text-[10px] opacity-60 font-medium uppercase">{(user.followers || []).length} Followers</p>
              </div>
              <div className="text-right">
                <p className="font-black text-lg">{user.score}</p>
                <p className="text-[8px] opacity-60 font-bold uppercase">Likes</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
