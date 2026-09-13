import {
  CheckCircleIcon,
  ClockIcon,
  Share2Icon,
  TrendingUpIcon,
  ActivityIcon,
  SendIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api/axios';

interface DashboardPost {
  status: string;
}

interface DashboardAccount {
  status: string;
}

interface ActivityItem {
  _id: string;
  actionType?: string;
  description: string;
  createdAt: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState({
    scheduled: 0,
    published: 0,
    connectedAccounts: 0,
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [postsRes, accountsRes, activityRes] = await Promise.all([
          api.get('/api/posts'),
          api.get('/api/accounts'),
          api.get('/api/activity'),
        ]);

        const posts = (postsRes.data.data ?? []) as DashboardPost[];
        const accounts = (accountsRes.data.data ?? []) as DashboardAccount[];
        const activity = (activityRes.data.data ?? []) as ActivityItem[];
        setStats({
          scheduled: posts.filter((post) => post.status === 'scheduled').length,
          published: posts.filter((post) => post.status === 'published').length,
          connectedAccounts: accounts.filter(
            (account) => account.status === 'connected'
          ).length,
        });
        setActivities(activity);
      } catch (error: unknown) {
        console.error('Error fetching dashboard data: ', error);
      }
    };

    const timer = window.setTimeout(() => {
      void fetchDashboardData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const statCards = [
    {
      label: 'Scheduled Posts',
      value: stats.scheduled,
      icon: ClockIcon,
      trend: '+2 today',
    },
    {
      label: 'Published Posts',
      value: stats.published,
      icon: CheckCircleIcon,
      trend: 'All time',
    },
    {
      label: 'Connected Accounts',
      value: stats.connectedAccounts,
      icon: Share2Icon,
      trend: 'Active',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      {/* Welcome bar */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
          Overview
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          Good Morning!
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Here's what's happening with your social accounts today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-red-200 hover:bg-red-50"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="text-3xl font-semibold tabular-nums text-slate-800">
                {card.value}
              </div>

              <div className="flex items-center gap-1 text-xs text-red-500">
                <TrendingUpIcon className="size-3" />
                {card.trend}
              </div>
            </div>

            <p className="text-sm text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
            <p className="mt-1 text-xs text-slate-400">Your latest publishing events</p>
          </div>
          <span className="text-sm text-slate-400">
            {activities.length} events
          </span>
        </div>

        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100">
              <ActivityIcon className="size-6 text-slate-400" />
            </div>
            <p className="text-slate-500">No activity yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Connect accounts and schedule posts to see events here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {activities.map((activity) => (
              <div
                key={activity._id}
                className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-slate-50/50"
              >
                <div className="size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-zinc-100 text-zinc-600">
                  <SendIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs capitalize text-zinc-600">
                      {activity.actionType?.replaceAll('_', ' ').toLowerCase() || 'Activity'}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(activity.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {activity.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
