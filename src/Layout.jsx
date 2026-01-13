import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { FileText, BookOpen, Home, Menu, X, ChevronRight } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (pageName) => {
    return currentPageName === pageName;
  };

  const navItems = [
    { name: 'Procedures', icon: BookOpen, page: 'Manuals' },
    { name: 'Templates', icon: FileText, page: 'Templates' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 shadow-lg z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <Link to={createPageUrl('Manuals')} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">FlowGuide</h1>
                <p className="text-xs text-slate-500">Documentation</p>
              </div>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.page) || (item.page === 'Manuals' && (isActive('ManualEditor') || isActive('ManualView')));
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                  {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              © {new Date().getFullYear()} FlowGuide
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-64">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-6 h-6 text-slate-700" />
            </button>

            {/* Logo & Brand (Desktop) */}
            <Link to={createPageUrl('Manuals')} className="hidden lg:flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">FlowGuide</h1>
                <p className="text-xs text-slate-500">Procedure Documentation</p>
              </div>
            </Link>

            {/* Mobile Logo */}
            <div className="flex lg:hidden items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-800">FlowGuide</span>
            </div>

            <div className="w-10 lg:w-auto"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-600">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded flex items-center justify-center">
                <FileText className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium">FlowGuide</span>
              <span className="text-slate-400">•</span>
              <span className="text-sm text-slate-500">Professional Procedure Documentation</span>
            </div>
            <div className="text-sm text-slate-400">
              © {new Date().getFullYear()} FlowGuide. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}