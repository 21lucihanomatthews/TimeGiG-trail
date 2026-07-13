import React from 'react';
import { MapPin, Heart, Share2, Briefcase, Eye, Users, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
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

  const gigProfile = gig.profiles || (user?.id === gig.user_id ? {
    id: user?.id,
    name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Me',
    avatar_url: user?.user_metadata?.avatar_url || ''
  } : {
    id: gig.user_id,
    name: 'Anonymous User',
    avatar_url: ''
  });

  if (isCompact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-xs border border-gray-100 p-2.5 hover:shadow-sm transition-shadow duration-300 flex items-center justify-between text-gray-900 gap-3 text-xs w-full"
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
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col h-full"
    >
      {/* Image */}
      <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 relative cursor-pointer" onClick={() => onViewImage(gig.images || [])}>
        {gig.images && gig.images.length > 0 ? (
          <img src={gig.images[0]} alt={gig.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Briefcase className="w-12 h-12" />
          </div>
        )}
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
