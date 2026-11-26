import { Link } from 'react-router-dom';
import '../../styles/home-findings.css';

// Real result of the bundled Online Retail example with the default settings (K = 4, original scaling).
const EXAMPLE_GROUPS = [
  { name: 'Top spenders', color: '#66dccb', customers: 13, customerShare: 0.3, salesShare: 18.6, recency: 2, orders: 63, spend: '117,210' },
  { name: 'High-value regulars', color: '#e7cca0', customers: 204, customerShare: 4.7, salesShare: 29.1, recency: 5, orders: 19, spend: '7,990' },
  { name: 'Core customers', color: '#99bcef', customers: 3054, customerShare: 70.4, salesShare: 46.5, recency: 32, orders: 3, spend: '826' },
  { name: 'Lapsed one-time buyers', color: '#f19781', customers: 1067, customerShare: 24.6, salesShare: 5.7, recency: 243, orders: 1, spend: '310' },
];

function ShareBar({ label, field }: { label: string; field: 'customerShare' | 'salesShare' }) {
  return <div className="share-row">
    <span className="share-label">{label}</span>
    <div className="share-bar" role="img" aria-label={`${label}: ${EXAMPLE_GROUPS.map(g => `${g.name} ${g[field]}%`).join(', ')}`}>
      {EXAMPLE_GROUPS.map(group => <span key={group.name} style={{ flexGrow: Math.max(group[field], .6), background: group.color }} />)}
    </div>
  </div>;
}

function FindingsSection() {
  return <section className="home-findings" aria-labelledby="findings-heading">
    <div className="findings-intro">
      <h2 id="findings-heading">13 customers.<br />19% of all sales.</h2>
      <p>That is one of four groups Segmentra found in 541,909 real transactions from a UK online shop. Customers and sales are split very differently:</p>
    </div>
    <div className="findings-chart">
      <ShareBar label="Customers" field="customerShare" />
      <ShareBar label="Sales" field="salesShare" />
      <ul className="findings-groups">{EXAMPLE_GROUPS.map(group => <li key={group.name} style={{ ['--group' as string]: group.color }}>
        <h3>{group.name}</h3>
        <p className="group-share"><strong>{group.customers.toLocaleString('en-US')}</strong> customers · {group.salesShare}% of sales</p>
        <p>Last bought {group.recency} days before the data ends, {group.orders} {group.orders === 1 ? 'order' : 'orders'}, {group.spend} spent</p>
      </li>)}</ul>
      <p className="findings-note">Typical (median) customer in each group, default settings.</p>
    </div>
  </section>;
}

const STEPS = [
  ['Upload a sales file', 'A CSV or Excel export with customer, invoice, date, quantity and price. Or use the example.'],
  ['Choose how many groups', 'Pick a number, or let Segmentra recommend one.'],
  ['Explore and export', 'Compare the groups, look up any customer, download the results.'],
];

function StepsSection() {
  return <section className="home-steps" aria-labelledby="steps-heading">
    <h2 id="steps-heading">Three steps, about ten seconds.</h2>
    <ol>{STEPS.map(([title, text], i) => <li key={title}><span aria-hidden="true">{i + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
    <Link to="/methodology" className="steps-link">See how the grouping works</Link>
  </section>;
}

function ClosingSection() {
  return <section className="closing">
    <div className="closing-orbit" aria-hidden="true" />
    <h2>See your own customers this way.</h2>
    <Link className="primary" to="/analyze">Start Analyzing <span aria-hidden="true">↗</span></Link>
  </section>;
}

export function FuturisticSections() {
  return <><FindingsSection /><StepsSection /><ClosingSection /></>;
}
