import { type FormEvent, useEffect, useState } from 'react';
import { PLATFORMS } from '../assets/assets';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ClockIcon,
  SendIcon,
  XIcon,
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface Post {
  _id: string;
  status: string;
  content: string;
  scheduledFor: string;
  updatedAt: string;
  mediaUrl?: string;
  mediaType?: string;
  platforms: string[];
}

const Scheduler = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPosts = async () => {
    try {
      const allPosts  = await api.get('/api/posts');
      setPosts(allPosts.data.data ?? []);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load posts');
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPosts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const scheduled = posts.filter((p) => p.status === 'scheduled');
  const published = posts.filter((p) => p.status === 'published');

  const togglePlatform = (id: string) =>
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  const handleSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform !');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      toast.error('Select date and time');
      return;
    }
    if (selectedPlatforms.includes('instagram') && !mediaFile) {
      toast.error('Instagram requires an image or video');
      return;
    }

    const scheduledFor = new Date(
      `${scheduledDate}T${scheduledTime}`
    ).toISOString();
    const formData = new FormData();
    formData.append('content', content);
    formData.append('scheduledFor', scheduledFor);
    formData.append('status', 'scheduled');
    formData.append('platform', JSON.stringify(selectedPlatforms));

    if (mediaFile) formData.append('media', mediaFile);

    setLoading(true);
    try {
      await api.post('/api/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Post scheduled!');
      setContent('');
      setScheduledDate('');
      setScheduledTime('');
      setSelectedPlatforms([]);
      setMediaFile(null);
      fetchPosts();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
            Content workflow
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            Schedule your next post
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Compose once, choose your channels, and let SocialAI handle the timing.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1.5">
            {scheduled.length} upcoming
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
            {published.length} published
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
      {/* Conpose panel */}
      <div className="min-w-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Compose Post</h3>
              <p className="mt-1 text-sm text-slate-400">
                Prepare the content and publishing details.
              </p>
            </div>
            <CalendarDaysIcon className="size-5 text-red-500" />
          </div>

          <form className="space-y-5" onSubmit={handleSchedule}>
            {/* Platforms */}
            <div>
              <label className="block text-xs text-slate-500 uppercase mb-2">
                Platforms
              </label>
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map((p) => {
                  const active = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`flex items-center gap-1.5 p-3 rounded-md border transition-all duration-150 ${active ? 'bg-red-50 border-red-300 text-red-500 scale-103' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      <p.icon className="size-4.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs text-slate-500 uppercase mb-2">
                Content
              </label>
              <textarea
                rows={5}
                placeholder="What you want to share today?"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm placeholder-slate-400 outline-none resize-none"
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div
                className={`text-right text-xs mt-1 font-medium ${content.length > 270 ? 'text-red-500' : 'text-slate-400'}`}
              >
                {content.length}/280
              </div>
            </div>

            {/* Media Upload */}
            <div>
              <label className="block text-xs text-slate-500 uppercase mb-2">
                Media (optional)
              </label>
              {mediaFile ? (
                <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 flex items-center justify-center">
                  {mediaFile.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(mediaFile)}
                      alt="preview"
                      className="max-w-full max-h-80 w-auto h-auto object-contain rounded-lg"
                    />
                  ) : (
                    <video
                      src={URL.createObjectURL(mediaFile)}
                      controls
                      className="max-w-full max-h-80 w-auto h-auto object-contain rounded-lg"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => setMediaFile(null)}
                    className="absolute top-2 right-2 size-7 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-5 py-10 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-red-300 hover:bg-red-50/30 transition-all group">
                  <span className="text-sm text-slate-500 group-hover:text-red-600 transition-colors">
                    Click to upload image or video
                  </span>
                  <input
                    type="file"
                    accept="image/*, video/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && setMediaFile(e.target.files[0])
                    }
                  />
                </label>
              )}
            </div>

            {/* Date & time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 uppercase mb-2">
                  Date
                </label>
                <div className="relative">
                  <CalendarIcon className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase mb-2">
                  Time
                </label>
                <div className="relative">
                  <ClockIcon className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="time"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              {...(loading ? { disabled: true } : {})}
              className="w-full flex items-center justify-center gap-2
              py-3.5 bg-red-500 hover:bg-red-600 transition-all text-white rounded-lg"
            >
              {loading ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <span>Schedule Post</span>
                  <ArrowRightIcon className="size-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Queue Panels */}
      <div className="flex min-w-0 flex-col gap-6">
        {/* Upcoming */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
            <CalendarDaysIcon className="size-4 text-zinc-500" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Upcoming</h3>
              <p className="text-xs text-slate-400">Posts waiting to be published</p>
            </div>
            <span className="ml-auto text-xs font-bold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full">
              {scheduled.length}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
            {scheduled.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                No posts scheduled yet
              </div>
            ) : (
              scheduled.map((post) => (
                <div
                  key={post._id}
                  className="px-5 py-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-1.5 items-center">
                      {post.platforms.map((pl: string) => {
                        const meta = PLATFORMS.find((p) => p.id === pl);
                        return meta ? (
                          <meta.icon
                            key={pl}
                            className="size-3.5 text-slate-400"
                          />
                        ) : null;
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      {post.mediaType && (
                        <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-md font-semibold capitalize">
                          {post.mediaType}
                        </span>
                      )}

                      <span className="text-xs text-slate-400">
                        {new Date(post.scheduledFor).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 max-w-md">
                    {post.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Published */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
            <SendIcon className="size-4 text-zinc-500" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Published</h3>
              <p className="text-xs text-slate-400">Posts successfully sent to your channels</p>
            </div>
            <span className="ml-auto text-xs font-bold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full">
              {published.length}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
            {published.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                No published posts yet
              </div>
            ) : (
              published.map((post) => (
                <div
                  key={post._id}
                  className="px-5 py-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-1.5 items-center">
                      {post.platforms.map((pl: string) => {
                        const meta = PLATFORMS.find((p) => p.id === pl);
                        return meta ? (
                          <meta.icon
                            key={pl}
                            className="size-3.5 text-slate-400"
                          />
                        ) : null;
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      {post.mediaType && (
                        <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-md font-semibold capitalize">
                          {post.mediaType}
                        </span>
                      )}

                      <span className="text-xs text-slate-400">
                        {new Date(post.updatedAt).toLocaleString()}
                      </span>
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                        Published
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 max-w-4/5">
                    {post.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Scheduler;
