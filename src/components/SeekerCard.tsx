import React, { useState } from 'react';
import { MapPin, Heart, Share2, Briefcase, Eye, Users, Edit2, Trash2, Calendar, Phone, X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getInitials, getAvatarColorClass } from '../lib/avatar';

interface SeekerCardProps {
  seeker: any;
  user: any;
  onEdit: (seeker: any) => void;
  onDelete: (id: string) => void;
  onViewImage: (images: string[]) => void;
  onHire?: (seeker: any) => void;
  onViewProfile?: (profile: any) => void;
  key?: React.Key;
}

export function SeekerCard({ seeker, user, onEdit, onDelete, onViewImage, onHire, onViewProfile }: SeekerCardProps) {
  const isOwner = user?.id === seeker.user_id;
  console.log('SeekerCard debug:', { isOwner, userId: user?.id, seekerUserId: seeker.user_id });

  const isCompact = localStorage.getItem('compact_layout') === 'true';
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const seekerProfile = seeker.profiles || (user?.id === seeker.user_id ? {
    id: user?.id,
    name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Me',
    avatar_url: user?.user_metadata?.avatar_url || ''
  } : {
    id: seeker.user_id,
    name: 'Anonymous User',
    avatar_url: ''
  });

  // Construct sharing details
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    // Append tab and seeker ID to make a clean deep link
    return `${window.location.origin}${window.location.pathname}?tab=seekers&id=${seeker.id}`;
  };

  const shareUrl = getShareUrl();
  const shareText = `Check out this service seeker on TimeGiG: "${seeker.title}" in ${seeker.location}. Offering R ${Number(seeker.price || 0).toLocaleString()}/day!`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (isCompact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-xs border border-gray-100 p-2.5 hover:shadow-sm transition-shadow duration-300 flex items-center justify-between text-gray-900 gap-3 text-xs w-full relative overflow-hidden"
      >
        {/* Left info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 cursor-pointer" onClick={() => onViewImage(seeker.images || [])}>
            {seeker.images && seeker.images.length > 0 ? (
              <img src={seeker.images[0]} alt={seeker.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <Users className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700">
                {seeker.category || 'General'}
              </span>
              <span className="text-[11px] font-black text-green-600">R {Number(seeker.price || 0).toLocaleString()} <span className="text-[8px] text-gray-400 font-normal">/ day</span></span>
            </div>
            <h3 className="font-bold text-gray-900 truncate">{seeker.title}</h3>
            <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-0.5">
              <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {seeker.location}</span>
              <span className="truncate max-w-[120px] font-medium text-gray-400">by {seekerProfile?.name || 'Anonymous'}</span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowShareMenu(true); }} 
            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors"
            title="Share Seeker Profile"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          {isOwner ? (
            <>
              <button onClick={() => onEdit(seeker)} className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors" title="Edit">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(seeker.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => onHire && onHire(seeker)}
              className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1"
            >
              <Phone className="w-3 h-3" /> Hire
            </button>
          )}
        </div>

        {/* Compact Share Overlay */}
        <AnimatePresence>
          {showShareMenu && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 bg-white/98 z-10 px-3 py-1 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-hide flex-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mr-1">Share:</span>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()} 
                  className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-[10px] rounded-md transition-colors"
                >
                  WA
                </a>
                <a 
                  href={facebookUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()} 
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-md transition-colors"
                >
                  FB
                </a>
                <a 
                  href={twitterUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()} 
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-[10px] rounded-md transition-colors"
                >
                  X
                </a>
                <a 
                  href={linkedinUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()} 
                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-md transition-colors"
                >
                  LN
                </a>
                <button 
                  onClick={handleCopyLink} 
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] rounded-md transition-colors flex items-center gap-1"
                >
                  {copied ? <Check className="w-2.5 h-2.5 text-green-600" /> : <Copy className="w-2.5 h-2.5" />}
                  {copied ? 'Copied' : 'Link'}
                </button>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowShareMenu(false); }}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col h-full relative"
    >
      {/* Share Overlay for Standard Card */}
      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute inset-0 bg-white/98 z-20 p-4 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-indigo-600" /> Share Seeker Profile
                </h4>
                <button 
                  onClick={() => setShowShareMenu(false)}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-xs text-gray-500 mb-4 line-clamp-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-medium">
                "{shareText}"
              </p>

              <div className="grid grid-cols-2 gap-2">
                <a 
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  WhatsApp
                </a>
                <a 
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Facebook
                </a>
                <a 
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-semibold transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-black" />
                  Twitter / X
                </a>
                <a 
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  LinkedIn
                </a>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600 animate-bounce" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-gray-500" />
                    Copy Share Link
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image */}
      <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 relative cursor-pointer" onClick={() => onViewImage(seeker.images || [])}>
        {seeker.images && seeker.images.length > 0 ? (
          <img src={seeker.images[0]} alt={seeker.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Users className="w-12 h-12" />
          </div>
        )}

        {/* Absolute Share Button Trigger */}
        <button 
          onClick={(e) => { e.stopPropagation(); setShowShareMenu(true); }}
          className="absolute top-2.5 right-2.5 p-2 bg-white/90 backdrop-blur-xs hover:bg-white text-gray-700 hover:text-indigo-600 rounded-full shadow-sm hover:scale-105 transition-all duration-200 z-10"
          title="Share Post"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
            {seeker.category || 'General'}
          </span>
          <span className="text-base font-bold text-green-600">
            R {Number(seeker.price || 0).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">/ day</span>
          </span>
        </div>
        
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">{seeker.title}</h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">{seeker.description}</p>
        
        {/* Creator Info */}
        <div 
          className="flex items-center space-x-2 mb-3 p-2 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => onViewProfile?.(seekerProfile)}
        >
          {seekerProfile?.avatar_url ? (
            <img 
              src={seekerProfile.avatar_url} 
              alt={seekerProfile.name} 
              className="w-8 h-8 rounded-full object-cover border border-white shadow-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-white shadow-sm ${getAvatarColorClass(seekerProfile?.name)}`}>
              {getInitials(seekerProfile?.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-900 truncate">
              {seekerProfile?.name || 'Anonymous User'}
            </p>
            <p className="text-[9px] text-gray-400 truncate">
              {seekerProfile?.status === 'Verified' ? 'Verified Professional' : 'Active Member'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-3 gap-2">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{seeker.location}{seeker.province ? `, ${seeker.province}` : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-indigo-600" />
            <span>{seeker.is_immediate ? 'Available Now' : seeker.scheduled_date ? `From ${new Date(seeker.scheduled_date).toLocaleDateString()}` : 'Immediate'}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-auto">
          {isOwner ? (
            <>
              <button onClick={() => onEdit(seeker)} className="flex-1 py-1.5 px-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => { console.log('Delete button clicked for:', seeker.id); onDelete(seeker.id); }} className="flex-1 py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </>
          ) : (
            <button 
              onClick={() => onHire && onHire(seeker)}
              className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" /> Hire Seeker
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
