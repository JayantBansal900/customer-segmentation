import { Link } from 'react-router-dom';
import '../styles/story-pages.css';

// Real figures from running the bundled Online Retail example with the default settings (K = 4).
const FUNNEL = [
  { value: '541,909', label: 'transaction lines in the file' },
  { value: '392,692', label: 'kept after removing returns, duplicates and rows without a customer' },
  { value: '4,338', label: 'customers, each with an RFM profile' },
  { value: '4', label: 'customer groups you can compare' },
];

const STACK = [
  { area: 'Interface', tools: ['React', 'TypeScript', 'Vite'], text: 'Six pages, charts drawn with SVG and Canvas, no chart library.' },
  { area: 'API', tools: ['FastAPI', 'Pydantic', 'Uvicorn'], text: 'Checks every upload, runs one analysis at a time and returns typed JSON.' },
  { area: 'Analysis', tools: ['pandas', 'scikit-learn', 'calamine'], text: 'Cleans transactions, builds RFM, runs KMeans and scores each K.' },
];

export function About() {
  return <article className="product-page story-page about-page">
    <section className="about-hero">
      <header>
        <h1>Making customer behavior understandable.</h1>
        <p className="story-lead">Most shops can tell you their total sales. Few can tell you which customers behave alike. Segmentra takes a plain sales export and sorts every customer into a group you can describe in one sentence.</p>
        <div className="story-actions"><Link className="button" to="/analyze">Start Analyzing</Link><Link className="button secondary" to="/methodology">Explore Methodology</Link></div>
      </header>
      <figure className="funnel" aria-labelledby="funnel-caption">
        <figcaption id="funnel-caption">The Online Retail example, from file to groups</figcaption>
        <ol>{FUNNEL.map((step, i) => <li key={step.value} style={{ ['--step' as string]: i }}><strong>{step.value}</strong><span>{step.label}</span></li>)}</ol>
        <p>Takes about 11 seconds.</p>
      </figure>
    </section>

    <section className="story-row" aria-labelledby="why-title">
      <h2 id="why-title">Why it exists</h2>
      <div className="story-copy">
        <p>Averages hide people. A store with a healthy average order can still be losing its best customers while one-time buyers pile up. Grouping customers by <em>when</em> they last bought, <em>how often</em> they buy and <em>how much</em> they spend makes those patterns visible.</p>
        <p>Segmentra is a personal project that does this end to end: upload a file, pick the number of groups, then explore and export the result.</p>
      </div>
    </section>

    <section className="story-row" aria-labelledby="stack-title">
      <h2 id="stack-title">How it's built</h2>
      <ul className="stack-grid">{STACK.map(part => <li key={part.area}><h3>{part.area}</h3><p className="stack-tools">{part.tools.map(tool => <span key={tool}>{tool}</span>)}</p><p>{part.text}</p></li>)}</ul>
    </section>

    <section className="story-row" aria-labelledby="maker-title">
      <h2 id="maker-title">Who made it</h2>
      <div className="maker">
        <p className="maker-name">Jayant Bansal</p>
        <p>Designed and built the interface, the API and the analysis engine. The code, tests and documentation are on GitHub.</p>
        <p className="maker-links"><a className="text-link" href="https://github.com/JayantBansal900/customer-segmentation" target="_blank" rel="noreferrer">View the source code</a><a className="text-link" href="https://github.com/JayantBansal900" target="_blank" rel="noreferrer">GitHub profile</a></p>
      </div>
    </section>

    <p className="story-footnote">Groups describe past purchases; they don't predict the future. The example data is the UCI Online Retail dataset (Chen, 2015), licensed CC BY 4.0.</p>
  </article>;
}
