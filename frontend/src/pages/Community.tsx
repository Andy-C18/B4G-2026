import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ThumbsUp, ThumbsDown, Plus, Tag, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { ForumPost } from '../types';

const TAGS = ['General', 'Mental Health', 'Nutrition', 'Exercise', 'Medications', 'Chronic Conditions', 'Prevention', 'Parenting'];

export default function Community() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [activeTag, setActiveTag] = useState('');

  // Create form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  async function loadPosts() {
    let query = supabase
      .from('forum_posts')
      .select('*, author:author_id(full_name,avatar_url,role)')
      .order('created_at', { ascending: false });

    if (searchQ) query = query.ilike('title', `%${searchQ}%`);
    if (activeTag) query = query.contains('tags', [activeTag]);

    const { data } = await query;
    setPosts((data as ForumPost[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadPosts(); }, [searchQ, activeTag]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !title.trim() || !content.trim()) return;
    setCreating(true);
    const { error } = await supabase.from('forum_posts').insert({
      author_id: profile.id,
      title: title.trim(),
      content: content.trim(),
      tags: selectedTags,
    });
    if (!error) {
      setTitle(''); setContent(''); setSelectedTags([]);
      setShowCreate(false);
      await loadPosts();
    }
    setCreating(false);
  };

  const handleVote = async (post: ForumPost, type: 'up' | 'down') => {
    const field = type === 'up' ? 'upvotes' : 'downvotes';
    await supabase.from('forum_posts').update({ [field]: post[field] + 1 }).eq('id', post.id);
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, [field]: p[field] + 1 } : p));
  };

  const toggleTag = (t: string) => {
    setSelectedTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community</h1>
          <p className="text-gray-500 text-sm mt-1">A healthcare-focused space to share experiences & get peer support</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Create post */}
      {showCreate && (
        <div className="card border-2 border-primary-200">
          <h2 className="text-lg font-semibold mb-4">Create a Post</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input type="text" className="input" placeholder="Share what's on your mind…" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="label">Content</label>
              <textarea className="input h-32 resize-none" placeholder="Describe your experience, question, or advice…" value={content} onChange={(e) => setContent(e.target.value)} required />
            </div>
            <div>
              <label className="label">Tags</label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      selectedTags.includes(t) ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search posts…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTag('')}
            className={`text-xs px-3 py-1.5 rounded-full border flex-shrink-0 transition-colors ${!activeTag ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            All
          </button>
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(activeTag === t ? '' : t)}
              className={`text-xs px-3 py-1.5 rounded-full border flex-shrink-0 transition-colors ${activeTag === t ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="card text-center text-gray-400 py-10">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-12">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No posts yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const author = post.author as Record<string, string> | undefined;
            return (
              <div key={post.id} className="card hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  {/* Votes */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleVote(post, 'up')} className="text-gray-400 hover:text-green-500 transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700">{post.upvotes - post.downvotes}</span>
                    <button onClick={() => handleVote(post, 'down')} className="text-gray-400 hover:text-red-400 transition-colors">
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link to={`/community/post/${post.id}`} className="group">
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-1">{post.title}</h3>
                    </Link>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.content}</p>

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {post.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Tag className="w-3 h-3" />{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
                          {author?.full_name?.[0] || 'U'}
                        </div>
                        <span>{author?.full_name || 'Unknown'}</span>
                        {author?.role === 'doctor' && (
                          <span className="bg-blue-50 text-blue-600 px-1.5 rounded">Doctor</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <Link to={`/community/post/${post.id}`} className="hover:text-primary-500">
                          {post.comment_count ?? 0} comments
                        </Link>
                        <span className="ml-2">{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
