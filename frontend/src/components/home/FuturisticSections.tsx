import { Link } from 'react-router-dom';
import { decorativePoints } from './intelligence-data';

function DecorativeParticles({ className, width }: { className: string; width: number }) {
  return <div className={className} aria-hidden="true">
    {decorativePoints(width).map((style, index) => <i key={index} style={style} />)}
  </div>;
}

function ProcessSection() {
  return <section className="process" aria-labelledby="process-heading">
    <div className="section-heading">
      <p className="eyebrow">A clear path to discovery</p>
      <h2 id="process-heading">Complex data.<br />Clearer possibilities.</h2>
      <p>Upload. Group. Explore.</p>
    </div>
    <ol className="process-track">
      <li>
        <span className="step">01</span>
        <div className="file-object" aria-hidden="true"><i /><i /><i /><b>CSV / XLSX</b></div>
        <h3>Upload Your Data</h3>
        <p>Upload CSV or XLSX, or try the example.</p>
      </li>
      <li>
        <span className="step">02</span>
        <DecorativeParticles className="cluster-object" width={100} />
        <h3>Run Segmentation</h3>
        <p>Group customers by purchase patterns.</p>
      </li>
      <li>
        <span className="step">03</span>
        <div className="insight-object" aria-hidden="true"><i /><i /><i /><i /></div>
        <h3>Explore Insights</h3>
        <p>Compare groups and export results.</p>
      </li>
    </ol>
  </section>;
}

function AnalyticsSection() {
  return <section className="analytics" id="analytics" aria-labelledby="analytics-heading">
    <div className="section-heading">
      <p className="eyebrow">Powerful analytics</p>
      <h2 id="analytics-heading">Every connection.<br />A deeper understanding.</h2>
      <p>See what makes each group distinct.</p>
    </div>
    <div className="analytics-composition">
      <article className="rfm">
        <div>
          <span className="feature-note">Understand the individual</span>
          <h3>RFM Analysis</h3>
          <p>How recently, how often, and how much customers buy.</p>
        </div>
        <div className="rfm-visual" aria-hidden="true"><span>R<i /></span><span>F<i /></span><span>M<i /></span></div>
      </article>
      <article className="kmeans">
        <span className="feature-note">Discover the collective</span>
        <h3>KMeans Clustering</h3>
        <p>Find customers with similar purchase patterns.</p>
        <DecorativeParticles className="kmeans-visual" width={220} />
      </article>
      <div className="feature-row">
        <article><span className="feature-symbol" aria-hidden="true">▥</span><h3>Segment Profiles</h3><p>Compare each group’s purchase behavior.</p></article>
        <article><span className="feature-symbol axes" aria-hidden="true">⤢</span><h3>PCA Visualization</h3><p>Explore customer patterns in two dimensions.</p></article>
        <article><span className="feature-symbol" aria-hidden="true">≡</span><h3>Customer Explorer</h3><p>Search, filter, and inspect customer records.</p></article>
      </div>
    </div>
  </section>;
}

function ClosingSection() {
  return <section className="closing">
    <div className="closing-orbit" aria-hidden="true" />
    <p className="eyebrow">Your next discovery starts here</p>
    <h2>Your customers have a story.<br /> Find the patterns that tell it.</h2>
    <Link className="primary" to="/analyze">Start Analyzing <span aria-hidden="true">↗</span></Link>
  </section>;
}

export function FuturisticSections() {
  return <><ProcessSection /><AnalyticsSection /><ClosingSection /></>;
}
