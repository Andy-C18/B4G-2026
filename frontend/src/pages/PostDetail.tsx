import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, ThumbsUp, Send, ArrowLeft, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { ForumPost, ForumComment } from '../types';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    if (!id) return;
    const { data: postData } = await supabase
      .from('forum_posts')
      .select('*, author:author_id(full_name,role,avatar_url)')
      .eq('id', id)
      .single();
    if (postData) setPost(postData as ForumPost);

    const { data: commentsData } = await supabase
      .from('forum_comments')
      .select('*, author:author_id(full_name,role,avatar_url)')
      .eq('post_id', id)
      .order('created_at', { ascending: true });
    setComments((commentsData as ForumComment[]) || []);
    setLoading(false);
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newComment.trim() || !id) return;
    setSubmitting(true);
    const { error } = await supabase.from('forum_comments').insert({
      post_id: id,
      author_id: profile.id,
      content: newComment.trim(),
    });
    if (!error) {
      setNewComment('');
      await load();
    }
    setSubmitting(false);
  };

  const handleVoteComment = async (comment: ForumComment) => {
    await supabase.from('forum_comments').update({ upvotes: comment.upvotes + 1 }).eq('id', comment.id);
    setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, upvotes: c.upvotes + 1 } : c));
  };

  if (loading) return <div className="card text-center py-12 text-gray-400">Loading…</div>;
  if (!post) return <div className="card text-center py-12 text-gray-500">Post not found.</div>;

  const author = post.author as Record<string, string> | undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="btn-secondary text-sm flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Community
      </button>

      {/* Post */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
            {author?.full_name?.[0] || 'U'}
          </div>
          <div>
            <p className="font-medium text-gray-800 text-sm">{author?.full_name || 'Unknown'}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {author?.role === 'doctor' && (
                <span className="bg-blue-50 text-blue-600 px-1.5 rounded">Doctor</span>
              )}
              <span>{new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h1>
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">{post.content}</p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Tag className="w-3 h-3" />{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-600" />
          {comments.length} Comment{comments.length !== 1 ? 's' : ''}
        </h2>

        {/* Add comment */}
        <form onSubmit={handleComment} className="card mb-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
              {profile?.full_name?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <textarea
                className="input h-20 resize-none mb-2"
                placeholder="Share your thoughts or support…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit" disabled={submitting || !newComment.trim()} className="btn-primary flex items-center gap-2 text-sm">
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Posting…' : 'Post Comment'}
              </button>
            </div>
          </div>
        </form>

        {/* Comment list */}
        <div className="space-y-3">
          {comments.map((comment) => {
            const cAuthor = comment.author as Record<string, string> | undefined;
            return (
              <div key={comment.id} className="card flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-sm flex-shrink-0">
                  {cAuthor?.full_name?.[0] || 'U'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-800">{cAuthor?.full_name || 'Unknown'}</span>
                      {cAuthor?.role === 'doctor' && (
                        <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs">Doctor</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                  <button
                    onClick={() => handleVoteComment(comment)}
                    className="flex items-center gap-1 mt-2 text-xs text-gray-400 hover:text-green-500 transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {comment.upvotes} helpful
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
