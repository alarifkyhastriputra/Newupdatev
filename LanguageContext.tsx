import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'id' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  id: {
    'home': 'Beranda',
    'reels': 'Reels',
    'create': 'Buat',
    'leaderboard': 'Papan Peringkat',
    'profile': 'Profil',
    'admin': 'Admin',
    'search': 'Cari...',
    'logout': 'Keluar',
    'settings': 'Pengaturan',
    'language': 'Bahasa',
    'indonesian': 'Indonesia',
    'english': 'Inggris',
    'followers': 'Pengikut',
    'following': 'Mengikuti',
    'posts': 'Postingan',
    'nothing_here': 'Belum ada apa-apa di sini...',
    'moderate': 'Moderasi',
    'delete': 'Hapus',
    'edit_profile': 'Edit Profil',
    'save': 'Simpan',
    'cancel': 'Batal',
    'name': 'Nama',
    'bio': 'Bio',
    'banish': 'Blokir',
    'restore': 'Pulihkan',
    'comments': 'Komentar',
    'add_comment': 'Tambahkan komentar...',
    'post': 'Posting',
    'add_music': 'Tambah Musik',
    'done': 'Selesai',
    'skip': 'Lewati',
    'create_post': 'Buat Postingan',
    'what_on_mind': 'Apa yang Anda pikirkan?',
    'upload_photo': 'Unggah Foto',
    'upload_video': 'Unggah Video',
    'banned_msg': 'Akun Anda telah diblokir',
    'sign_in_google': 'Masuk dengan Google',
    'like': 'Suka',
    'dislike': 'Tidak Suka',
    'share': 'Bagikan',
    'copied': 'Tautan disalin ke papan klip!',
    'moderate_confirm': 'Moderasi postingan ini?',
    'delete_confirm': 'Hapus postingan ini?',
    'add_story': 'Tambah Cerita',
    'view_story': 'Lihat Cerita',
    'story_text_placeholder': 'Apa yang sedang terjadi?',
    'incoming_call': 'Panggilan Masuk...',
    'calling': 'Memanggil...',
    'ringing': 'Berdering...',
    'connected': 'Terhubung',
    'call_ended': 'Panggilan Berakhir',
    'end_call': 'Akhiri',
    'accept': 'Terima',
    'decline': 'Tolak',
    'audio_call': 'Suara',
    'video_call': 'Video',
    'collective_call': 'Grup',
    'start_voice_call': 'Panggilan Suara',
    'start_video_call': 'Panggilan Video',
    'join_call': 'Gabung Panggilan',
    'active_call_desc': 'Ada panggilan aktif di grup ini.',
  },
  en: {
    'home': 'Home',
    'reels': 'Reels',
    'create': 'Create',
    'leaderboard': 'Leaderboard',
    'profile': 'Profile',
    'admin': 'Admin',
    'search': 'Search...',
    'logout': 'Logout',
    'settings': 'Settings',
    'language': 'Language',
    'indonesian': 'Indonesian',
    'english': 'English',
    'followers': 'Followers',
    'following': 'Following',
    'posts': 'Posts',
    'nothing_here': 'Nothing here but shadows...',
    'moderate': 'Moderate',
    'delete': 'Delete',
    'edit_profile': 'Edit Profile',
    'save': 'Save',
    'cancel': 'Cancel',
    'name': 'Name',
    'bio': 'Bio',
    'banish': 'Banish',
    'restore': 'Restore',
    'comments': 'Comments',
    'add_comment': 'Add a comment...',
    'post': 'Post',
    'add_music': 'Add Music',
    'done': 'Done',
    'skip': 'Skip',
    'create_post': 'Create Post',
    'what_on_mind': 'What\'s on your mind?',
    'upload_photo': 'Upload Photo',
    'upload_video': 'Upload Video',
    'banned_msg': 'Your soul has been exiled from Vimos.',
    'sign_in_google': 'Sign In with Google',
    'like': 'Like',
    'dislike': 'Dislike',
    'share': 'Share',
    'copied': 'Link copied to clipboard!',
    'moderate_confirm': 'Moderate this memory?',
    'delete_confirm': 'Are you sure you want to delete this post?',
    'add_story': 'Add Story',
    'view_story': 'View Story',
    'story_text_placeholder': 'What\'s happening?',
    'incoming_call': 'Incoming Call...',
    'calling': 'Calling...',
    'ringing': 'Ringing...',
    'connected': 'Connected',
    'call_ended': 'Call Ended',
    'end_call': 'End',
    'accept': 'Accept',
    'decline': 'Decline',
    'audio_call': 'Voice',
    'video_call': 'Video',
    'collective_call': 'Group',
    'start_voice_call': 'Voice Call',
    'start_video_call': 'Video Call',
    'join_call': 'Join Call',
    'active_call_desc': 'There is an active call in this collective.',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('vimos_language');
    return (saved === 'en' || saved === 'id') ? saved : 'id';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('vimos_language', lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
