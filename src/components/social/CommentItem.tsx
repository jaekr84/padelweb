"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { updateComment, deleteComment } from "@/app/(main)/home/actions";

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string | null;
      imageUrl: string | null;
    };
  };
  currentUser: any;
  timeAgo: (date: string) => string;
  capitalizeFirstLetter: (text: string) => string;
}

export function CommentItem({ comment, currentUser, timeAgo, capitalizeFirstLetter }: CommentItemProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = currentUser?.id === comment.user.id;

  const handleUpdate = async () => {
    if (!editText.trim() || editText === comment.content) {
      setIsEditing(false);
      return;
    }
    setIsUpdating(true);
    try {
      await updateComment(comment.id, editText);
      setIsEditing(false);
      router.refresh();
      toast.success("Comentario actualizado");
    } catch (err) {
      toast.error("Error al actualizar");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Seguro que quieres eliminar este comentario?")) return;
    setIsDeleting(true);
    try {
      await deleteComment(comment.id);
      router.refresh();
      toast.success("Comentario eliminado");
    } catch (err) {
      toast.error("Error al eliminar");
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex gap-2 group/comment">
      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 overflow-hidden shrink-0 relative mt-0.5">
        {comment.user.imageUrl ? (
          <Image src={comment.user.imageUrl} alt="" fill unoptimized className="object-cover" sizes="36px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-slate-400 uppercase italic">
            {comment.user.name?.charAt(0) || "U"}
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="bg-slate-50/50 rounded-xl py-2 px-3.5 border border-slate-100 relative group-hover/comment:border-slate-200 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black uppercase italic tracking-tighter text-slate-900 leading-tight">
              {comment.user.name}
            </span>
            {isOwner && (
              <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditText(comment.content);
                  }}
                  className="p-1 hover:text-azul-primary transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-1 hover:text-red-600 transition-colors"
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                value={editText}
                onChange={(e) => setEditText(capitalizeFirstLetter(e.target.value))}
                className="w-full bg-transparent border-none outline-none text-sm text-slate-900"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditing(false)} className="text-[10px] font-bold text-slate-500 uppercase">
                  Cancelar
                </button>
                <button onClick={handleUpdate} disabled={isUpdating} className="text-[10px] font-bold text-azul-primary uppercase">
                  {isUpdating ? "..." : "Guardar"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-700 leading-relaxed font-medium">{comment.content}</p>
          )}
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">
          {timeAgo(comment.createdAt)}
        </span>
      </div>
    </div>
  );
}
