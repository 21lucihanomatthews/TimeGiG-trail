import React from 'react';
import { MapPin, Heart, Share2, Briefcase, Eye, Users, Edit2, Trash2, Calendar, Phone } from 'lucide-react';
import { motion } from 'motion/react';
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

  const seekerProfile = seeker.profiles || (user?.id === seeker.user_id ? {
    id: user?.id,
    name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Me',
    avatar_url: user?.user_metadata?.avatar_url || ''
  } : {
    id: seeker.user_id,
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
      <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 relative cursor-pointer" onClick={() => onViewImage(seeker.images || [])}>
        {seeker.images && seeker.images.length > 0 ? (
          <img src={seeker.images[0]} alt={seeker.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Users className="w-12 h-12" />
          </div>
        )}
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
