import { Link } from 'react-router-dom';
import { TechnicalDetails } from '../components/ui/TechnicalDetails';
import '../styles/story-pages.css';

const steps = [
  ['Upload Data', 'CSV, Excel or the example.'],
  ['Clean Transactions', 'Drop returns and duplicates.'],
  ['Calculate RFM', 'Three numbers per customer.'],
  ['Prepare Features', 'Put them on one scale.'],
  ['Cluster Customers', 'KMeans finds the groups.'],
  ['Explore Results', 'Compare, search, export.'],
];

// A small made-up customer, so every number on this page can be checked by hand.
const LEDGER = [
  { invoice: '1001', date: '2 Mar', qty: 6, price: '2.50', total: '15.00' },
  { invoice: '1001', date: '2 Mar', qty: 2, price: '12.00', total: '24.00' },
  { invoice: 'C1002', date: '9 Mar', qty: -2, price: '12.00', total: '−24.00', removed: 'Return' },
  { invoice: '1040', date: '18 May', qty: 10, price: '1.20', total: '12.00' },
  { invoice: '1088', date: '27 Jun', qty: 4, price: '7.50', total: '30.00' },
];

export function Methodology() {
  return <article className="product-page story-page methodology-page">
    <header className="method-hero">
      <h1>How Segmentra groups your customers</h1>
      <p className="story-lead">Six steps turn a list of sales into customer groups. Here is the whole idea, followed through one customer.</p>
    </header>

    <ol className="step-rail" aria-label="Implemented segmentation pipeline">{steps.map(([title, description], i) => <li key={title}><span className="step-number" aria-hidden="true">{i + 1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>

    <section className="trace" aria-labelledby="trace-title">
      <h2 id="trace-title">Follow one customer</h2>
      <p className="trace-intro">Customer 1042 bought from a shop whose data ends on 30 June.</p>
      <div className="trace-flow">
        <div className="trace-stage">
          <h3>Their transactions</h3>
          <div className="table-scroll"><table className="ledger"><caption className="sr-only">Transactions for example customer 1042</caption><thead><tr><th scope="col">Invoice</th><th scope="col">Date</th><th scope="col">Qty × price</th><th scope="col">Value</th></tr></thead>
            <tbody>{LEDGER.map((row, i) => <tr key={i} className={row.removed ? 'ledger-removed' : ''}><th scope="row">{row.invoice}</th><td>{row.date}</td><td>{row.qty} × {row.price}</td><td>{row.total}{row.removed && <span className="removed-tag">{row.removed}, removed</span>}</td></tr>)}</tbody></table></div>
        </div>
        <span className="trace-arrow" aria-hidden="true" />
        <div className="trace-stage">
          <h3>Their RFM profile</h3>
          <dl className="rfm-trio">
            <div className="rfm-r"><dt>Recency</dt><dd>4 <small>days</small></dd><p>Last bought 27 June. The clock starts on 1 July, a day after the data ends.</p></div>
            <div className="rfm-f"><dt>Frequency</dt><dd>3 <small>orders</small></dd><p>Invoices 1001, 1040 and 1088. Two lines on one invoice count once.</p></div>
            <div className="rfm-m"><dt>Monetary</dt><dd>81.00</dd><p>15 + 24 + 12 + 30. The return is not subtracted.</p></div>
          </dl>
        </div>
        <span className="trace-arrow" aria-hidden="true" />
        <div className="trace-stage trace-result">
          <h3>Their group</h3>
          <p className="group-badge"><span aria-hidden="true" />Recent, frequent, low spend</p>
          <p>KMeans compares these three numbers with every other customer and puts 1042 with the customers closest to them.</p>
        </div>
      </div>
    </section>

    <section className="story-row" aria-labelledby="k-title">
      <h2 id="k-title">How many groups?</h2>
      <div className="story-copy">
        <p>You pick K, the number of groups. Segmentra also tries every K in your range and recommends the one whose groups are most clearly separated. Your choice is never overridden.</p>
        <p>Pick <strong>log-transformed scaling</strong> when a few big spenders would otherwise get a group of their own.</p>
      </div>
    </section>

    <section className="story-row" aria-labelledby="limits-title">
      <h2 id="limits-title">Keep in mind</h2>
      <ul className="plain-list">
        <li>Groups describe past purchases. They don't predict churn or future revenue.</li>
        <li>Spending counts purchases only, with no currency assumed.</li>
        <li>Your data lives in the browser tab and is gone when you reload.</li>
      </ul>
    </section>

    <section className="story-row details-row" aria-labelledby="details-title">
      <h2 id="details-title">Exact rules</h2>
      <div>
        <TechnicalDetails summary="Data requirements and cleaning rules"><p>A UTF-8 CSV or the first sheet of an XLSX file must include CustomerID, InvoiceNo, InvoiceDate, Quantity and UnitPrice. Invalid values are rejected, not guessed. Non-ISO CSV dates need an explicit date format; timestamps are treated as UTC.</p><p>Rows are removed in this order: missing customer ID, invoice starting with “C” (cancellation), quantity ≤ 0, price ≤ 0, exact duplicate row. Each row is counted once, at the first rule it fails.</p></TechnicalDetails>
        <TechnicalDetails summary="RFM formulas and reference date"><p>The reference timestamp is one day after the latest retained transaction in the dataset.</p><code className="formula">(reference timestamp − latest purchase).days</code><code className="formula">count distinct InvoiceNo per CustomerID</code><code className="formula">sum(Quantity × UnitPrice) per CustomerID</code></TechnicalDetails>
        <TechnicalDetails summary="KMeans and candidate evaluation"><p>Features are scaled with StandardScaler, optionally after log1p. KMeans uses <code>k-means++ · random_state 42 · n_init 10</code>, so the same input always gives the same groups.</p><p>Silhouette is computed on at most 1,000 customers sampled with seed 42, using the same subset for every candidate. Ties go to the smaller K. Inertia usually falls as K grows, so it is shown but not used to recommend K.</p><p>PCA squeezes the three scaled features into two dimensions for the scatter plot only; clustering uses the full features.</p></TechnicalDetails>
        <TechnicalDetails summary="Results, privacy and exports"><p>CSV exports prefix formula-like text with [text] so spreadsheets don't run it; results on screen stay unchanged. Import IDs as text to keep leading zeros. Stopping the wait in the browser does not stop a running server analysis.</p><p>Customer IDs and purchase history can be sensitive; pseudonymous IDs do not guarantee anonymity. Only analyze data you are allowed to use.</p></TechnicalDetails>
      </div>
    </section>

    <section className="story-cta"><h2>Try it on your own data.</h2><Link className="button" to="/analyze">Start Analyzing</Link></section>
  </article>;
}
