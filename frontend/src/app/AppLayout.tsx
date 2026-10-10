import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useHealth } from '../hooks/useHealth';
import { useAnalysis } from '../context/analysis-state';
import '../styles/product.css';
import { BrandMark } from '../components/branding/BrandMark';

const LINKS = [['/', 'Home'], ['/analyze', 'Analyze'], ['/segments', 'Segments'], ['/insights', 'Insights'], ['/methodology', 'Methodology'], ['/about', 'About']] as const;
export function AppLayout() {
  const { status, retry } = useHealth();
  const analysis = useAnalysis();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  const isHome = location.pathname === '/';
  const isAnalyze = location.pathname === '/analyze';
  const isProduct = ['/segments', '/insights', '/methodology', '/about'].includes(location.pathname);
  useEffect(() => {
    const title = LINKS.find(([path]) => path === location.pathname)?.[1] ?? 'Page not found';
    document.title = `Segmentra — ${title}`;
    setMenuOpen(false);
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return <div className={`app-shell${isHome ? ' home-shell' : isAnalyze ? ' analyze-shell' : isProduct ? ' product-shell' : ''}`}><a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="header-inner"><Link className="brand" to="/" aria-label="Segmentra home"><BrandMark /><span>Segmentra</span></Link>
      <button className="navigation-toggle menu-button" type="button" aria-controls="main-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)} onKeyDown={event => { if (event.key === 'Escape') setMenuOpen(false); }}>{menuOpen ? 'Close menu' : 'Menu'}<span aria-hidden="true">{menuOpen ? '−' : '+'}</span></button>
      <nav id="main-navigation" className={menuOpen ? 'navigation-open' : ''} aria-label="Main navigation" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); document.querySelector<HTMLButtonElement>('.navigation-toggle')?.focus(); } }}>
        {LINKS.map(([path, label]) => <NavLink key={path} to={path} end={path === '/'}>{label}</NavLink>)}
      </nav><span className="header-project-note prototype-badge"><i aria-hidden="true" />Customer intelligence</span></div></header>
    {(!isHome || analysis.status === 'running' || analysis.result) && <div className="workspace-status">{analysis.status === 'running' ? 'Analysis request running. You can navigate while waiting.' : analysis.result ? `Current result: ${analysis.result.metadata.dataset_name} · selected K=${analysis.result.metadata.selected_k}` : 'Choose data and run analysis to explore real results.'}</div>}
    <main id="main" tabIndex={-1} ref={main} className="main-content"><Outlet /></main>
    <footer className="site-footer">{isHome ? <Link className="brand" to="/" aria-label="Segmentra home"><BrandMark /><span>Segmentra</span></Link> : <div className="footer-identity"><BrandMark /><p>Segmentra <span>Intelligence, in a new dimension.</span></p></div>}<p className="footer-context">{isHome ? 'Intelligence, in a new dimension.' : <>Historical purchase patterns. Descriptive segments.<br />A personal customer segmentation project.</>}</p>
      <div className={`service-status service-${status}`}><span className="service-indicator" aria-hidden="true" /><span role="status">{status === 'online' ? 'Analysis service available' : status === 'checking' ? 'Checking service…' : 'Analysis service unavailable'}</span>{status === 'offline' && <button onClick={retry}>Check again</button>}</div></footer>
  </div>;
}
