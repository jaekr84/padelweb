"use client";

import React, { useState, memo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  MessageSquare, Send, Loader2, Pencil, Trash2, Check, RotateCcw
} from "lucide-react";
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

  return (
    <div className="group pb-12 mb-10 border-b border-slate-300 transition-all">
      {/* Author */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center overflow-hidden shrink-0 relative">
            {post.user.imageUrl ? (
              <Image src={post.user.imageUrl} alt={post.user.name || ""} fill unoptimized className="object-cover" sizes="48px" />
            ) : (
              <span className="text-sm font-black text-slate-400 uppercase italic">{userInitials}</span>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-black uppercase italic tracking-tighter text-slate-900 leading-none">{post.user.name}</span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 font-black uppercase tracking-widest border border-slate-100">
                {post.user.role === 'jugador' ? 'Jugador' : post.user.role === 'club' ? 'Club' : post.user.role === 'superadmin' ? 'Administrador' : 'Usuario'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{formatDateTimeAR(post.createdAt)}</span>
          </div>
        </div>

        {isPostOwner && !isEditingPost && (
          <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setIsEditingPost(true);
                setEditPostContent(post.content || "");
              }}
              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeletePost}
              disabled={isDeletingPost}
              className="p-2 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-full transition-colors disabled:opacity-50"
            >
              {isDeletingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {isEditingPost ? (
          <div className="flex flex-col gap-4 mb-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <textarea
              value={editPostContent}
              onChange={(e) => setEditPostContent(capitalizeFirstLetter(e.target.value))}
              className="w-full bg-transparent border-none outline-none text-lg text-slate-900 placeholder-slate-400 resize-none min-h-[120px]"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditingPost(false);
                  setEditPostContent(post.content || "");
                }}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Cancelar
              </button>
              <button
                onClick={handleUpdatePost}
                disabled={isUpdatingPost || !editPostContent.trim()}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
              >
                {isUpdatingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
        ) : (
          post.content && (
            <p className="text-slate-800 text-lg font-medium leading-relaxed mb-6 whitespace-pre-wrap">
              {post.content}
            </p>
          )
        )}

        <PostMedia images={post.images} fallbackUrl={post.imageUrl} />

        {/* Interaction Row */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors py-2 px-3 -ml-3 rounded-xl hover:bg-slate-50 font-black uppercase tracking-widest text-[10px]"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{post.comments?.length || 0} Comentarios</span>
          </button>
        </div>

        {/* Comments Section */}
        <div className="mt-4 pt-6 border-t border-slate-50 flex flex-col gap-5">
          {post.comments && post.comments.length > 0 && (
            <div className="flex flex-col gap-4">
              {(showComments ? post.comments : post.comments.slice(-3)).map((comment) => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment} 
                  currentUser={currentUser} 
                  timeAgo={timeAgo} 
                  capitalizeFirstLetter={capitalizeFirstLetter}
                />
              ))}

              {!showComments && post.comments.length > 3 && (
                <button
                  onClick={() => setShowComments(true)}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-azul-primary transition-colors pl-12 text-left"
                >
                  Ver los {post.comments.length - 3} comentarios restantes...
                </button>
              )}
            </div>
          )}

          {/* Comment Input */}
          {currentUser && (
            <form onSubmit={handleComment} className="flex gap-3 items-center mt-2">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 overflow-hidden shrink-0 relative">
                {currentUser.imageUrl ? (
                  <Image src={currentUser.imageUrl} alt="" fill unoptimized className="object-cover" sizes="40px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-400 uppercase italic">
                    {currentUser.name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={commentText}
                  onChange={handleCommentChange}
                  placeholder="Escribe un comentario..."
                  className="w-full bg-slate-50 border border-slate-100 focus:border-slate-300 focus:bg-white rounded-2xl py-3 px-5 pr-12 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all font-medium"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || commentState === 'loading'}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all flex items-center justify-center
                                        ${
                                          commentState === 'success'
                                            ? 'bg-azul-primary text-white'
                                            : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:bg-slate-200'
                                        }`}
                >
                  {commentState === 'loading' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : commentState === 'success' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
});
