import { Link } from 'react-router-dom';

export function NotFound() {
  return <section className="panel empty-state"><p className="eyebrow">404</p><h1>Page not found</h1><p>This address does not match a Segmentra page.</p><Link className="button" to="/">Return home</Link></section>;
}
