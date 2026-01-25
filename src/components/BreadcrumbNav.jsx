import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

const PAGE_TITLES = {
  'Dashboard': 'Dashboard',
  'Manuals': 'Procedures',
  'Templates': 'Templates',
  'DocumentGenerator': 'Documents',
  'CheatSheetGenerator': 'Cheat Sheets',
  'SavedDocuments': 'Saved Documents',
  'Copilot': 'AI Copilot',
  'ManualEditor': 'Edit Procedure',
  'ManualView': 'View Procedure',
  'DocumentTemplates': 'Document Templates',
};

export default function BreadcrumbNav({ currentPage, additionalCrumbs = [] }) {
  const location = useLocation();

  const crumbs = [
    { name: 'Home', path: '/', icon: Home },
  ];

  if (currentPage && PAGE_TITLES[currentPage]) {
    crumbs.push({
      name: PAGE_TITLES[currentPage],
      path: createPageUrl(currentPage),
    });
  }

  // Add additional crumbs (e.g., specific document name)
  additionalCrumbs.forEach(crumb => {
    crumbs.push(crumb);
  });

  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-600 mb-6">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const Icon = crumb.icon;

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 mx-2 text-slate-400" />
            )}
            {isLast ? (
              <span className="font-medium text-slate-800 flex items-center gap-1">
                {Icon && <Icon className="w-4 h-4" />}
                {crumb.name}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                {Icon && <Icon className="w-4 h-4" />}
                {crumb.name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
