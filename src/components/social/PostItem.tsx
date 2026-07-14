"use client";

import React, { useState, memo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  MessageSquare, Send, Loader2, Pencil, Trash2, Check, RotateCcw,
  Shield, Swords, Activity, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addComment, updatePost, deletePost } from "@/app/(main)/home/actions";
import { PostMedia } from "./PostMedia";
import { CommentItem } from "./CommentItem";

interface Post {
  id: string;
  content: string | null;
  imageUrl: string | null;
  images?: string[] | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    role: string;
    imageUrl: string | null;
  };
  comments: Comment[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    imageUrl: string | null;
  };
}

interface PostItemProps {
  post: Post;
  currentUser: any;
  formatDateTimeAR: (date: string) => string;
  timeAgo: (date: string) => string;
  capitalizeFirstLetter: (text: string) => string;
}

export const PostItem = memo(function PostItem({ 
  post, 
  currentUser, 
  formatDateTimeAR, 
  timeAgo, 
  capitalizeFirstLetter 
}: PostItemProps) {
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentState, setCommentState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState(post.content || "");
  const [isUpdatingPost, setIsUpdatingPost] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const isPostOwner = currentUser?.id === post.user.id;

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommentText(capitalizeFirstLetter(e.target.value));
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || commentState === 'loading') return;

    setCommentState('loading');
    try {
      await addComment(post.id, commentText);
      setCommentState('success');
      toast.success("Comentario enviado");
      setCommentText("");
      router.refresh();
      setTimeout(() => setCommentState('idle'), 2000);
    } catch (err: any) {
      toast.error("Error al enviar comentario");
      setCommentState('idle');
    }
  };

  const handleUpdatePost = async () => {
    if (!editPostContent.trim() || editPostContent === post.content) {
      setIsEditingPost(false);
      return;
    }
    setIsUpdatingPost(true);
    try {
      await updatePost(post.id, editPostContent);
      setIsEditingPost(false);
      router.refresh();
      toast.success("Publicación actualizada");
    } catch (err) {
      toast.error("Error al actualizar");
    } finally {
      setIsUpdatingPost(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("¿Seguro que quieres borrar esta publicación? Se eliminarán también todos los comentarios.")) return;
    setIsDeletingPost(true);
    try {
      await deletePost(post.id);
      router.refresh();
      toast.success("Publicación eliminada");
    } catch (err) {
      toast.error("Error al eliminar");
      setIsDeletingPost(false);
    }
  };

  const userInitials = post.user.name?.charAt(0) || "U";

  // Role Badge Styling Config
  const getRoleConfig = (roleName: string) => {
    switch (roleName) {
      case 'superadmin':
        return { label: 'Admin', color: 'text-red-500 bg-red-500/10 border-red-500/20 ring-red-500/10', icon: Shield };
      case 'club':
        return { label: 'Club', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 ring-emerald-500/10', icon: Swords };
      default:
        return { label: 'Jugador', color: 'text-celeste bg-celeste/10 border-celeste/20 ring-celeste/10', icon: Activity };
    }
  };

  const roleConfig = getRoleConfig(post.user.role);
  const RoleIcon = roleConfig.icon;

  return (
    <div className="bg-carbon-800 border border-white/10 rounded-3xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.01)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.02)] hover:border-white/20 transition-all duration-300 relative overflow-hidden group">
      
      {/* Dynamic light border glow at top */}
      <div className={`absolute top-0 left-0 w-full h-[2px] opacity-25 bg-gradient-to-r ${
        post.user.role === 'superadmin' ? 'from-red-500' : post.user.role === 'club' ? 'from-emerald-500' : 'from-celeste'
      } to-transparent`} />

      {/* Author Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar frame with glow ring */}
          <div className={`w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center overflow-hidden shrink-0 relative ring-2 ring-offset-2 ring-offset-carbon-800 ${
            post.user.role === 'superadmin' ? 'ring-red-500/10' : post.user.role === 'club' ? 'ring-emerald-500/10' : 'ring-celeste/10'
          }`}>
            {post.user.imageUrl ? (
              <Image src={post.user.imageUrl} alt={post.user.name || ""} fill unoptimized className="object-cover" sizes="40px" />
            ) : (
              <span className="text-xs font-black text-slate-400 uppercase italic">{userInitials}</span>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-tight text-white leading-none">
                {post.user.name}
              </span>
              
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${roleConfig.color}`}>
                <RoleIcon className="w-2.5 h-2.5 shrink-0" />
                <span>{roleConfig.label}</span>
              </span>
            </div>
            
            <span className="flex items-center gap-1 text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 leading-none">
              <Clock className="w-2.5 h-2.5" />
              <span>{formatDateTimeAR(post.createdAt)}</span>
            </span>
          </div>
        </div>

        {/* Owner Controls */}
        {isPostOwner && !isEditingPost && (
          <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setIsEditingPost(true);
                setEditPostContent(post.content || "");
              }}
              className="p-1.5 bg-white/5 hover:bg-azul-primary/5 text-slate-400 hover:text-azul-primary rounded-xl border border-white/10 transition-all active:scale-90"
              title="Editar Publicación"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDeletePost}
              disabled={isDeletingPost}
              className="p-1.5 bg-white/5 hover:bg-rose-500/5 text-slate-400 hover:text-rose-500 rounded-xl border border-white/10 transition-all active:scale-90 disabled:opacity-50"
              title="Eliminar Publicación"
            >
              {isDeletingPost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="relative z-10 pl-0 sm:pl-1">
        {isEditingPost ? (
          <div className="flex flex-col gap-4 mb-4 bg-white/5 p-5 rounded-2xl border border-white/10">
            <textarea
              value={editPostContent}
              onChange={(e) => setEditPostContent(capitalizeFirstLetter(e.target.value))}
              className="w-full bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 resize-none min-h-[100px] leading-relaxed"
              autoFocus
            />
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setIsEditingPost(false);
                  setEditPostContent(post.content || "");
                }}
                className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-white/10 rounded-xl transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" /> Cancelar
              </button>
              <button
                onClick={handleUpdatePost}
                disabled={isUpdatingPost || !editPostContent.trim()}
                className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-carbon-950 bg-volt hover:bg-volt-dark disabled:opacity-50 rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
              >
                {isUpdatingPost ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Guardar
              </button>
            </div>
          </div>
        ) : (
          post.content && (
            <p className="text-slate-300 text-sm font-medium leading-relaxed mb-4 whitespace-pre-wrap">
              {post.content}
            </p>
          )
        )}

        {/* Compressed/Direct WebP media container */}
        <PostMedia images={post.images} fallbackUrl={post.imageUrl} />

        {/* Interaction Row */}
        <div className="flex items-center gap-4 mt-3 pt-1">
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 py-1.5 px-3 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] active:scale-95 border ${
              showComments 
                ? "bg-azul-primary/10 text-azul-primary border-azul-primary/20" 
                : "bg-white/5 text-slate-400 hover:text-white border-transparent"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{post.comments?.length || 0} Comentarios</span>
          </button>
        </div>

        {/* Comments Section Drawer */}
        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-white/10 overflow-hidden"
            >
              {post.comments && post.comments.length > 0 ? (
                <div className="flex flex-col gap-3.5 mb-4 max-h-[300px] overflow-y-auto pr-1">
                  {post.comments.map((comment) => (
                    <CommentItem 
                      key={comment.id} 
                      comment={comment} 
                      currentUser={currentUser} 
                      timeAgo={timeAgo} 
                      capitalizeFirstLetter={capitalizeFirstLetter}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-white/[0.03] rounded-2xl border border-dashed border-white/10 mb-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Sin Comentarios</p>
                </div>
              )}

              {/* Comment Input */}
              {currentUser && (
                <form onSubmit={handleComment} className="flex gap-3 items-center mt-2 pt-2 border-t border-white/10">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0 relative">
                    {currentUser.imageUrl ? (
                      <Image src={currentUser.imageUrl} alt="" fill unoptimized className="object-cover" sizes="32px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-400 uppercase italic">
                        {currentUser.name?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={commentText}
                      onChange={handleCommentChange}
                      placeholder="Escribe un comentario en el hilo..."
                      className="w-full bg-white/5 border border-white/10 focus:border-white/20 focus:bg-white/10 rounded-2xl py-2 px-4 pr-12 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim() || commentState === 'loading'}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all flex items-center justify-center active:scale-90
                        ${
                          commentState === 'success'
                            ? 'bg-azul-primary text-white'
                            : 'bg-volt text-carbon-950 hover:bg-volt-dark disabled:opacity-30 disabled:bg-white/10'
                        }`}
                    >
                      {commentState === 'loading' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : commentState === 'success' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
