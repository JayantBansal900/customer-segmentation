import { Link } from 'react-router-dom';

export function HomeSections() {
  return <>
    <section className="home-workflow" aria-labelledby="workflow-heading">
      <div className="home-section-title"><p className="home-kicker">How it works</p><h2 id="workflow-heading">From transactions<br /> to a clearer picture.</h2></div>
      <ol className="journey-track">
        <li><span className="journey-number">01</span><div className="journey-art upload-art" aria-hidden="true"><span /><span /><span /><b>CSV / XLSX</b></div><h3>Upload data</h3><p>Bring your transactions, or explore the built-in retail example.</p></li>
        <li><span className="journey-number">02</span><div className="journey-art grouping-art" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} />)}</div><h3>Discover segments</h3><p>Find groups with similar purchase activity through RFM and KMeans.</p></li>
        <li><span className="journey-number">03</span><div className="journey-art insight-art" aria-hidden="true"><i /><i /><i /><i /></div><h3>Explore insights</h3><p>Compare profiles, inspect model quality, and take your results with you.</p></li>
      </ol>
    </section>
    <section className="home-platform" aria-labelledby="platform-heading">
      <div className="platform-intro"><p className="home-kicker">Explore the platform</p><h2 id="platform-heading">A new perspective<br /> on every purchase.</h2><p>The details behind the groups, without losing the bigger picture.</p><Link to="/methodology" className="home-text-link">See how the analysis works <span aria-hidden="true">↗</span></Link></div>
      <div className="capability-map">
        <article className="capability-rfm"><span className="capability-tag">The foundation</span><h3>RFM</h3><p>Recency. Frequency. Monetary value.<br />Three ways to understand purchasing activity.</p><div className="rfm-rails" aria-hidden="true"><span>R<i /></span><span>F<i /></span><span>M<i /></span></div></article>
        <article className="capability-clusters"><span className="capability-tag">The connections</span><h3>KMeans & segment profiles</h3><p>Group similar customers. Explore the purchase patterns that define each segment.</p><div className="mini-segments" aria-hidden="true"><span /><span /><span /><span /></div></article>
        <article className="capability-perspective"><div><span className="capability-tag">The perspective</span><h3>PCA & business insights</h3><p>See a 2D view of customer relationships, compare segment contributions, and review clustering quality.</p></div><Link to="/insights" aria-label="Explore Insights" className="capability-arrow">↗</Link></article>
      </div>
    </section>
    <section className="home-closing" aria-labelledby="closing-heading"><div><p className="home-kicker">Your data. A clearer direction.</p><h2 id="closing-heading">See what brings<br /> your customers together.</h2></div><Link className="home-cta closing-action" to="/analyze">Start Analyzing <span aria-hidden="true">↗</span></Link></section>
  </>;
}
