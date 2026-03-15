'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from '@/i18n/routing';
import { useReportWebVitals } from 'next/web-vitals';
import {
  consumeRouteMetric,
  markRouteFromAnchor,
  reportClientMetric
} from '@/lib/perf/client-metrics';

export function ClientPerformanceTracker() {
  const pathname = usePathname();
  const initialNavigationSent = useRef(false);

  useReportWebVitals((metric) => {
    reportClientMetric({
      name: `web_vital_${metric.name.toLowerCase()}`,
      value: Number(metric.value.toFixed(2)),
      unit: metric.name === 'CLS' ? 'score' : 'ms',
      tags: {
        id: metric.id,
        path: window.location.pathname
      }
    });
  });

  useEffect(() => {
    const routeMetric = consumeRouteMetric(pathname);
    if (routeMetric) {
      reportClientMetric({
        name: 'route_change_duration',
        value: Number(routeMetric.duration.toFixed(2)),
        unit: 'ms',
        tags: {
          from: routeMetric.fromPath,
          to: routeMetric.toPath
        }
      });
    }
  }, [pathname]);

  useEffect(() => {
    if (initialNavigationSent.current) return;
    initialNavigationSent.current = true;

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return;

    reportClientMetric({
      name: 'initial_navigation_duration',
      value: Number(nav.duration.toFixed(2)),
      unit: 'ms',
      tags: {
        type: nav.type,
        path: window.location.pathname
      }
    });
  }, []);

  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      markRouteFromAnchor(href);
    };

    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, []);

  return null;
}
