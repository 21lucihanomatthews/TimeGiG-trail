import React, { useState } from 'react';
import { MapPin, Heart, Share2, Briefcase, Eye, Users, Edit2, Trash2, X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getInitials, getAvatarColorClass } from '../lib/avatar';

interface GigCardProps {
  gig: any;
  user: any;
  onEdit: (gig: any) => void;
  onDelete: (id: string) => void;
  onViewImage: (images: string[]) => void;
  onApply?: (gig: any) => void;
  onViewProfile?: (profile: any) => void;
  key?: React.Key;
}

export function GigCard({ gig, user, onEdit, onDelete, onViewImage, onApply, onViewProfile }: GigCardProps) {
  const isOwner = user?.id === gig.user_id;
  console.log('GigCard debug:', { isOwner, userId: user?.id, gigUserId: gig.user_id });

  const isCompact = localStorage.getItem('compact_layout') === 'true';
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const gigProfile = gig.profiles || (user?.id === gig.user_id ? {
    id: user?.id,
    name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Me',
    avatar_url: user?.user_metadata?.avatar_url || ''
  } : {
    id: gig.user_id,
    name: 'Anonymous User',
    avatar_url: ''
  });

  // Construct sharing details
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    // Append tab and gig ID to make a clean deep link
    return `${window.location.origin}${window.location.pathname}?tab=gigs&id=${gig.id}`;
  };

  const shareUrl = getShareUrl();
  const shareText = `Check out this job on TimeGiG: "${gig.title}" in ${gig.location}. Offering R ${Number(gig.price || 0).toLocaleString()}!`;

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
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 cursor-pointer" onClick={() => onViewImage(gig.images || [])}>
            {gig.images && gig.images.length > 0 ? (
              <img src={gig.images[0]} alt={gig.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <Briefcase className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700">
                {gig.category || 'General'}
              </span>
              <span className="text-[11px] font-black text-gray-900">R {Number(gig.price || 0).toLocaleString()}</span>
            </div>
            <h3 className="font-bold text-gray-900 truncate">{gig.title}</h3>
            <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-0.5">
              <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {gig.location}</span>
              <span className="truncate max-w-[120px] font-medium text-gray-400">by {gigProfile?.name || 'Anonymous'}</span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowShareMenu(true); }} 
            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors"
            title="Share Gig"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          {isOwner ? (
            <>
              <button onClick={() => onEdit(gig)} className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors" title="Edit">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(gig.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => onApply?.(gig)}
              className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-[11px] transition-colors"
            >
              Apply
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
                  <Share2 className="w-4 h-4 text-indigo-600" /> Share GiG
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
      <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 relative cursor-pointer" onClick={() => onViewImage(gig.images || [])}>
        {gig.images && gig.images.length > 0 ? (
          <img src={gig.images[0]} alt={gig.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Briefcase className="w-12 h-12" />
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
            {gig.category || 'General'}
          </span>
          <span className="text-base font-bold text-gray-900">R {Number(gig.price || 0).toLocaleString()}</span>
        </div>
        
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">{gig.title}</h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">{gig.description}</p>
        
        {/* Creator Info */}
        <div 
          className="flex items-center space-x-2 mb-3 p-2 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => onViewProfile?.(gigProfile)}
        >
          {gigProfile?.avatar_url ? (
            <img 
              src={gigProfile.avatar_url} 
              alt={gigProfile.name} 
              className="w-8 h-8 rounded-full object-cover border border-white shadow-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-white shadow-sm ${getAvatarColorClass(gigProfile?.name)}`}>
              {getInitials(gigProfile?.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-900 truncate">
              {gigProfile?.name || 'Anonymous User'}
            </p>
            <p className="text-[9px] text-gray-400 truncate">
              {gigProfile?.status === 'Verified' ? 'Verified Professional' : 'Active Member'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-3 gap-2">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{gig.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {gig.views || 0}</div>
            <div className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {gig.applicants?.length || 0}</div>
          </div>
        </div>

        <div className="flex gap-2">
          {isOwner ? (
            <>
              <button onClick={() => onEdit(gig)} className="flex-1 py-1.5 px-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => { console.log('Delete button clicked for:', gig.id); onDelete(gig.id); }} className="flex-1 py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </>
          ) : (
            <button 
              onClick={() => onApply?.(gig)}
              className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs transition-colors"
            >
              Apply
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
