import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { getBreadcrumbSchema } from '../../seo/schemaGenerators';

export default function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;

  const breadcrumbSchema = getBreadcrumbSchema(items);

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      {/* Script injected safely */}
      <script
        type="application/ld+json"
        data-seo="true"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <ol className="flex items-center space-x-2 text-xs text-slate-400 flex-wrap">
        <li>
          <Link to="/" className="hover:text-cyan-400 flex items-center space-x-1 transition-colors" aria-label="Go to Homepage">
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={index}>
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              <li>
                {isLast ? (
                  <span className="font-semibold text-slate-200" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <Link to={item.item} className="hover:text-cyan-400 transition-colors">
                    {item.name}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
