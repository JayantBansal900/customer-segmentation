import { Link } from 'react-router-dom';
import { IntelligenceScene } from '../components/home/IntelligenceScene';
import { FuturisticSections } from '../components/home/FuturisticSections';

function HeroCopy() {
  return <div className="hero-copy">
    <p className="eyebrow"><span aria-hidden="true" />Intelligence, in a new dimension</p>
    <h1 id="headline">Discover the patterns behind your <em>customers.</em></h1>
    <p className="hero-description">Turn transactions into clear customer groups.</p>
    <div className="hero-actions">
      <Link className="primary" to="/analyze">Start Analyzing <span aria-hidden="true">↗</span></Link>
      <Link className="secondary" to="/methodology">Explore Methodology <span aria-hidden="true">→</span></Link>
    </div>
    <div className="hero-note">
      <span>From individual transactions</span><span className="note-line" /><span>to meaningful connections</span>
    </div>
  </div>;
}

export function Home() {
  return <div className="futuristic-home">
    <section className="hero" aria-labelledby="headline">
      <div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" />
      <HeroCopy /><IntelligenceScene />
    </section>
    <FuturisticSections />
  </div>;
}
