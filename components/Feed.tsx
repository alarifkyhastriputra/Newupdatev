
import React from 'react';
import { Post, User, Announcement, Story } from '../types.ts';
import PostCard from './PostCard.tsx';
import Stories from './Stories.tsx';
import { useLanguage } from '../LanguageContext.tsx';

interface FeedProps {
  posts: Post[];
  stories?: Story[];
  onAddStory?: (text: string, photoURL: string) => void;
  announcements?: Announcement[];
  onLike: (postId: string) => void;
  onDislike: (postId: string) => void;
  onComment: (postId: string, text: string) => void;
  onUserClick: (userId: string) => void;
  currentUser: User;
  onFollow: (userId: string) => void;
  onTakeDownPost?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  users: User[];
}

const Feed: React.FC<FeedProps> = ({ 
  posts, stories = [], onAddStory, announcements = [], onLike, onDislike, onComment, onUserClick, currentUser, onFollow, onTakeDownPost, onDeletePost, users 
}) => {
  const { t } = useLanguage();
  return (
    <div className="p-4 flex flex-col space-y-6">
      {/* Stories Section */}
      {onAddStory && <Stories stories={stories} currentUser={currentUser} onAddStory={onAddStory} users={users} />}
      
      {/* King's Proclamation Section */}
      {announcements.length > 0 && (
        <div className="space-y-3 mb-2">
          {announcements.map((ann) => (
            <div 
              key={ann.id} 
              className="bg-black border-4 border-black rounded-2xl p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] relative overflow-hidden group animate-fade-in"
            >
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <i className="fas fa-crown text-4xl text-white"></i>
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="bg-yellow-400 text-black text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-[0.2em] flex items-center">
                  <i className="fas fa-crown text-[6px] mr-1"></i>
                  King's Broadcast
                </span>
                <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">
                  {new Date(ann.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="text-white text-sm font-bold leading-relaxed">
                {ann.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <i className="fas fa-ghost text-4xl mb-4"></i>
          <p className="font-medium">{t('nothing_here')}</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            onLike={onLike} 
            onDislike={onDislike}
            onComment={onComment}
            onUserClick={onUserClick}
            currentUser={currentUser}
            onFollow={onFollow}
            onTakeDownPost={onTakeDownPost}
            onDeletePost={onDeletePost}
            users={users}
          />
        ))
      )}
    </div>
  );
};

export default React.memo(Feed);
