import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { authFetch } from '../utils/authFetch';

const API = 'http://localhost:8000/api';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await authFetch(`${API}/analytics`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="fade-in">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, marginBottom: '1.5rem' }}>📊 Analytics</h1>
        <div className="empty-state"><div className="spinner" /></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="fade-in">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, marginBottom: '1.5rem' }}>📊 Analytics</h1>
        <div className="empty-state">
          <span className="empty-state-icon">📭</span>
          <p>No data yet. Start recording to see analytics!</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>📊 Analytics</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Insights from your recording sessions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-card-icon">🎙️</span>
          <span className="stat-card-value">{stats.total_sessions || 0}</span>
          <span className="stat-card-label">Total Recordings</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon">⏱️</span>
          <span className="stat-card-value">{stats.total_minutes || 0}</span>
          <span className="stat-card-label">Minutes Transcribed</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon">📝</span>
          <span className="stat-card-value">{stats.total_chunks || 0}</span>
          <span className="stat-card-label">Total Chunks</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon">📏</span>
          <span className="stat-card-value">{stats.avg_duration || '0'}s</span>
          <span className="stat-card-label">Avg Duration</span>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Recordings per Day */}
        <div className="chart-card">
          <h3>📅 Recordings per Day</h3>
          {stats.recordings_per_day && stats.recordings_per_day.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.recordings_per_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.85rem' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No data yet</p></div>
          )}
        </div>

        {/* Session Duration Over Time */}
        <div className="chart-card">
          <h3>📈 Session Duration Over Time</h3>
          {stats.duration_over_time && stats.duration_over_time.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.duration_over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.85rem' }}
                />
                <Line type="monotone" dataKey="duration" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No data yet</p></div>
          )}
        </div>

        {/* Tags Breakdown — Pie Chart */}
        <div className="chart-card">
          <h3>🏷️ Sessions by Tag</h3>
          {stats.tags_breakdown && stats.tags_breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.tags_breakdown}
                  dataKey="count"
                  nameKey="tag"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ tag, count }) => `${tag} (${count})`}
                  labelLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
                >
                  {stats.tags_breakdown.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.85rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No tags yet — add tags to your recordings</p></div>
          )}
        </div>

        {/* Top Words */}
        <div className="chart-card">
          <h3>💬 Most Common Words</h3>
          {stats.top_words && stats.top_words.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.top_words} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis dataKey="word" type="category" width={80} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.85rem' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.top_words.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No word data yet</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
