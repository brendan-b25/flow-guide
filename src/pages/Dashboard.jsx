import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BreadcrumbNav from '@/components/BreadcrumbNav';
import { 
  BookOpen, 
  FileText, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Star,
  BarChart3,
  Activity,
  ChevronRight,
  Calendar,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

// Configuration constants
const MOCK_WEEKLY_ACTIVITY = [12, 19, 15, 25, 22, 18, 16];
const MAX_DAILY_ACTIVITY = 25; // For bar chart scaling
const MOCK_AI_INTERACTIONS = 156;
const MOCK_ACTIVE_TIME = '5d 2h';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProcedures: 0,
    totalDocuments: 0,
    recentActivity: [],
    popularItems: [],
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0]
  });

  useEffect(() => {
    // Load stats from localStorage
    const procedures = JSON.parse(localStorage.getItem('manuals') || '[]');
    const documents = JSON.parse(localStorage.getItem('savedDocuments') || '[]');
    const recentPages = JSON.parse(localStorage.getItem('recentPages') || '[]');
    
    setStats({
      totalProcedures: procedures.length,
      totalDocuments: documents.length,
      recentActivity: recentPages.slice(0, 5),
      popularItems: procedures.slice(0, 5),
      weeklyActivity: MOCK_WEEKLY_ACTIVITY
    });
  }, []);

  const quickActions = [
    {
      title: 'Create Procedure',
      description: 'Start a new procedure document',
      icon: BookOpen,
      color: 'from-blue-500 to-blue-600',
      action: () => navigate(createPageUrl('Manuals'))
    },
    {
      title: 'Generate Document',
      description: 'Use AI to create a document',
      icon: FileText,
      color: 'from-green-500 to-green-600',
      action: () => navigate(createPageUrl('DocumentGenerator'))
    },
    {
      title: 'AI Copilot',
      description: 'Get AI assistance',
      icon: Sparkles,
      color: 'from-purple-500 to-purple-600',
      action: () => navigate(createPageUrl('Copilot'))
    },
    {
      title: 'Browse Templates',
      description: 'Explore document templates',
      icon: Star,
      color: 'from-orange-500 to-orange-600',
      action: () => navigate(createPageUrl('Templates'))
    }
  ];

  const statCards = [
    {
      title: 'Total Procedures',
      value: stats.totalProcedures,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Documents Created',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+8%',
      trendUp: true
    },
    {
      title: 'AI Interactions',
      value: MOCK_AI_INTERACTIONS.toString(),
      icon: Sparkles,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: '+24%',
      trendUp: true
    },
    {
      title: 'Active This Week',
      value: MOCK_ACTIVE_TIME,
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: '+15%',
      trendUp: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav currentPage="Dashboard" />
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-slate-600">
            Welcome back! Here's an overview of your documentation activity.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                      <TrendingUp className="w-3 h-3" />
                      {stat.trend}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-800 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-600">
                    {stat.title}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className="group p-6 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all text-left"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">
                    {action.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {action.description}
                  </p>
                  <div className="mt-3 flex items-center text-blue-600 text-sm font-medium">
                    Get Started
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity & Recent Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest documentation work</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((page, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 text-sm">
                            {page}
                          </div>
                          <div className="text-xs text-slate-500">
                            {index === 0 ? 'Just now' : `${index} ${index === 1 ? 'hour' : 'hours'} ago`}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(createPageUrl(page))}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Overview */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Weekly Overview
              </CardTitle>
              <CardDescription>Your activity over the past 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                  <div key={day} className="flex items-center gap-3">
                    <div className="w-12 text-sm text-slate-600 font-medium">
                      {day}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${(stats.weeklyActivity[index] / MAX_DAILY_ACTIVITY) * 100}%` }}
                      />
                    </div>
                    <div className="w-8 text-sm text-slate-600 font-medium text-right">
                      {stats.weeklyActivity[index]}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total this week</span>
                  <span className="font-bold text-slate-800">
                    {stats.weeklyActivity.reduce((a, b) => a + b, 0)} activities
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
