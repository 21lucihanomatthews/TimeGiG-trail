import React from 'react';
import { MapPin, Heart, Share2, Briefcase, Eye, Users, Edit2, Trash2, Calendar, Phone } from 'lucide-react';
import { motion } from 'motion/react';

interface SeekerCardProps {
  seeker: any;
  user: any;
  onEdit: (seeker: any) => void;
  onDelete: (id: string) => void;
  onViewImage: (images: string[]) => void;
  onHire?: (seeker: any) => void;
  key?: React.Key;
}

export function SeekerCard({ seeker, user, onEdit, onDelete, onViewImage, onHire }: SeekerCardProps) {
  const isOwner = user?.id === seeker.user_id;
  console.log('SeekerCard debug:', { isOwner, userId: user?.id, seekerUserId: seeker.user_id });

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
        
        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-3 gap-2">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{seeker.location}{seeker.province ? `, ${seeker.province}` : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-indigo-500" />
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
