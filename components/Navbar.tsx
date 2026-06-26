
import React from 'react';
import { View } from '../types';

interface NavbarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  unreadCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ activeView, onViewChange, unreadCount = 0 }) => {
  const tabs = [
    { id: View.FEED, icon: 'fa-home', label: 'Home' },
    { id: View.REELS, icon: 'fa-film', label: 'Reels' },
    { id: View.POST, icon: 'fa-plus-circle', label: 'Mem' },
    { id: View.NOTIFICATIONS, icon: 'fa-bell', label: 'Alerts', count: unreadCount },
    { id: View.CHAT, icon: 'fa-comments', label: 'Inbox' },
    { id: View.PROFILE, icon: 'fa-user', label: 'You' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 shadow-lg max-w-xl mx-auto flex h-16 px-2 z-40">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={`flex-1 flex flex-col items-center justify-center transition-all relative ${
            activeView === tab.id ? 'text-black scale-105' : 'text-gray-300'
          }`}
        >
          <div className="relative">
            <i className={`fas ${tab.icon} text-lg mb-0.5`}></i>
            {tab.count > 0 && (
              <span className="absolute -top-1 -right-2 bg-black text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white">
                {tab.count > 9 ? '9+' : tab.count}
              </span>
            )}
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
          {activeView === tab.id && (
             <div className="w-1 h-1 bg-black rounded-full mt-1"></div>
          )}
        </button>
      ))}
    </nav>
  );
};

export default Navbar;
